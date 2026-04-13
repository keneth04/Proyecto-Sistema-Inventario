const LATENCY_BUCKETS_SECONDS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];

const createMetricKey = (parts) => parts.map((part) => String(part)).join('|');

const sanitizePath = (path) => {
  if (typeof path !== 'string' || path.length === 0) {
    return 'unknown';
  }

  return path.split('?')[0] || 'unknown';
};

const statusClassFromCode = (statusCode) => {
  const code = Number(statusCode);

  if (!Number.isInteger(code)) {
    return 'unknown';
  }

  return `${Math.floor(code / 100)}xx`;
};

const createMetricsStore = () => {
  const startedAt = Date.now();
  const requests = new Map();
  const errors = new Map();
  const durationCount = new Map();
  const durationSum = new Map();
  const durationBuckets = new Map();

  const observeRequest = ({ method, path, statusCode, durationMs }) => {
    const normalizedMethod = (method || 'UNKNOWN').toUpperCase();
    const normalizedPath = sanitizePath(path);
    const normalizedStatusCode = Number.isInteger(Number(statusCode))
      ? Number(statusCode)
      : 0;
    const durationSeconds = Math.max(Number(durationMs) / 1000, 0);

    const requestKey = createMetricKey([normalizedMethod, normalizedPath, normalizedStatusCode]);
    requests.set(requestKey, (requests.get(requestKey) || 0) + 1);

    if (normalizedStatusCode >= 400) {
      const errorKey = createMetricKey([
        normalizedMethod,
        normalizedPath,
        statusClassFromCode(normalizedStatusCode)
      ]);
      errors.set(errorKey, (errors.get(errorKey) || 0) + 1);
    }

    const latencyKey = createMetricKey([normalizedMethod, normalizedPath]);

    durationCount.set(latencyKey, (durationCount.get(latencyKey) || 0) + 1);
    durationSum.set(latencyKey, (durationSum.get(latencyKey) || 0) + durationSeconds);

    for (const bucket of LATENCY_BUCKETS_SECONDS) {
      if (durationSeconds <= bucket) {
        const bucketKey = createMetricKey([latencyKey, bucket]);
        durationBuckets.set(bucketKey, (durationBuckets.get(bucketKey) || 0) + 1);
      }
    }

    const infBucketKey = createMetricKey([latencyKey, '+Inf']);
    durationBuckets.set(infBucketKey, (durationBuckets.get(infBucketKey) || 0) + 1);
  };

  const formatLabels = (labels) => {
    return Object.entries(labels)
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
      .join(',');
  };

  const renderPrometheus = () => {
    const lines = [
      '# HELP process_uptime_seconds Process uptime in seconds.',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
      '# HELP http_requests_total Total HTTP requests processed.',
      '# TYPE http_requests_total counter'
    ];

    for (const [key, value] of requests.entries()) {
      const [method, path, status] = key.split('|');
      lines.push(`http_requests_total{${formatLabels({ method, path, status })}} ${value}`);
    }

    lines.push('# HELP http_request_errors_total Total HTTP requests with 4xx/5xx status code.');
    lines.push('# TYPE http_request_errors_total counter');

    for (const [key, value] of errors.entries()) {
      const [method, path, statusClass] = key.split('|');
      lines.push(
        `http_request_errors_total{${formatLabels({ method, path, status_class: statusClass })}} ${value}`
      );
    }

    lines.push('# HELP http_request_duration_seconds HTTP latency in seconds.');
    lines.push('# TYPE http_request_duration_seconds histogram');

    for (const [latencyKey, count] of durationCount.entries()) {
      const [method, path] = latencyKey.split('|');

      for (const bucket of LATENCY_BUCKETS_SECONDS) {
        const bucketKey = createMetricKey([latencyKey, bucket]);
        const bucketCount = durationBuckets.get(bucketKey) || 0;
        lines.push(
          `http_request_duration_seconds_bucket{${formatLabels({ method, path, le: bucket })}} ${bucketCount}`
        );
      }

      const infCount = durationBuckets.get(createMetricKey([latencyKey, '+Inf'])) || 0;
      lines.push(
        `http_request_duration_seconds_bucket{${formatLabels({ method, path, le: '+Inf' })}} ${infCount}`
      );
      lines.push(
        `http_request_duration_seconds_sum{${formatLabels({ method, path })}} ${(durationSum.get(latencyKey) || 0).toFixed(6)}`
      );
      lines.push(`http_request_duration_seconds_count{${formatLabels({ method, path })}} ${count}`);
    }

    return `${lines.join('\n')}\n`;
  };

  return {
    observeRequest,
    renderPrometheus,
    LATENCY_BUCKETS_SECONDS
  };
};

const MetricsStore = createMetricsStore();

module.exports = {
  MetricsStore,
  createMetricsStore,
  sanitizePath,
  statusClassFromCode
};