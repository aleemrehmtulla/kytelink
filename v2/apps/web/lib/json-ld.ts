// Serialize a JSON-LD object for embedding inside a <script type="application/ld+json">
// tag. JSON.stringify alone does NOT escape `<`, so a value containing
// `</script>` closes the tag early and any following markup executes (stored XSS).
// Unicode-escaping `<`, `>`, `&`, and the JSON-invalid line separators (U+2028,
// U+2029) keeps the payload valid JSON (schema.org parsers still read it) while
// making tag breakout impossible. Built from escape sequences so no raw line
// terminator ever appears in this source.
const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [String.fromCharCode(0x2028)]: "\\u2028",
  [String.fromCharCode(0x2029)]: "\\u2029",
};

const UNSAFE = new RegExp("[<>&\\u2028\\u2029]", "g");

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE, (char) => ESCAPES[char] ?? char);
}
