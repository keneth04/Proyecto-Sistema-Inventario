const { MetricsStore } = require('../observability/metrics');

module.exports.ObservabilityMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    MetricsStore.observeRequest({
      method: req.method,
      path: req.baseUrl ? `${req.baseUrl}${req.path}` : req.path,
      statusCode: res.statusCode,
      durationMs
    });
  });

  next();
};