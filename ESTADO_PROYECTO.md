# Portal RR.HH. — Grupo LEITEN · Estado del proyecto (handoff)

> Documento de contexto para retomar el proyecto en **Claude Cowork** o **Claude Code**.
> Última actualización del estado: junio 2026. Versión de caché vigente: **`?v=20260603i`**.

---

## 1. Qué es

Portal interno de RR.HH. del Grupo LEITEN. Aplicación web de página única (SPA) en **vanilla JS modular** (sin framework), que centraliza la gestión de recursos humanos de cuatro empresas:

- LEITEN S.A.
- SINIS S.A.
- LEITEN SALTA S.A.
- BARTON REBAR S.A.

Tres roles de usuario: **empleado** (`employee`), **gerente** (`manager`) y **RR.HH.** (`rrhh`), más nivel **admin**.

---

## 2. Repositorio y despliegue

- **Repo:** `PGabrielPapa/Portal-RRHH` (GitHub, público).
- **Hosting:** Vercel — proyecto `leiten-portal`, scope `leiten-team`.
- **URL producción:** https://leiten-portal-leiten-team.vercel.app
- **Carpeta de trabajo local (sesiones previas):** `/home/claude/portal-check/`

### Credenciales (NO incluidas aquí por seguridad)
El token de GitHub (`x-access-token`) y el `VERCEL_TOKEN` **no figuran en este archivo**. Están en las instrucciones globales / variables de entorno del usuario. **No commitear tokens al repo.**

### Comandos habituales
```bash
# Clonar (reemplazar TOKEN por el token de GitHub configurado)
git clone https://x-access-token:TOKEN@github.com/PGabrielPapa/Portal-RRHH.git

# Verificar sintaxis antes de desplegar
node --check js/NN-modulo.js

# Desplegar a producción (requiere VERCEL_TOKEN en entorno)
export VERCEL_TOKEN=...        # configurado por el usuario
npx -y vercel deploy --prod --yes --token=$VERCEL_TOKEN

# Push a GitHub
git push origin main
```

---

## 3. Estructura del código

```
index.html              # SPA: carga css + data/*.js + js/NN-*.js (58 módulos)
css/styles.css
data/*.js               # datos: empleados, feriados-ar, domicilios, firmas, logos, etc.
js/00-constants.js      # claves de localStorage centralizadas (prefijo lsg_)
js/01-state-storage.js  # estado y persistencia (IndexedDB / localStorage)
js/02-auth.js           # login, sesión, badge de rol
js/03-navigation.js     # sidebar, routing de secciones, guards de acceso por rol
js/06-recibos.js        # panel del EMPLEADO: recibos, ganancias (visor F.1357), etc.
js/11-rrhh-evaluaciones.js
js/14-rrhh-escala.js
js/17-rrhh-liquidacion.js            # MOTOR de liquidación + layout del recibo
js/18-rrhh-liquidacion-impuestos.js  # ganancias / F.1357 / liquidación anual
js/35-recibo-pdf.js     # generación del PDF del recibo (html2canvas)
... (numeración correlativa; el número indica orden de carga)
```

### Cache-busting (IMPORTANTE)
`index.html` versiona **todos** los `js/*.js` y el `css` con `?v=YYYYMMDD<letra>`.
`vercel.json` fija `Cache-Control: no-cache`, pero el navegador no revalida las
entradas ya cacheadas: por eso **hay que subir la versión en CADA cambio de asset**.

```bash
# Subir la versión (ejemplo: de 'i' a 'j') y luego desplegar
sed -i 's/?v=20260603i/?v=20260603j/g' index.html
```

- Versión vigente: **`?v=20260603i`**.
- Los `data/*.js` **no** se versionan (solo `js/` y `css`).

---

## 4. Roles y permisos (en `js/03-navigation.js`)

| Sección | Acceso |
|---|---|
| `rrhhpanel` | rrhh / admin |
| `admin-usuarios` | admin |
| `pendientes` (aprobaciones) | manager / rrhh |
| `licencias-gerente` | manager |
| `organigrama` | rrhh / manager |
| `elementos-trabajo`, `beneficios` | rrhh / admin |
| Personales (adelanto, licencias, mensajes, cert-trabajo) | employee / manager |

---

## 5. Trabajo reciente (lo último que hicimos)

En orden cronológico (commits más recientes arriba):

1. **F.1357 no se visualizaba** (`d975bc2`) — el visor del empleado abría con
   `window.open('','_blank')+document.write`, bloqueado en el iframe de la app.
   **Fix:** modal in-app con `<iframe srcdoc>` (`verFormularioGanancias` en `js/06`).
2. **Recibo Decreto 407/2026** (`26fd044`) — el recibo (`reciboUnaCopiaPag` en
   `js/17`) ahora expone, antes del bruto/neto, el **COSTO TOTAL EMPLEADOR**
   (contribuciones patronales con base y monto), **SUB TOTAL CONTRIBUCIONES**,
   **COMPOSICIÓN SALARIAL**, **SUELDO NETO**, y al pie el **Detalle de la
   composición salarial** (empleador/trabajador) con **gráfico de torta** (SVG).
3. **Planilla F.1357 AFIP** (`e490fd7`) — `planillaGananciasHTML` (`js/18`)
   reescrita al formato oficial "Control de Liquidación del Impuesto a las
   Ganancias 4ª Categoría". Disponible al empleado por mes + publicable en PDF
   por RR.HH. (`publicarGananciasPDF`).
4. **Importar impuesto a la vista del empleado** (`ddc051f`).
5. **Redondeo del neto a cero centavos** (`5c7c335`) — neto redondeado al peso
   entero (hacia arriba), concepto "Redondeo" como plug en el recibo.
6. **Validación de días en aprobación** (`5e9c80e`) — los mensualizados usan días
   corridos; solo los regímenes que corresponde (p. ej. UOCRA) usan días hábiles.

También se generó un **Manual de Usuario** (Word, 3 capítulos: Empleados / Gerente /
RR.HH.) — script en `/home/claude/manual/manual.js` (fuera del repo).

---

## 6. Convenciones de trabajo

- **Idioma:** español, respuestas concisas.
- **Antes de desplegar:** `node --check` de cada archivo modificado.
- **Banco de pruebas (sandbox):** patrón Node + `vm` para cargar todos los módulos
  headless (stub de `document`/`localStorage`/`window`), concatenando
  `data/*.js` + `js/[0-9]*.js` en el orden de `index.html`, y ejecutar funciones
  (p. ej. `calcularItemLiquidacion`, `planillaGananciasHTML`, `reciboUnaCopiaPag`).
- **Render visual de verificación:** `wkhtmltoimage` (HTML→PNG) o LibreOffice
  (`soffice` → PDF) para revisar recibos / planillas antes de dar por cerrado.
- **Empleado de prueba:** PAPA PABLO GABRIEL, legajo `000074`, LEITEN S.A.
- Tras cualquier cambio, **subir `?v=`** y avisar de hacer Ctrl/Cmd+Shift+R.

---

## 7. Pendientes / próximos pasos

- **SCVO (Seguro Colectivo de Vida Obligatorio, Dto. 1567/74):** hoy figura en $0
  porque no está parametrizado. Falta cargar el valor per cápita del empleador.
- **Asignaciones Familiares:** van incluidas dentro de "Seguridad Social" del
  empleador (no como línea separada). Evaluar si se requiere desglose propio.
- **Tope de retención del 35% (RG 4003/17):** no implementado. Hoy el F.1357
  muestra "Saldo a Pagar = 0" porque se retiene el importe completo. Pendiente:
  limitar la retención mensual al 35% del neto y exponer el remanente como saldo.
- **Manual de usuario:** se puede ampliar con capturas de pantalla y glosario.

### Otros proyectos relacionados (estado de repos por confirmar)
- **AnticiposApi** (.NET 8 / EF Core) — entregado como ZIP; repo sin confirmar.
- **SkyScout** (React, buscador de vuelos, v4.0) — sin confirmar push a repo.
- **Migración FastAPI del portal** (`agentecausante-gif/portal-rrhh`) — Fases 1–4
  hechas; diferidos: simulador de liquidación, regresión contra datos reales,
  migración de seeds de convenios.

---

## 8. Cómo retomar en Cowork / Claude Code

1. Cloná el repo en una carpeta local (ver comandos en §2).
2. **Cowork:** abrí Claude Desktop → modo Cowork → "Trabajar en una carpeta" →
   elegí la carpeta del repo. Para deploy/web, habilitá *Claude en Chrome*.
   **Claude Code:** abrí la carpeta del repo directamente desde la terminal/app.
3. Pedí lo que quieras seguir: el contexto del proyecto y este archivo alcanzan
   para retomar sin re-explicar todo.
4. Recordá: subir `?v=` en cada cambio de asset y verificar con `node --check`
   antes de desplegar.
