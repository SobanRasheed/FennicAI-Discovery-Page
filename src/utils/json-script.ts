/**
 * JSON serialization for inline <script> embedding.
 *
 * JSON.stringify does not escape "<", so a value containing a closing
 * script tag would terminate the surrounding script tag early and inject
 * live markup (a stored-XSS vector for any DB-backed string such as
 * article titles). Escaping "<", ">" and the JS line separators keeps the
 * payload inert inside both classic scripts and application/json blocks
 * while remaining valid JSON for JSON.parse consumers.
 */
export function jsonForScript(value: unknown): string {
  // Replacement strings are built from char codes so the source itself
  // contains no ambiguous backslash-u sequences.
  const bs = String.fromCharCode(92); // backslash
  return JSON.stringify(value)
    .replace(/</g, bs + 'u003c')
    .replace(/>/g, bs + 'u003e')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), bs + 'u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), bs + 'u2029');
}
