import DOMPurify from "isomorphic-dompurify";

export const sanitizePlainText = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim();
};
