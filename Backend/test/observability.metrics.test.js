const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMetricsStore,
  sanitizePath,
  statusClassFromCode
} = require('../src/observability/metrics');

test('sanitizePath elimina query params', () => {
  assert.equal(sanitizePath('/health/ready?full=true'), '/health/ready');
});

test('statusClassFromCode agrupa por familia HTTP', () => {
  assert.equal(statusClassFromCode(503), '5xx');
  assert.equal(statusClassFromCode(404), '4xx');
});

test('createMetricsStore acumula requests, errores y latencia', () => {
  const store = createMetricsStore();

  store.observeRequest({
    method: 'GET',
    path: '/users',
    statusCode: 200,
    durationMs: 120
  });

  store.observeRequest({
    method: 'POST',
    path: '/users',
    statusCode: 500,
    durationMs: 1800
  });

  const output = store.renderPrometheus();

  assert.match(output, /http_requests_total\{method="GET",path="\/users",status="200"\} 1/);
  assert.match(output, /http_requests_total\{method="POST",path="\/users",status="500"\} 1/);
  assert.match(output, /http_request_errors_total\{method="POST",path="\/users",status_class="5xx"\} 1/);
  assert.match(output, /http_request_duration_seconds_count\{method="GET",path="\/users"\} 1/);
  assert.match(output, /http_request_duration_seconds_count\{method="POST",path="\/users"\} 1/);
});