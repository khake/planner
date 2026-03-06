import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "h1",
  "h2",
  "h3",
] as const;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
};

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function convertPlainTextToHtml(value: string) {
  const escapedText = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  if (!escapedText) {
    return "";
  }

  return escapedText
    .split(/\n{2,}/)
    .map((paragraph: string) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function sanitizeRichTextHtml(value: string | null | undefined) {
  const rawValue = value?.trim() ?? "";
  if (!rawValue) {
    return "";
  }

  const html = looksLikeHtml(rawValue) ? rawValue : convertPlainTextToHtml(rawValue);
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export function isRichTextEmpty(value: string | null | undefined) {
  const sanitized = sanitizeRichTextHtml(value);
  const textOnly = sanitizeHtml(sanitized, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00A0/g, " ")
    .trim();

  return textOnly.length === 0;
}
