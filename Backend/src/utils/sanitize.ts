const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_STYLE_REGEX = /<(script|style)[\s\S]*?<\/\1>/gi;
const NULL_BYTE_REGEX = /\u0000/g;
const EVENT_HANDLER_REGEX = /\son\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:/gi;
const ENCODED_XSS_REGEX = /(&#?\w+;)|((\\u|\\x)[0-9a-fA-F]{2,4})/gi;
const DATA_URI_DANGEROUS = /data\s*:\s*(text\/html|application\/xml|image\/svg[\s+]*xml)/gi;

export const sanitizePlainText = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(SCRIPT_STYLE_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(EVENT_HANDLER_REGEX, "")
    .replace(JAVASCRIPT_URI_REGEX, "")
    .replace(ENCODED_XSS_REGEX, "")
    .replace(DATA_URI_DANGEROUS, "")
    .replace(NULL_BYTE_REGEX, "")
    .trim();
};
