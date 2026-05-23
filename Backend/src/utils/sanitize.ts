const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_STYLE_REGEX = /<(script|style)[\s\S]*?<\/\1>/gi;
const NULL_BYTE_REGEX = /\u0000/g;
const EVENT_HANDLER_REGEX = /\son\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:/gi;

export const sanitizePlainText = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(SCRIPT_STYLE_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(EVENT_HANDLER_REGEX, "")
    .replace(JAVASCRIPT_URI_REGEX, "")
    .replace(NULL_BYTE_REGEX, "")
    .trim();
};
