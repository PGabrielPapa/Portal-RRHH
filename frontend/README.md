# Portal RR.HH. — Frontend

SPA en **React + Vite + TypeScript**. Consume la API del backend.

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:5173
```

El dev server hace **proxy de `/api` → `http://localhost:4000`** (ver `vite.config.ts`),
así que necesitás el backend corriendo en el `:4000` (con su `docker compose up`).

## Build de producción

```bash
npm run build        # genera /dist (estático)
npm run preview      # previsualizar el build
```

Configurá la URL de la API con la variable `VITE_API_URL` (ver `.env.example`).
En dev podés dejar `/api` (usa el proxy). En producción, ponela apuntando a la
URL pública del backend, p. ej. `https://api.tudominio.com/api`.

## Deploy en DigitalOcean

- **App Platform (Static Site):** conectar el repo; build command `npm run build`,
  output `dist`. Setear `VITE_API_URL` con la URL pública del backend.
- **Contenedor Docker (nginx):** el `Dockerfile` buildea y sirve `/dist` con nginx.
  Ojo: el `nginx.conf` hace proxy de `/api` al host `api` (útil si front y back
  comparten red Docker); para deploy separado, apuntá `VITE_API_URL` directo a la
  URL del backend y serví el estático sin ese proxy.

## Estructura

```
frontend/
  src/
    main.tsx, App.tsx        # entrypoint + ruteo
    lib/  api.ts auth.tsx types.ts
    pages/  Login.tsx ChangePassword.tsx Empleados.tsx
    styles.css
  index.html, vite.config.ts, tsconfig.json, Dockerfile, nginx.conf
```
