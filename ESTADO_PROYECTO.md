# Portal RR.HH. — Grupo LEITEN · Estado del proyecto (handoff)

> Documento de contexto para retomar el proyecto en **Claude Cowork** o **Claude Code**.
> Última actualización del estado: junio 2026 (sesión Cowork del 09/06). Versión de caché vigente: **`?v=20260609g`**.

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
sed -i 's/?v=20260609g/?v=20260610a/g' index.html
```

- Versión vigente: **`?v=20260609g`**.
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

### Sesión 09/06/2026 (Cowork) — auditoría, pendientes, import y refactor de identidad

0. **Identidad empresa+legajo (refactor, enfoque migración-free)** (`d51425e`,
   `03d3258`) — **PROBLEMA RESUELTO:** el legajo NO es único global, puede
   repetirse entre empresas; antes el sistema asumía legajo único y la
   importación de altas de otras empresas con legajos ya usados se rechazaba.
   **Solución:** ver §9 (modelo de identidad). Los empleados del seed quedan
   intactos (legajo "pelado"); solo las **altas** usan el uid compuesto
   `slug(empresa)-legajo`. Helpers en `js/20`: `empSlug`, `makeUid`, `asUid`,
   `empByUid`, `legD`. **Sin migración de datos** (los recibos/domicilios
   existentes siguen keyed por su legajo original).
1. **Importación de Excel de altas (ABM) — reparada** (`169b2b8`) — la rama
   `.xlsx` de `importarAltasMasivas` (`js/20`) era un stub que no parseaba nada.
   Ahora parsea con SheetJS (ya cargado inline), deriva el DNI del CUIL si falta
   la columna, deduplica por **empresa+legajo**, y nunca falla en silencio
   (try/catch + `reader.onerror`). Botón **"📋 Plantilla altas"**
   (`descargarPlantillaAltas`) con los encabezados exactos. Mensajes de
   resultado siempre explícitos (éxito / motivo del problema).
2. **Tope de retención 35% Ganancias (RG 4003/17)** (`3698c8c`) — implementado:
   la retención mensual se limita al 35% del neto (`params.gan_topeRetencionPct`,
   default 35) y el excedente se difiere (se traslada solo vía acumulados). El
   F.1357 muestra el remanente en "SALDO A PAGAR". **Validar con un caso real.**
3. **SCVO parametrizable** (`3698c8c`) — `params.scvoPercapita` (cargo patronal
   fijo per cápita, Dto. 1567/74). Default 0; **falta cargar el valor vigente**
   en Parámetros para que impacte.
4. **Refactor seguro** (`3698c8c`) — `parseInt(x)` → `parseInt(x, 10)` en 56
   sitios. Sin cambios de lógica.
5. **Auditoría completa** — sin bugs críticos (0 errores de sintaxis, ESLint
   limpio, sandbox sin errores de carga, sin secretos commiteados).

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

- **SCVO (Dto. 1567/74):** ✅ ya parametrizado (`params.scvoPercapita`). Pendiente
  operativo: **cargar el valor per cápita vigente** en Parámetros (default 0).
- **Asignaciones Familiares:** van incluidas dentro de "Seguridad Social" del
  empleador (no como línea separada). Evaluar si se requiere desglose propio.
- **Tope de retención del 35% (RG 4003/17):** ✅ implementado
  (`params.gan_topeRetencionPct`, default 35). El F.1357 expone el remanente en
  "SALDO A PAGAR". Pendiente: **validar contra una liquidación real**.
- **Pulido visual del legajo:** el barrido con `legD()` cubrió las pantallas
  principales; si una pantalla puntual muestra el uid con prefijo
  (`SINISSA-000074`) para un empleado nuevo repetido, envolver esa visualización
  con `legD(...)`.
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

---

## 9. Modelo de identidad de empleados (empresa + legajo)

> Importante para no romper recibos/datos al tocar `js/20-rrhh-abm.js`.

El **legajo no es único global**: puede repetirse entre las empresas. La
identidad interna de cada empleado es el **uid** = `slug(empresa)-legajo`
(p. ej. `SINISSA-000074`). Helpers en `js/20`:

- `empSlug(emp)` → slug estable de la empresa (mayúsculas, sin símbolos).
- `makeUid(emp, legNum)` → uid compuesto.
- `asUid(valor, emp)` → normaliza (si ya es uid lo deja).
- `empByUid(uid)` / `empByLeg(leg)` → resolución de empleado.
- `legD(valor)` → número de legajo **a mostrar** (quita el prefijo del uid;
  no-op para legajos pelados). **Usar en toda visualización del legajo.**

### Regla clave (enfoque migración-free)

`getNomina()` arma la nómina así:

- **Empleados del seed (`DB` en `data/empleados.js`):** conservan su legajo
  "pelado" en `e.leg` (sus legajos del seed son únicos). **No se migran**:
  recibos (`${leg}_${periodo}`), `DOMICILIOS[leg]`, `CUMPLE_DATA`, overrides y
  bajas siguen keyed por el legajo original. `e.legNum === e.leg`.
- **Altas (importadas / manuales):** `e.leg` = uid compuesto; `e.legNum` = número
  visible. Esto permite legajos repetidos entre empresas sin colisión de claves.

La **deduplicación e identidad se computan por uid** (`makeUid(e.emp, e.legNum)`)
para todos: un duplicado real (misma empresa + mismo legajo) se rechaza, y un
legajo repetido en **otra** empresa se acepta.

### Al editar código

- **Claves de storage e identidad** (recibos, ganancias, evaluaciones, IDs de
  elementos DOM, identidad pasada a handlers `onclick`): usar **`e.leg`** (el uid).
- **Visualización del número de legajo**: usar **`legD(e.leg)`** o **`e.legNum`**.
- Las altas se guardan en `lsg_abm_altas` con el legajo pelado; `getNomina()`
  les calcula el uid en runtime.
