// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
  
  if (status >= 500) {
    console.error('[error]', err);
  } else if (err.code !== 'AUTH_REFRESH_MISSING') {
    console.warn(`[warn] ${status}: ${err.message}`);
  }


  // Mongoose's CastError/ValidationError carry driver-internal detail in their
  // .message (model names, schema paths, raw values) — these are client
  // mistakes (a malformed ID, an invalid enum value), not server failures, so
  // they're normalized to a clean 400 with a safe, controlled message
  // regardless of NODE_ENV. Previously these fell through to the generic
  // 500 handler below, which — whenever NODE_ENV wasn't explicitly set to
  // "production" (the default in some deploys/staging environments) — echoed
  // the raw Mongoose error text straight back to the client.
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `Invalid value for "${err.path}".` },
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid.' },
    });
  }

  const code = err.code || 'INTERNAL_ERROR';
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong on our end. Please try again.'
      : err.message || 'Unexpected error.';
  res.status(status).json({ error: { code, message } });
}
