export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, cookiePart) => {
    const [rawKey, ...rawValue] = cookiePart.trim().split("=");
    if (!rawKey) return cookies;

    cookies[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join("=") || "");
    return cookies;
  }, {});
}
