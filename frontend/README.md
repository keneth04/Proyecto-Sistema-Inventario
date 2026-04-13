# Frontend - Proyecto Horarios

## Requisitos
- Node 18+
- Backend corriendo en `http://localhost:3000`

## Instalación y ejecución
```bash
cd frontend
npm install
npm run dev
```

## Variables
- `VITE_API_BASE` (opcional): por defecto usa `/api`.
- Si usas dominio distinto, define `VITE_API_BASE=http://localhost:3000/api`.

## Proxy Vite
Este proyecto incluye proxy para `/api` hacia `http://localhost:3000` en `vite.config.js`.

## Flujo de roles
- `admin`:
  - acceso a `/admin/*`.
  - pantallas: Skills, Users, Horarios día, Crear borrador, Publicar semana, Editar semana, Dotación.
- `agente`:
  - acceso a `/agent`.
  - pantalla: Mi horario publicado.

## Contrato API esperado
Todas las pantallas consumen el contrato:
- Éxito: `{ success:true, message:string, body:any }`
- Error: `{ error:true, status:number, message:string }`
 