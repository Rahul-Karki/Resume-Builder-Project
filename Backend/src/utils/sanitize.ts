const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_STYLE_REGEX = /<(script|style)[\s\S]*?<\/\1>/gi;
const NULL_BYTE_REGEX = /\u0000/g;

export const sanitizePlainText = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(SCRIPT_STYLE_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(NULL_BYTE_REGEX, "")
    .trim();
};
