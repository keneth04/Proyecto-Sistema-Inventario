# Runbook de observabilidad base 

## Objetivo
Tener visibilidad mínima de producción para detectar caída del servicio, aumento de errores y degradación de latencia.

## Endpoints operativos
- `GET /health/live`: valida que el proceso Express está vivo.
- `GET /health/ready`: valida proceso + conectividad a MongoDB (`ping`).
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

1. **HorariosApiDown** (critical)
   - Condición: `up == 0` por 2 minutos.
   - Acción inmediata:
     1. Verificar estado del proceso (PM2/systemd/k8s).
     2. Verificar reachability de red y puerto.
     3. Revisar últimos logs estructurados (`server_startup_failed`).

2. **HorariosApiHighErrorRate** (warning)
   - Condición: error rate > 5% por 10 minutos.
   - Acción inmediata:
     1. Filtrar logs por `message=http_error`.
     2. Correlacionar usando `requestId`.
     3. Identificar endpoint con mayor `http_request_errors_total`.
     4. Validar integridad Mongo y credenciales JWT.

3. **HorariosApiHighP95Latency** (warning)
   - Condición: p95 > 1.5s por 10 minutos.
   - Acción inmediata:
     1. Ubicar rutas con mayor latencia en `http_request_duration_seconds_*`.
     2. Revisar logs de `mongo_connection_failed` o `mongo_healthcheck_failed`.
     3. Analizar carga de CPU/RAM y conexiones a Mongo.

## Escalamiento recomendado
- `critical`: escalar al on-call inmediatamente.
- `warning`: abrir incidente y mitigar en horario operativo.

## Verificación post-incidente
1. Confirmar `GET /health/ready` con HTTP 200.
2. Validar recuperación de latencia p95 y error rate.
3. Documentar RCA y acción preventiva.