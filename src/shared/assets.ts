export function assetUrl(path: string) {
  if (/^(https?:|data:|blob:)/.test(path)) {
    return path;
  }
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalized}`;
}
