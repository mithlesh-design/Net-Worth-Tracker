import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { authMethods } from "./authStatus.mjs";

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

const providers = [];
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
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id || token.sub;
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
