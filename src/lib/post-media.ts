export type PostAttachment = {
  url: string;
  host: string;
  kind: "IMAGE" | "VIDEO" | "LINK";
};

const URL_PATTERN = /https:\/\/[^\s<>()]+/i;
const TRAILING_PUNCTUATION = /[.,!?;:'"\]}]+$/;
const IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i;
const VIDEO_HOSTS = new Set([
  "youtu.be",
  "youtube.com",
  "www.youtube.com",
  "vimeo.com",
  "www.vimeo.com",
]);

export function extractPostAttachment(body: string): PostAttachment | null {
  const match = body.match(URL_PATTERN);
  if (!match) return null;

  const candidate = match[0].replace(TRAILING_PUNCTUATION, "");

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;

    let kind: PostAttachment["kind"] = "LINK";
    if (IMAGE_EXTENSIONS.test(`${parsed.pathname}${parsed.search}${parsed.hash}`)) {
      kind = "IMAGE";
    } else if (VIDEO_HOSTS.has(parsed.hostname.toLowerCase())) {
      kind = "VIDEO";
    }

    return {
      url: parsed.toString(),
      host: parsed.hostname.replace(/^www\./, ""),
      kind,
    };
  } catch {
    return null;
  }
}
