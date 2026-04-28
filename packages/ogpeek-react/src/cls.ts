// Tiny class-name joiner so component roots can drop the
// `${className ? `... ${className}` : "..."}` ternary boilerplate.
// Drops falsy parts (undefined / "" / null / false) and joins the rest
// with a single space. Intentionally not exported from the package — it's
// only meant for internal component composition.
export function cls(...parts: Array<string | false | null | undefined>): string {
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    out = out ? `${out} ${part}` : part;
  }
  return out;
}
