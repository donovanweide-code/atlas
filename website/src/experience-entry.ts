export const canonicalExperiencePath = "/ervaar";
export const personalExperiencePath = "/e";

export function normalizeExperiencePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function hasPersonalExperienceToken(hash: string): boolean {
  const raw = hash.replace(/^#(?:token=)?/, "").trim();
  return raw.length > 0 && !raw.startsWith("via=");
}

export function isCanonicalExperiencePath(pathname: string): boolean {
  return normalizeExperiencePath(pathname) === canonicalExperiencePath;
}

export function shouldRedirectMissingPersonalAccess(
  pathname: string,
  hash: string,
  status: number,
): boolean {
  return normalizeExperiencePath(pathname) === personalExperiencePath
    && !hasPersonalExperienceToken(hash)
    && (status === 401 || status === 404);
}
