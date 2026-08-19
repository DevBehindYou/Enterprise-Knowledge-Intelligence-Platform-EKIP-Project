/**
 * Recursively strips any object key that starts with "$" or contains "." from
 * req.body, req.query, and req.params — the two characters MongoDB/Mongoose
 * treat as query-operator syntax ($ne, $gt, $where, $regex, ...) or path
 * separators. Applied globally, before any route handler, so no individual
 * controller has to remember to do this — see docs/09-security-audit-report.docx
 * for the specific endpoints this was found to matter for.
 *
 * This is deliberately conservative: legitimate application data has no
 * business reason to contain a key starting with "$", so stripping it can't
 * break a real use case, only an attack payload.
 */
function sanitize(value) {
  if (Array.isArray(value)) {
    return value.map(sanitize).filter((v) => v !== undefined);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    let hadDangerousKey = false;
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        hadDangerousKey = true;
        continue; // drop the operator/path-injection key entirely
      }
      const sanitizedVal = sanitize(val);
      if (sanitizedVal !== undefined) clean[key] = sanitizedVal;
    }
    // A value that was PURELY an operator-injection payload (e.g. the client
    // sent `?tag[$exists]=false`, which Express/qs turns into `{ $exists: false }`)
    // collapses to `undefined` here, so the caller omits the field entirely —
    // rather than leaving behind `{}`, which is still a truthy object that could
    // pass an `if (value)` check upstream and get assigned into a live query.
    if (Object.keys(clean).length === 0 && hadDangerousKey) return undefined;
    return clean;
  }
  return value;
}

export function sanitizeInput(req, res, next) {
  if (req.body) req.body = sanitize(req.body) ?? {};
  if (req.query) req.query = sanitize(req.query) ?? {};
  if (req.params) req.params = sanitize(req.params) ?? {};
  next();
}
