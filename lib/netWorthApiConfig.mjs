/* Canonical names come first. The aliases keep existing local deployments
   working while they migrate their environment variable names. */
export function netWorthApiConfig(env = process.env) {
  return {
    baseUrl: String(env.NEXT_PUBLIC_NET_WORTH_API_BASE_URL || env.NET_WORTH_API_BASE_URL || "").trim(),
    apiKey: String(env.NET_WORTH_API_KEY || env.LEADS_OPEN_API_KEY || "").trim(),
  };
}

export function hasNetWorthApiConfig(env = process.env) {
  const { baseUrl, apiKey } = netWorthApiConfig(env);
  return Boolean(baseUrl && apiKey);
}
