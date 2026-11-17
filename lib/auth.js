import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { authMethods } from "./authStatus.mjs";
import { netWorthApiConfig } from "./netWorthApiConfig.mjs";

/* NextAuth, built from whatever this deployment has configured (see
   lib/authStatus.mjs and docs/AUTH-SETUP.md). Logging in and signing up are
   one step: the first Google sign-in or email link creates the account.

   With Supabase configured, the adapter keeps users and accounts in its
   `next_auth` schema, so a person has ONE user id however they sign in, and
   that id is what saved profiles are filed under. Google and the email link
   are linked by address: Google has verified it, and the link proves the
   inbox, so the same person never ends up with two accounts. */
const methods = authMethods();
const env = process.env;
const netWorthConfig = netWorthApiConfig(env);

const providers = [];
if (methods.netWorthOtp) {
  providers.push(CredentialsProvider({
    id: "net-worth-otp",
    name: "Net Worth email OTP",
    credentials: { email: {}, otp: {} },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.otp) return null;
      const response = await fetch(`${netWorthConfig.baseUrl.replace(/\/$/, "")}/api/net-worth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${netWorthConfig.apiKey}` },
        body: JSON.stringify({ email: credentials.email, otp: credentials.otp }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) return null;
      const user = result?.user ?? result?.data?.user ?? result?.data ?? result;
      const id = user?.user_id ?? result?.user_id;
      if (id == null) return null;
      return { id: String(id), email: user.email ?? credentials.email, name: user.full_name ?? null,
        loginType: user.login_type ?? "otp" };
    },
  }));
}
if (methods.google) {
  providers.push(GoogleProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: methods.supabase,
  }));
}
if (methods.email) {
  const port = Number(env.EMAIL_SERVER_PORT) || 587;
  providers.push(EmailProvider({
    server: {
      host: env.EMAIL_SERVER_HOST,
      port,
      /* 465 is TLS from the first byte; 587 upgrades with STARTTLS. The mail
         library does not infer this from the port. */
      secure: port === 465,
      auth: env.EMAIL_SERVER_USER
        ? { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD }
        : undefined,
    },
    from: env.EMAIL_FROM,
  }));
}

export const authOptions = {
  providers,
  adapter: methods.supabase
    ? SupabaseAdapter({ url: env.NEXT_PUBLIC_SUPABASE_URL, secret: env.SUPABASE_SERVICE_ROLE_KEY })
    : undefined,
  /* JWT sessions even with the adapter: the session is read on every page
     load and API call, and a signed cookie answers that without a database
     round trip. The adapter is still what stores users and email tokens. */
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /* `user` is present only on sign-in: the adapter's user (its UUID) when
       Supabase is configured, otherwise the provider's profile, whose id for
       Google is the same `sub` this app has always used. */
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
        if (user.loginType) {
          token.loginType = user.loginType;
          token.netWorthId = user.id;
        }
      }
      // The NextAuth Google credential is verified by the Net Worth API, which
      // supplies the backend user id used for subsequent data operations.
      if (methods.netWorthOtp && !token.netWorthId && account?.provider === "google") {
        const idToken = account.id_token;
        const response = await fetch(`${netWorthConfig.baseUrl.replace(/\/$/, "")}/api/net-worth/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${netWorthConfig.apiKey}` },
          body: JSON.stringify({ id_token: idToken }), cache: "no-store",
        });
        const result = await response.json().catch(() => null);
        const backendUser = result?.user ?? result?.data?.user ?? result?.data ?? result;
        const backendId = backendUser?.user_id ?? result?.user_id;
        if (!response.ok || backendId == null) throw new Error("Net Worth Google sign-in failed");
        token.id = String(backendId);
        token.netWorthId = String(backendId);
        token.loginType = backendUser.login_type ?? "google";
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id || token.sub;
        session.user.login_type = token.loginType || "google";
        session.user.netWorthAuthenticated = Boolean(token.netWorthId);
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  secret: env.NEXTAUTH_SECRET,
};
