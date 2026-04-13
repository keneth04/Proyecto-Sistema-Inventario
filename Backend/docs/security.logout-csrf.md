# Seguridad: protección de `/api/auth/logout` con CSRF

## Causa raíz
Antes de este cambio, el endpoint `POST /api/auth/logout` dependía únicamente de la cookie `auth_token` (HttpOnly) para autenticar la sesión. Aunque la cookie era segura, cualquier sitio externo podía intentar forzar una petición cross-site y cerrar sesión del usuario (CSRF de estado).

## Solución implementada
Se aplicó protección CSRF para logout con enfoque **double submit + token ligado a sesión JWT**:

1. En login se genera un `csrfToken` criptográfico.
2. Ese token se incluye dentro del JWT firmado (`csrfToken`) para que quede ligado a la sesión.
3. Backend devuelve `csrfToken` al frontend en `login` y `session`.
4. Frontend envía `X-CSRF-Token` en `POST /api/auth/logout`.
5. Middleware `LogoutCsrfMiddleware` valida que el header coincida con el token de la sesión autenticada.

Si no coincide o falta, responde `403 Token CSRF inválido`.

## Cookie SameSite
Se endureció el parseo de `AUTH_COOKIE_SAMESITE`:

- Valores válidos: `strict`, `lax`, `none`.
- Default seguro: `strict`.
- Se mantiene validación: si `SameSite=none` en producción, `AUTH_COOKIE_SECURE=true` es obligatorio.

## Compatibilidad
- No cambia arquitectura.
- No cambia contratos de dominio.
- Solo se agrega `csrfToken` a payload de `login` y `session`.

## Checklist operativo
- [ ] `POST /api/auth/login` retorna `body.csrfToken`.
- [ ] `GET /api/auth/session` retorna `body.csrfToken`.
- [ ] `POST /api/auth/logout` sin `X-CSRF-Token` -> `403`.
- [ ] `POST /api/auth/logout` con token válido -> `200`.
- [ ] Cookie auth usa `SameSite=strict` por defecto.