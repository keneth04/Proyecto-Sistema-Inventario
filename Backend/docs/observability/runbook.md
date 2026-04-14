# Runbook de observabilidad base 

## Objetivo
Tener visibilidad mínima de producción para detectar caída del servicio, aumento de errores y degradación de latencia.

## Endpoints operativos
- `GET /health/live`: valida que el proceso Express está vivo.
- `GET /health/ready`: valida proceso + conectividad a base de datos.
- `GET /metrics`: exporta métricas en formato Prometheus.

## Métricas disponibles
- `http_requests_total{method,path,status}`
- `http_request_errors_total{method,path,status_class}`
- `http_request_duration_seconds_bucket{method,path,le}`
- `http_request_duration_seconds_sum{method,path}`
- `http_request_duration_seconds_count{method,path}`
- `process_uptime_seconds`

## Alertas base
Archivo sugerido: `Backend/docs/observability/alerts.prometheus.yml`.

1. **ApiDown** (critical)
2. **ApiHighErrorRate** (warning)
3. **ApiHighP95Latency** (warning)