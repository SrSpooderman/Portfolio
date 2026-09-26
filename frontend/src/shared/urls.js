export const safe = (url) =>
  typeof url === "string" &&
  /^(https?:\/\/|mailto:|\/|#)/i.test(url) &&
  !url.startsWith("//")
    ? url
    : "#";
