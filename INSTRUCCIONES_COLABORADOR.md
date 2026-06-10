# Instrucciones para colaborar en el Portal RR.HH. — Grupo LEITEN

Bienvenido al proyecto. Esta guía te explica cómo configurar tu entorno para
poder hacer modificaciones al portal usando Claude (Cowork o Claude Code).

---

## 1. Lo que necesitás

- Cuenta de **GitHub** (ya la tenés: `Lpapa29`)
- Acceso a **Claude** con plan pago (Pro, Team o Enterprise)
- **Git** instalado en tu computadora ([descargar](https://git-scm.com/downloads))
- **Node.js** v18 o superior ([descargar](https://nodejs.org)) — para verificar
  cambios antes de subir

---

## 2. Aceptar la invitación al repo

Si todavía no aceptaste la invitación de GitHub:

```
https://github.com/PGabrielPapa/Portal-RRHH/invitations
```

O buscá el email de GitHub con el asunto "You've been invited to collaborate"
y hacé clic en **Accept invitation**.

---

## 3. Obtener tu token de GitHub

Necesitás un token para poder subir cambios al repo.

1. Entrá a https://github.com/settings/tokens
2. Clic en **Generate new token → Classic**
3. Poné un nombre descriptivo (ej: `portal-rrhh-colaborador`)
4. Seleccioná el permiso **`repo`** (primer ítem de la lista)
5. Clic en **Generate token**
6. **Copiá el token ahora** — GitHub solo lo muestra una vez

---

## 4. Clonar el proyecto

Abrí una terminal (CMD o PowerShell en Windows, Terminal en Mac) y ejecutá:

```bash
# Reemplazá TU_TOKEN con el token que generaste en el paso 3
git clone https://x-access-token:TU_TOKEN@github.com/PGabrielPapa/Portal-RRHH.git

# Entrar a la carpeta
cd Portal-RRHH
```

Si querés clonar en una carpeta específica (ej: el Escritorio):

```bash
# Windows
cd %USERPROFILE%\Desktop
git clone https://x-access-token:TU_TOKEN@github.com/PGabrielPapa/Portal-RRHH.git

# Mac / Linux
cd ~/Desktop
git clone https://x-access-token:TU_TOKEN@github.com/PGabrielPapa/Portal-RRHH.git
```

---

## 5. Abrir el proyecto en Claude

### Opción A — Claude Cowork (recomendado, más simple)
1. Abrí la app **Claude Desktop**
2. Cambiá al modo **Cowork**
3. Elegí **"Trabajar en una carpeta"** → seleccioná la carpeta `Portal-RRHH`
4. Pedile a Claude lo que querés modificar

### Opción B — Claude Code (desde terminal)
```bash
cd Portal-RRHH
claude  # abre Claude Code en la carpeta actual
```

---

## 6. Cómo trabajar sin pisarte con el otro colaborador

Para evitar conflictos, **antes de empezar a modificar** siempre:

```bash
# 1. Traer los últimos cambios del repo
git pull origin main

# 2. Crear tu propia rama de trabajo
git checkout -b feature/nombre-descriptivo
# Ejemplos:
#   git checkout -b feature/nueva-pantalla-reportes
#   git checkout -b fix/bug-liquidacion-final

# 3. Hacé tus cambios con Claude
# 4. Cuando terminés, subí tu rama
git push origin feature/nombre-descriptivo
```

Luego avisale a Pablo (PGabrielPapa) para que revise y mergee tu rama a `main`.

> **Si trabajan en turnos** (uno a la vez) pueden pushear directo a `main` sin
> crear ramas. Pero siempre hacer `git pull origin main` antes de empezar.

---

## 7. Contexto del proyecto para darle a Claude

Cuando abras una sesión nueva de Claude sobre este proyecto, pasale este
mensaje inicial para que tenga el contexto completo:

```
Proyecto Portal-RRHH (Grupo LEITEN).
Repo `PGabrielPapa/Portal-RRHH` (GitHub), deploy Vercel proyecto `leiten-portal`
(team `leiten-team`), prod: https://leiten-portal-leiten-team.vercel.app.
SPA vanilla JS, 58 módulos en js/*.js versionados con cache-busting en index.html.
El contexto completo está en ESTADO_PROYECTO.md (en la raíz del repo).
```

El archivo `ESTADO_PROYECTO.md` en la raíz del repo tiene todo el detalle:
estructura del código, convenciones, pendientes y el modelo de identidad de
empleados (importante antes de tocar `js/20-rrhh-abm.js`).

---

## 8. Convenciones que hay que respetar

- **Antes de subir cualquier cambio:** verificar sintaxis con `node --check js/archivo-modificado.js`
- **Siempre subir la versión de caché** cuando cambiás un `.js` o el `.css`:
  ```bash
  # En index.html, reemplazar la versión actual por la siguiente letra
  # Ejemplo: ?v=20260609g → ?v=20260609h
  # Usar Python para el reemplazo masivo:
  python3 -c "
  s=open('index.html').read()
  # Reemplazá VERSION_ACTUAL y VERSION_NUEVA según corresponda
  open('index.html','w').write(s.replace('?v=VERSION_ACTUAL','?v=VERSION_NUEVA'))
  "
  ```
- **No commitear tokens** ni credenciales al repo
- El empleado de prueba para testear es: legajo `000074`, PAPA PABLO GABRIEL, LEITEN S.A.

---

## 9. Deployar a Vercel (opcional)

Si Pablo te da el `VERCEL_TOKEN`, podés deployar vos mismo:

```bash
export VERCEL_TOKEN=EL_TOKEN_QUE_TE_PASE_PABLO
npx -y vercel deploy --prod --yes --token=$VERCEL_TOKEN
```

Si no, avisale a Pablo cuando tus cambios estén en `main` y él deployea.

---

## 10. Flujo de trabajo diario (paso a paso)

Cada vez que quieras trabajar en el proyecto, seguí estos pasos en orden:

**1 — Abrir la terminal y entrar a la carpeta**
```bash
cd Desktop/Portal-RRHH
```

**2 — Traer los últimos cambios** (por si Pablo modificó algo)
```bash
git pull origin main
```

**3 — Abrir Claude** (Cowork o Claude Code) apuntando a la carpeta `Portal-RRHH`
y pedirle los cambios que querés hacer.

**4 — Verificar sintaxis** antes de subir
```bash
node --check js/archivo-que-modifiqué.js
```

**5 — Subir la versión de caché** en `index.html`
Obligatorio si tocaste algún `.js` o `.css`. Pedíselo a Claude:
> *"Subí la versión de caché a la siguiente letra"*

**6 — Commitear y pushear a GitHub**
```bash
git add -A
git commit -m "descripción clara del cambio"
git push origin main
```

**7 — Deployar a Vercel**
```bash
npx -y vercel deploy --prod --yes --token=$VERCEL_TOKEN
```

---

## 11. Delegar todo el flujo a Claude

Con la carpeta abierta en Cowork o Claude Code, podés pedirle a Claude que
ejecute todo el proceso solo. Por ejemplo:

> *"Agregá el campo teléfono al formulario de empleados, verificá sintaxis,
> subí la versión de caché, commiteá con un mensaje descriptivo y deployá
> a Vercel."*

Claude va a hacer cada paso en orden y avisarte si algo falla.

Para que Claude tenga el contexto completo del proyecto al iniciar una sesión
nueva, pegá este mensaje al principio:

```
Proyecto Portal-RRHH (Grupo LEITEN).
Repo `PGabrielPapa/Portal-RRHH` (GitHub), deploy Vercel proyecto `leiten-portal`
(team `leiten-team`), prod: https://leiten-portal-leiten-team.vercel.app.
SPA vanilla JS, 58 módulos en js/*.js versionados con cache-busting en index.html.
El contexto completo está en ESTADO_PROYECTO.md (en la raíz del repo).
```

---

## 12. Resumen en una línea

```
pull → modificar con Claude → node --check → bump caché → commit → push → deploy
```

---

Cualquier duda sobre el código, podés leer el `ESTADO_PROYECTO.md` o preguntarle
directamente a tu Claude con la carpeta del proyecto abierta.
