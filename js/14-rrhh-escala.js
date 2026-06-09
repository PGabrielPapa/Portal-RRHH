// ═══════════════════════════════════════════════════════════════
// Soporta histórico de versiones + incrementos porcentuales
// ═══════════════════════════════════════════════════════════════

const ESCALA_TRAMOS = [
  { key:'INI',  label:'Inicial',      color:'var(--t3)' },
  { key:'JUN',  label:'Junior',       color:'rgb(59,130,246)' },
  { key:'SEMI', label:'Semi Senior',  color:'rgb(34,197,94)' },
  { key:'SEN',  label:'Senior',       color:'rgb(251,191,36)' }
];

const ESCALA_SEED_V1 = {
  id: 'esc_seed_2026_04',
  vigencia: '2026-04-01',
  mesLabel: 'Abril 2026',
  origen: 'inicial',
  porcentaje: null,
  alcance: 'todas',
  comentario: 'Escala unificada inicial — 04/2026',
  creado: '2026-04-01T00:00:00.000Z',
  creadoPor: null,
  categorias: [
    { cat:'OP',  label:'Operario',                          nota:'Aux. Plast. -15,61%',       difMesAnt:0.02,  tramos:{ INI:1296956.96, JUN:1361804.81, SEMI:1497985.29, SEN:1647783.82 } },
    { cat:'OF',  label:'Oficial',                           nota:'Operador Plast. -22,10%',   difMesAnt:0.02,  tramos:{ INI:1316511.93, JUN:1382337.53, SEMI:1520571.28, SEN:1672628.41 } },
    { cat:'ASI', label:'Asistente',                         nota:'Adm. 3 Plast. -11,70%',     difMesAnt:0.02,  tramos:{ INI:1335551.67, JUN:1402329.25, SEMI:1542562.18, SEN:1696818.40 } },
    { cat:'ANA', label:'Analista / Supervisor de Fábrica',  nota:'',                          difMesAnt:0.02,  tramos:{ INI:1696818.40, JUN:1781659.31, SEMI:1959825.25, SEN:2155807.77 } },
    { cat:'COO', label:'Coordinador',                       nota:'',                          difMesAnt:0.02,  tramos:{ INI:2155807.77, JUN:2328703.55, SEMI:2561573.91, SEN:2817731.30 } },
    { cat:'JEF', label:'Jefe de Departamento',              nota:'',                          difMesAnt:0.02,  tramos:{ INI:2817731.30, JUN:2958617.87, SEMI:3254479.65, SEN:3579927.62 } },
    { cat:'GER', label:'Gerente',                           nota:'',                          difMesAnt:0.02,  tramos:{ INI:3579927.62, JUN:3579927.62, SEMI:3937920.38, SEN:4331712.42 } }
  ],
  regionales: [
    { key:'REG',      label:'Gerente Regional',          desc:'Neuquén / Córdoba / Mendoza / Rosario / Santa Fe / Corrientes', monto:2765771.32, difMesAnt:0.02 },
    { key:'BSAS-3F',  label:'Gerente Buenos Aires · 3F', desc:'Sucursal 3 de Febrero',                                         monto:2475489.38, difMesAnt:0.02 },
    { key:'BSAS-JM',  label:'Gerente Buenos Aires · JM', desc:'Sucursal José Marmol',                                          monto:3318925.58, difMesAnt:0.02 }
  ],
  // ── Adicional por título (monto fijo paritario, actualizable en cada incremento) ──
  // Estos montos se negocian por paritaria y se actualizan junto con la escala.
  // El monto aplica a TODOS los empleados del CCT que tengan ese nivel de título.
  montos_titulo: {
    secundario:   0,      // $ — 0 = no configurado aún
    terciario:    0,
    universitario:0
  }
};

// Alias de compatibilidad con el código previo
const ESCALA_UNIFICADA = Object.assign({ tramos: ESCALA_TRAMOS }, ESCALA_SEED_V1);

// ── Storage de versiones ──
const ESCALA_STORAGE_KEY = 'lsg_escala_versiones';

function _getEscalaVersionesRaw(){
  try {
    const raw = localStorage.getItem(ESCALA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}
function _setEscalaVersionesRaw(arr){
  try { localStorage.setItem(ESCALA_STORAGE_KEY, JSON.stringify(arr)); } catch(e){ console.error(e); }
}

function getEscalaVersiones(){
  // Siempre incluye la seed; las versiones del usuario se agregan y se ordenan por vigencia asc
  const user = _getEscalaVersionesRaw();
  const all = [ESCALA_SEED_V1, ...user];
  return all.sort((a,b)=>{
    if(a.vigencia !== b.vigencia) return a.vigencia.localeCompare(b.vigencia);
    return (a.creado||'').localeCompare(b.creado||'');
  });
}

function saveEscalaVersion(v){
  const user = _getEscalaVersionesRaw();
  user.push(v);
  _setEscalaVersionesRaw(user);
}

function eliminarEscalaVersion(id){
  if(id === ESCALA_SEED_V1.id) return false; // no se puede borrar la seed
  const user = _getEscalaVersionesRaw();
  const filtered = user.filter(v => v.id !== id);
  _setEscalaVersionesRaw(filtered);
  return true;
}

// ─── Adicional por título: monto fijo paritario ───────────────────────────
// Retorna el monto fijo del adicional por título según la escala activa.
// titulo: 'secundario' | 'terciario' | 'universitario' | ''
function getMontoAdicionalTitulo(titulo, fechaRef){
  if(!titulo) return 0;
  const escala = getEscalaActiva(fechaRef);
  const mt = escala.montos_titulo || {};
  const nivel = titulo.toLowerCase();
  if(nivel === 'universitario') return mt.universitario || 0;
  if(nivel === 'terciario')     return mt.terciario     || 0;
  if(nivel === 'secundario')    return mt.secundario    || 0;
  return 0;
}


function getEscalaActiva(fechaRef){
  const todas = getEscalaVersiones();
  const hoy = fechaRef || new Date().toISOString().slice(0,10);
  const aplicables = todas.filter(v => v.vigencia <= hoy);
  return aplicables.length ? aplicables[aplicables.length-1] : todas[0];
}

// ── Resolver monto según la escala vigente ──
function getMontoEscala(cat, tramo, fechaRef){
  if(!cat || !tramo) return null;
  const escala = getEscalaActiva(fechaRef);
  const catRow = escala.categorias.find(c=>c.cat===cat);
  if(catRow && catRow.tramos[tramo]!==undefined) return catRow.tramos[tramo];
  if(cat==='GER'){
    if(tramo==='BS.AS' || tramo==='BS.AS.3F') return escala.regionales.find(r=>r.key==='BSAS-3F')?.monto || null;
    if(tramo==='BS.AS.JM' || tramo==='JM')    return escala.regionales.find(r=>r.key==='BSAS-JM')?.monto || null;
    if(tramo==='REG')                          return escala.regionales.find(r=>r.key==='REG')?.monto || null;
  }
  return null;
}

// ── Aplicar incremento porcentual → crea nueva versión ──
function aplicarIncrementoEscala(pct, vigencia, alcance, comentario){
  const activa = getEscalaActiva();
  const factor = 1 + (pct/100);
  const vigenciaSlice = String(vigencia).slice(0,10);
  const mesLabel = _formatMesLabel(vigenciaSlice);
  const round2 = v => Math.round(v * 100) / 100;

  const nueva = {
    id: 'esc_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
    vigencia: vigenciaSlice,
    mesLabel,
    origen: 'incremento',
    porcentaje: pct,
    alcance: alcance || 'todas',
    comentario: comentario || '',
    creado: new Date().toISOString(),
    creadoPor: (typeof currentUser!=='undefined' && currentUser?.emp?.leg) || null,
    baseVersionId: activa.id,
    categorias: activa.categorias.map(c => ({
      cat: c.cat,
      label: c.label,
      nota: c.nota,
      difMesAnt: (alcance === 'regionales') ? c.difMesAnt : (pct/100),
      tramos: (alcance === 'regionales') ? {...c.tramos} : {
        INI:  round2(c.tramos.INI  * factor),
        JUN:  round2(c.tramos.JUN  * factor),
        SEMI: round2(c.tramos.SEMI * factor),
        SEN:  round2(c.tramos.SEN  * factor),
      }
    })),
    regionales: activa.regionales.map(r => ({
      key: r.key,
      label: r.label,
      desc: r.desc,
      difMesAnt: (alcance === 'categorias') ? r.difMesAnt : (pct/100),
      monto: (alcance === 'categorias') ? r.monto : round2(r.monto * factor)
    })),
    // Propagar montos_titulo con el mismo incremento paritario
    // Si el alcance es 'todas' o 'categorias', también se incrementan los títulos
    montos_titulo: (() => {
      const mt = activa.montos_titulo || { secundario:0, terciario:0, universitario:0 };
      if(alcance === 'regionales') return { ...mt }; // solo regionales → títulos sin cambio
      return {
        secundario:   round2((mt.secundario   || 0) * factor),
        terciario:    round2((mt.terciario    || 0) * factor),
        universitario:round2((mt.universitario|| 0) * factor),
      };
    })()
  };
  saveEscalaVersion(nueva);
  return nueva;
}

function _formatMesLabel(isoDate){
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const p = isoDate.split('-');
  if(p.length < 2) return isoDate;
  const m = parseInt(p[1],10);
  return `${meses[m-1]||p[1]} ${p[0]}`;
}

function _fechaBonita(isoDate){
  const p = isoDate.split('-');
  if(p.length < 3) return isoDate;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
function _renderEscalaInternaEnPaneMaster(){
  const cont = document.getElementById('escala-pane-master-interna');
  if(!cont) return;
  const fN = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$ '+Math.round(n).toLocaleString('es-AR');
  const pct = p => (p*100).toFixed(1).replace('.',',')+'%';

  const escala = getEscalaActiva();
  const versiones = getEscalaVersiones();
  const t = ESCALA_TRAMOS;

  // Nómina actual (DB + overrides ABM + altas - bajas), excluyendo bajas
  const nominaActiva = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);

  const conteo = {};
  nominaActiva.forEach(e=>{
    if(!e.cat || !e.tramo) return;
    const k = `${e.cat}__${e.tramo}`;
    conteo[k] = (conteo[k]||0)+1;
  });

  // ── Header ──
  let html = `
    <div class="card" style="padding:18px 22px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <div>
        <div style="font-size:13px;color:var(--t1);font-weight:600;margin-bottom:3px">Escala unificada del grupo de empresas</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          Vigencia activa: <b style="color:var(--t2)">${escala.mesLabel}</b> (${_fechaBonita(escala.vigencia)})
          · ${escala.categorias.length} categorías × ${t.length} tramos
          · ${escala.regionales.length} gerentes regionales
          · ${versiones.length} versión${versiones.length===1?'':'es'} en histórico
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="abrirFormIncrementoEscala()" style="font-size:12px;padding:6px 14px">⇡ Cargar incremento</button>
        <button class="btn btn-ghost" onclick="abrirEditorEscalaInterna()" style="font-size:12px;padding:6px 14px">✏ Editar valores</button>
        <button class="btn btn-ghost" onclick="exportarEscalaCSV()" style="font-size:12px;padding:6px 14px">⬇ CSV</button>
        <button class="btn btn-ghost" onclick="exportarEscalaXLSX()" style="font-size:12px;padding:6px 14px">⬇ Excel</button>
      </div>
    </div>`;

  // ── Tabs ──
  html += `
    <div style="display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid var(--border);flex-wrap:wrap">
      <button id="escala-tab-act" onclick="escalaTab('act')"
        style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:600;color:var(--t1);border-bottom:2px solid var(--accent2);margin-bottom:-2px">
        📊 Escala vigente
      </button>
      <button id="escala-tab-hist" onclick="escalaTab('hist')"
        style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">
        📜 Histórico (${versiones.length})
      </button>
    </div>
    <div id="escala-pane-act"></div>
    <div id="escala-pane-hist" style="display:none"></div>`;

  cont.innerHTML = html;
  _renderEscalaPaneActiva(escala, conteo, nominaActiva);
  _renderEscalaPaneHistorico(versiones);
}

function escalaTab(which){
  const ta = document.getElementById('escala-tab-act');
  const th = document.getElementById('escala-tab-hist');
  const pa = document.getElementById('escala-pane-act');
  const ph = document.getElementById('escala-pane-hist');
  if(!ta||!th||!pa||!ph) return;
  const active = { color:'var(--t1)', weight:'600', border:'2px solid var(--accent2)' };
  const inactive = { color:'var(--t3)', weight:'400', border:'2px solid transparent' };
  const on = which==='hist' ? th : ta;
  const off = which==='hist' ? ta : th;
  on.style.color=active.color; on.style.fontWeight=active.weight; on.style.borderBottom=active.border;
  off.style.color=inactive.color; off.style.fontWeight=inactive.weight; off.style.borderBottom=inactive.border;
  pa.style.display = which==='hist' ? 'none' : 'block';
  ph.style.display = which==='hist' ? 'block' : 'none';
}

function _renderEscalaPaneActiva(escala, conteo, nominaActiva){
  const pane = document.getElementById('escala-pane-act');
  if(!pane) return;
  const fN = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$ '+Math.round(n).toLocaleString('es-AR');
  const pct = p => (p*100).toFixed(1).replace('.',',')+'%';
  const t = ESCALA_TRAMOS;
  const nomina = nominaActiva || (typeof getNomina==='function' ? getNomina().filter(e=>!e._deBaja && !e.egreso) : []);

  let html = `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t1)">📊 Categorías generales</span>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Básico según categoría × tramo</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;min-width:820px;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;min-width:260px">Categoría</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:60px">Dif.</th>
              ${t.map(tr=>`<th style="padding:12px 10px;text-align:right;font-size:11px;font-family:var(--font-mono);color:${tr.color};text-transform:uppercase;letter-spacing:.05em;font-weight:600;min-width:140px">${tr.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${escala.categorias.map((c,i)=>{
              const rowBg = i%2===0 ? 'transparent' : 'rgba(255,255,255,.01)';
              return `
              <tr style="border-bottom:1px solid var(--border);background:${rowBg}">
                <td style="padding:14px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg2);color:var(--t2);border:1px solid var(--border);min-width:40px;text-align:center">${c.cat}</span>
                    <div>
                      <div style="color:var(--t1);font-weight:500">${c.label}</div>
                      ${c.nota?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${c.nota}</div>`:''}
                    </div>
                  </div>
                </td>
                <td style="padding:10px;text-align:center;font-size:11px;font-family:var(--font-mono);color:var(--t3)">+${pct(c.difMesAnt)}</td>
                ${t.map((tr,ti)=>{
                  const monto = c.tramos[tr.key];
                  const n = conteo[`${c.cat}__${tr.key}`]||0;
                  const difIncr = ti>0 ? (monto/c.tramos[t[ti-1].key]-1) : 0;
                  const difLabel = ti>0 ? `<span style="font-size:9px;color:var(--t3);margin-left:6px;font-family:var(--font-mono)">+${pct(difIncr)}</span>` : '';
                  return `
                    <td style="padding:12px 10px;text-align:right;font-family:var(--font-mono);color:var(--t1);font-weight:500">
                      ${fN(monto)}${difLabel}
                      ${n>0?`<div style="font-size:9px;color:${tr.color};margin-top:3px;opacity:.8">${n} emp.</div>`:''}
                    </td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  html += `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t1)">🌎 Gerentes regionales</span>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Escalas especiales según sede</span>
      </div>
      <div style="padding:4px 0">
        ${escala.regionales.map(r=>`
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:240px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:3px">
                <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(251,191,36,.1);color:rgb(251,191,36);border:1px solid rgba(251,191,36,.3)">${r.key}</span>
                <span style="font-size:13px;font-weight:500;color:var(--t1)">${r.label}</span>
              </div>
              <div style="font-size:11px;color:var(--t3);margin-left:2px">${r.desc}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-mono);font-size:15px;color:var(--t1);font-weight:600">${fN(r.monto)}</div>
              <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">+${pct(r.difMesAnt)} vs mes ant.</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  const empleadosSinEscala = nomina.filter(e=>{
    if(!e.cat || !e.tramo) return true;
    return getMontoEscala(e.cat, e.tramo) === null;
  });
  const totalEmp = nomina.length;
  const conEscala = totalEmp - empleadosSinEscala.length;

  // Opciones para los selectores de ajuste inline
  const opcionesCat = ESCALA_UNIFICADA.categorias
    .map(c => `<option value="${c.cat}">${c.cat} — ${c.label}</option>`).join('');
  const opcionesTramo = ESCALA_TRAMOS
    .map(tr => `<option value="${tr.key}">${tr.key} — ${tr.label}</option>`).join('') +
    `<option value="BS.AS.3F">BS.AS.3F — Buenos Aires (3F, solo GER)</option>` +
    `<option value="BS.AS.JM">BS.AS.JM — Buenos Aires (JM, solo GER)</option>` +
    `<option value="REG">REG — Regional interior (solo GER)</option>`;

  html += `
    <div class="card" style="padding:16px 20px">
      <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Cobertura actual</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${conEscala}</div>
          <div style="font-size:11px;color:var(--t3)">Con escala asignada</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:600;color:${empleadosSinEscala.length>0?'rgb(239,68,68)':'var(--t3)'};font-family:var(--font-mono)">${empleadosSinEscala.length}</div>
          <div style="font-size:11px;color:var(--t3)">Sin mapeo en la escala</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${totalEmp}</div>
          <div style="font-size:11px;color:var(--t3)">Total empleados activos</div>
        </div>
      </div>
      ${empleadosSinEscala.length>0?`
        <details style="margin-top:14px;font-size:12px" ${empleadosSinEscala.length<=6?'open':''}>
          <summary style="cursor:pointer;color:var(--t2);user-select:none;font-weight:500">
            Ver y ajustar empleados sin mapeo (${empleadosSinEscala.length})
          </summary>
          <div style="margin-top:10px;font-size:11px;color:var(--t3);font-family:var(--font-mono);padding:0 2px 8px">
            💡 Podés asignar directamente la categoría y el tramo correctos desde acá. El cambio se guarda en el ABM y queda registrado en el historial del empleado.
          </div>
          <div style="max-height:440px;overflow-y:auto;background:var(--bg2);border-radius:var(--r);padding:6px">
            ${empleadosSinEscala.slice(0,200).map(e=>{
              const catActual = e.cat || '';
              const tramoActual = e.tramo || '';
              return `
              <div id="sinmap-row-${e.leg}" style="padding:10px 12px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr 120px 160px 90px;gap:10px;align-items:center;font-size:12px">
                <div style="min-width:0;overflow:hidden">
                  <div style="color:var(--t1);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.nom||'(sin nombre)'}</div>
                  <div style="color:var(--t3);font-family:var(--font-mono);font-size:10px;margin-top:2px">${legD(e.leg)} · ${(e.emp||'').split(' ')[0]}${e.lugar?' · '+e.lugar:''}${e.tarea?' · '+e.tarea:''}</div>
                </div>
                <select id="sinmap-cat-${e.leg}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono)">
                  <option value="">—</option>
                  ${opcionesCat.replace(`value="${catActual}"`, `value="${catActual}" selected`)}
                </select>
                <select id="sinmap-tramo-${e.leg}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono)">
                  <option value="">—</option>
                  ${opcionesTramo.replace(`value="${tramoActual}"`, `value="${tramoActual}" selected`)}
                </select>
                <button class="btn btn-primary" onclick="guardarAjusteCatTramo('${e.leg}')" style="font-size:11px;padding:5px 10px">✓ Ajustar</button>
              </div>`;
            }).join('')}
            ${empleadosSinEscala.length>200?`<div style="padding:8px;color:var(--t3);font-size:11px;text-align:center">...y ${empleadosSinEscala.length-200} más. Ajustá los de acá primero.</div>`:''}
          </div>
        </details>
      `:'<div style="margin-top:12px;font-size:12px;color:var(--green)">✓ Todos los empleados activos están mapeados a la escala.</div>'}
    </div>

    <!-- ── Adicional por título ── -->
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">🎓 Adicional por título (monto fijo paritario)</span>
          <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Se actualiza en cada paritaria junto con la escala</span>
        </div>
        <button class="btn btn-ghost" onclick="abrirEditorMontosTitulo()" style="font-size:11px;padding:4px 12px">✎ Editar montos</button>
      </div>
      <div style="padding:14px 18px;display:flex;gap:20px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Secundario</span>
          <span style="font-size:14px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${fN(escala.montos_titulo?.secundario||0)}</span>
        </div>
        <span style="color:var(--border)">·</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Terciario</span>
          <span style="font-size:14px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${fN(escala.montos_titulo?.terciario||0)}</span>
        </div>
        <span style="color:var(--border)">·</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Universitario</span>
          <span style="font-size:14px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${fN(escala.montos_titulo?.universitario||0)}</span>
        </div>
        ${!(escala.montos_titulo?.secundario||escala.montos_titulo?.terciario||escala.montos_titulo?.universitario)
          ? '<div style="font-size:11px;color:var(--t3);font-style:italic;margin-left:8px">Sin configurar — editá los montos para activar el cálculo automático en la liquidación</div>'
          : ''}
      </div>
    </div>`;

  pane.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// Ajuste inline de categoría/tramo desde la escala salarial
// ═══════════════════════════════════════════════════════════════
async function guardarAjusteCatTramo(leg){
  const selCat = document.getElementById(`sinmap-cat-${leg}`);
  const selTramo = document.getElementById(`sinmap-tramo-${leg}`);
  if(!selCat || !selTramo) return;
  const nuevoCat = (selCat.value || '').toUpperCase().trim();
  const nuevoTramo = (selTramo.value || '').toUpperCase().trim();

  if(!nuevoCat || !nuevoTramo){
    toast('⚠ Seleccioná categoría y tramo','var(--yellow)');
    return;
  }

  // Validar que la combinación exista en la escala
  const montoValida = getMontoEscala(nuevoCat, nuevoTramo);
  if(montoValida === null){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`La combinación ${nuevoCat} / ${nuevoTramo} no existe en la escala vigente.<br><br>¿Guardar igual?<br>(Podés crear la combinación en la escala después.)`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  // Obtener empleado actual de la nómina (con overrides previos aplicados)
  const empAntes = empByLeg(leg);
  if(!empAntes){ toast('⚠ Empleado no encontrado','var(--yellow)'); return; }

  // Si el cambio es nulo, no hacer nada
  if((empAntes.cat||'') === nuevoCat && (empAntes.tramo||'') === nuevoTramo){
    toast('Sin cambios — categoría y tramo ya están así','var(--t3)');
    return;
  }

  // Guardar override
  const ov = getAbmOverrides();
  const prevOv = ov[leg] || {};
  ov[leg] = { ...prevOv, cat: nuevoCat, tramo: nuevoTramo };
  saveAbmOverrides(ov);

  // Si es una alta, también actualizar el registro de alta
  const al = getAbmAltas();
  const ai = al.findIndex(e => e.leg === leg);
  if(ai >= 0){ al[ai] = { ...al[ai], cat: nuevoCat, tramo: nuevoTramo }; saveAbmAltas(al); }

  // Registrar en historial de cambios del empleado (misma lógica que el ABM completo)
  const empDespues = { ...empAntes, cat: nuevoCat, tramo: nuevoTramo };
  try {
    if(typeof registrarCambiosEmpleado === 'function'){
      await registrarCambiosEmpleado(empAntes, empDespues, {
        desde: new Date().toISOString().slice(0,10),
        motivo: 'Ajuste desde Escala Salarial',
        usuario: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'RR.HH.'
      });
    }
  } catch(e){ console.warn('No se pudo registrar en historial:', e); }

  // Feedback y refrescar UI
  const montoTxt = montoValida !== null ? ' · Básico escala: $ '+Math.round(montoValida).toLocaleString('es-AR') : '';
  toast(`✓ ${(empAntes.nom||leg).split(',')[0]} → ${nuevoCat} / ${nuevoTramo}${montoTxt}`, 'var(--green)', 3500);

  // Animación de fila que se va antes de rerenderear
  const row = document.getElementById(`sinmap-row-${leg}`);
  if(row){
    row.style.transition = 'opacity .25s, transform .25s';
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
  }
  setTimeout(()=>renderEscalaSalarial(), 280);
}

function _renderEscalaPaneHistorico(versiones){
  const pane = document.getElementById('escala-pane-hist');
  if(!pane) return;
  const fN = n => (n===null||n===undefined||isNaN(n)) ? '—' : '$ '+Math.round(n).toLocaleString('es-AR');
  const pct = p => (p*100).toFixed(1).replace('.',',')+'%';
  const t = ESCALA_TRAMOS;

  // Orden descendente por vigencia
  const ordenadas = [...versiones].reverse();
  const hoy = new Date().toISOString().slice(0,10);
  const activaId = getEscalaActiva().id;

  const alcanceLabel = a => a==='categorias' ? 'Solo categorías' : (a==='regionales' ? 'Solo regionales' : 'Todas');
  const origenBadge = v => {
    if(v.origen==='inicial') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)">SEED</span>`;
    if(v.origen==='incremento') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)">+${pct(v.porcentaje/100)}</span>`;
    return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg2);color:var(--t3);border:1px solid var(--border)">${v.origen||'—'}</span>`;
  };

  let html = `
    <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.08em">Línea de tiempo — ${versiones.length} versión${versiones.length===1?'':'es'}</div>
      <div style="flex:1"></div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Hoy: ${_fechaBonita(hoy)}</div>
    </div>`;

  if(versiones.length === 0){
    html += `<div class="card" style="padding:20px;text-align:center;color:var(--t3)">Sin versiones cargadas.</div>`;
    pane.innerHTML = html;
    return;
  }

  html += ordenadas.map(v=>{
    const esActiva = v.id === activaId;
    const borde = esActiva ? 'border:2px solid var(--accent2)' : 'border:1px solid var(--border)';
    const creadoFmt = v.creado ? new Date(v.creado).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
    return `
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;${borde}">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${origenBadge(v)}
            <div>
              <div style="font-size:13px;color:var(--t1);font-weight:600">${v.mesLabel}${esActiva?' <span style="font-size:10px;color:var(--accent2);margin-left:6px;font-family:var(--font-mono)">● ACTIVA</span>':''}</div>
              <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Vigencia desde ${_fechaBonita(v.vigencia)} · Alcance: ${alcanceLabel(v.alcance)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost" onclick="toggleVersionDetalle('${v.id}')" style="font-size:11px;padding:5px 12px" id="btn-det-${v.id}">Ver detalle</button>
            ${v.origen!=='inicial' ? `<button class="btn-blanquear" onclick="confirmarEliminarVersion('${v.id}')" style="font-size:11px;padding:5px 12px">✕ Eliminar</button>` : ''}
          </div>
        </div>
        ${v.comentario ? `<div style="padding:10px 18px;border-bottom:1px solid var(--border);font-size:12px;color:var(--t2);background:var(--bg2)"><i>"${v.comentario}"</i></div>` : ''}
        <div style="padding:8px 18px;font-size:11px;color:var(--t3);font-family:var(--font-mono);display:flex;gap:18px;flex-wrap:wrap">
          <span>Creado: ${creadoFmt}</span>
          ${v.creadoPor?`<span>Por: legajo ${v.creadoPor}</span>`:''}
          ${v.baseVersionId?`<span>Base: ${(versiones.find(x=>x.id===v.baseVersionId)?.mesLabel)||v.baseVersionId}</span>`:''}
        </div>
        <div id="det-${v.id}" style="display:none">
          <div style="overflow-x:auto;border-top:1px solid var(--border)">
            <table style="width:100%;min-width:820px;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
                  <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Categoría</th>
                  ${t.map(tr=>`<th style="padding:10px;text-align:right;font-size:10px;font-family:var(--font-mono);color:${tr.color};text-transform:uppercase;letter-spacing:.05em;font-weight:600">${tr.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${v.categorias.map((c,i)=>{
                  const rowBg = i%2===0 ? 'transparent' : 'rgba(255,255,255,.01)';
                  return `
                  <tr style="border-bottom:1px solid var(--border);background:${rowBg}">
                    <td style="padding:10px 14px">
                      <span style="font-size:10px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:var(--bg2);color:var(--t2);border:1px solid var(--border);margin-right:6px">${c.cat}</span>
                      <span style="color:var(--t1)">${c.label}</span>
                    </td>
                    ${t.map(tr=>`<td style="padding:10px;text-align:right;font-family:var(--font-mono);color:var(--t1)">${fN(c.tramos[tr.key])}</td>`).join('')}
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div style="padding:10px 18px;border-top:1px solid var(--border);background:var(--bg2);font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Gerentes regionales</div>
          <div>
            ${v.regionales.map(r=>`
              <div style="padding:10px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px">
                <div>
                  <span style="font-size:10px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:rgba(251,191,36,.1);color:rgb(251,191,36);border:1px solid rgba(251,191,36,.3);margin-right:6px">${r.key}</span>
                  <span style="color:var(--t1)">${r.label}</span>
                  <span style="font-size:10px;color:var(--t3);margin-left:6px">${r.desc}</span>
                </div>
                <div style="font-family:var(--font-mono);color:var(--t1);font-weight:500">${fN(r.monto)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
  }).join('');

  pane.innerHTML = html;
}

function toggleVersionDetalle(id){
  const det = document.getElementById('det-'+id);
  const btn = document.getElementById('btn-det-'+id);
  if(!det) return;
  const showing = det.style.display !== 'none';
  det.style.display = showing ? 'none' : 'block';
  if(btn) btn.textContent = showing ? 'Ver detalle' : 'Ocultar detalle';
}

async function confirmarEliminarVersion(id){
  const v = getEscalaVersiones().find(x=>x.id===id);
  if(!v) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar la versión "${v.mesLabel}" (${_fechaBonita(v.vigencia)})?<br><br>Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const ok = eliminarEscalaVersion(id);
  if(ok){ renderEscalaSalarial(); escalaTab('hist'); }
}

// ═══════════════════════════════════════════════════════════════
// FORMULARIO DE INCREMENTO
// ═══════════════════════════════════════════════════════════════
function abrirFormIncrementoEscala(){
  // Remover modal previo si existía
  const prev = document.getElementById('modal-incremento-escala');
  if(prev) prev.remove();

  const hoy = new Date();
  const primDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);

  const modal = document.createElement('div');
  modal.id = 'modal-incremento-escala';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⇡ Cargar incremento general</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Crea una nueva versión de la escala aplicando el porcentaje a la vigente</div>
        </div>
        <button onclick="cerrarFormIncremento()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:20px 22px;display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Porcentaje de incremento *</label>
          <div style="position:relative">
            <input type="number" id="inc-pct" step="0.01" placeholder="Ej: 7.5" oninput="previsualizarIncremento()"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 36px 10px 14px;color:var(--t1);font-size:14px;outline:none;font-family:var(--font-mono)">
            <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--t3);font-family:var(--font-mono);font-size:13px">%</span>
          </div>
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Podés usar valores negativos para correcciones (ej: -2)</div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Vigencia desde *</label>
          <input type="date" id="inc-vigencia" value="${primDia}"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t1);font-size:14px;outline:none;font-family:var(--font-mono)">
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Alcance</label>
          <select id="inc-alcance" onchange="previsualizarIncremento()"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t1);font-size:14px;outline:none">
            <option value="todas">Todas las categorías + Gerentes regionales</option>
            <option value="categorias">Solo categorías generales</option>
            <option value="regionales">Solo Gerentes regionales</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Comentario / observaciones</label>
          <textarea id="inc-comentario" rows="2" placeholder="Ej: Paritaria SEC abril 2026"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit"></textarea>
        </div>

        <div id="inc-preview" style="display:none"></div>
      </div>

      <div style="padding:16px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="cerrarFormIncremento()" style="font-size:13px;padding:8px 16px">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarIncremento()" style="font-size:13px;padding:8px 18px">Aplicar incremento</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target === modal) cerrarFormIncremento(); });
  setTimeout(()=>{ const el=document.getElementById('inc-pct'); if(el) el.focus(); }, 50);
}

function cerrarFormIncremento(){
  const m = document.getElementById('modal-incremento-escala');
  if(m) m.remove();
}

function previsualizarIncremento(){
  const pctEl = document.getElementById('inc-pct');
  const alcEl = document.getElementById('inc-alcance');
  const prev = document.getElementById('inc-preview');
  if(!pctEl || !alcEl || !prev) return;
  const pct = parseFloat(pctEl.value);
  if(isNaN(pct) || pct === 0){ prev.style.display='none'; prev.innerHTML=''; return; }

  const alcance = alcEl.value;
  const activa = getEscalaActiva();
  const factor = 1 + pct/100;
  const fN = n => '$ '+Math.round(n).toLocaleString('es-AR');

  // Muestra OP-INI, COO-SEMI, GER-SEN + un regional como sample
  const samples = [
    { label:'Operario · Inicial', monto: activa.categorias.find(c=>c.cat==='OP')?.tramos.INI, aplica: alcance!=='regionales' },
    { label:'Coordinador · Semi Senior', monto: activa.categorias.find(c=>c.cat==='COO')?.tramos.SEMI, aplica: alcance!=='regionales' },
    { label:'Gerente · Senior', monto: activa.categorias.find(c=>c.cat==='GER')?.tramos.SEN, aplica: alcance!=='regionales' },
    { label:'Gerente Reg. BsAs JM', monto: activa.regionales.find(r=>r.key==='BSAS-JM')?.monto, aplica: alcance!=='categorias' }
  ];

  prev.style.display = 'block';
  prev.innerHTML = `
    <div style="padding:12px 14px;border-radius:var(--r);background:var(--bg2);border:1px solid var(--border)">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Previsualización (4 muestras)</div>
      ${samples.map(s=>{
        if(!s.monto) return '';
        const nuevo = s.aplica ? s.monto * factor : s.monto;
        const color = s.aplica ? (pct>=0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)') : 'var(--t3)';
        const arrow = s.aplica ? (pct>=0?'↑':'↓') : '=';
        return `
          <div style="padding:5px 0;display:flex;justify-content:space-between;gap:10px;font-size:12px;font-family:var(--font-mono)">
            <span style="color:var(--t2)">${s.label}</span>
            <span><span style="color:var(--t3)">${fN(s.monto)}</span> <span style="color:${color}">${arrow}</span> <span style="color:var(--t1);font-weight:500">${fN(nuevo)}</span></span>
          </div>`;
      }).join('')}
    </div>`;
}

async function confirmarIncremento(){
  const pctEl = document.getElementById('inc-pct');
  const vigEl = document.getElementById('inc-vigencia');
  const alcEl = document.getElementById('inc-alcance');
  const comEl = document.getElementById('inc-comentario');
  if(!pctEl || !vigEl || !alcEl) return;

  const pct = parseFloat(pctEl.value);
  const vig = vigEl.value;
  const alc = alcEl.value || 'todas';
  const com = (comEl?.value || '').trim();

  if(isNaN(pct) || pct === 0){ showAlert('Ingresá un porcentaje distinto de cero.', 'warning'); pctEl.focus(); return; }
  if(!vig){ showAlert('Ingresá la fecha de vigencia.', 'warning'); vigEl.focus(); return; }

  const existentes = getEscalaVersiones();
  const duplicada = existentes.find(v => v.vigencia === vig && v.origen !== 'inicial');
  if(duplicada){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`Ya existe una versión con vigencia ${_fechaBonita(vig)} ("${duplicada.mesLabel}").<br><br>¿Querés crear otra versión igual?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  const activa = getEscalaActiva();
  if(vig < activa.vigencia){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`La fecha ${_fechaBonita(vig)} es anterior a la versión actualmente activa (${_fechaBonita(activa.vigencia)}).<br><br>Se creará igual pero la "activa" seguirá siendo la más reciente.<br><br>¿Continuar?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  aplicarIncrementoEscala(pct, vig, alc, com);
  cerrarFormIncremento();
  renderEscalaSalarial();
  escalaTab('hist');
}

// ── Constantes de estilo compartidas por los editores ─────────
const _ED_IS  = 'width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)';
const _ED_ISR = _ED_IS+';text-align:right';
const _ED_ISC = _ED_IS+';text-align:center';
// Variante para el editor inline de la tabla interna (fondo bg3 + borde accent)
const _ED_IS3  = 'width:100%;background:var(--bg3);border:1px solid rgba(61,127,255,.4);border-radius:4px;padding:5px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)';
const _ED_IS3R = _ED_IS3+';text-align:right';
const _ED_IS3C = _ED_IS3+';text-align:center';

// ── Helper: crea un modal editor estándar ─────────────────────
// Devuelve el elemento DOM ya appendado al body.
function _crearModalEditor(id, titulo, subtitulo, bodyHtml, onSaveCall, maxWidth){
  const prev = document.getElementById(id);
  if(prev) prev.remove();
  const mw = maxWidth || '640px';
  const modal = document.createElement('div');
  modal.id = id;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:${mw};width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--bg1);z-index:1">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${titulo}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${subtitulo}</div>
        </div>
        <button onclick="document.getElementById('${id}').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:18px 20px">${bodyHtml}</div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0">
        <button class="btn btn-ghost" onclick="document.getElementById('${id}').remove()" style="font-size:12px;padding:7px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="${onSaveCall}" style="font-size:12px;padding:7px 16px">✓ Guardar nueva versión</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  return modal;
}

// ── Helper: genera HTML del bloque de NR editables ────────────
function _renderNREditorHTML(nrs, pfx, iS, iSR){
  iS  = iS  || _ED_IS;
  iSR = iSR || _ED_ISR;
  if(!nrs || !nrs.length) return '<p style="font-size:11px;color:var(--t3)">Sin NR configurados.</p>';
  return nrs.map((nr,ni)=>`
    <div style="border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 140px auto;gap:8px;align-items:center">
        <input type="text"   id="${pfx}-lbl-${ni}"    value="${nr.label||''}" style="${iS}">
        <input type="number" id="${pfx}-monto-${ni}"  value="${nr.monto!=null?nr.monto:''}" step="1" style="${iSR}">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--t2);white-space:nowrap">
          <input type="checkbox" id="${pfx}-activo-${ni}" ${nr.activo?'checked':''} style="width:14px;height:14px"> Activo
        </label>
      </div>
      <input type="text" id="${pfx}-nota-${ni}" value="${nr.nota||''}" placeholder="nota"
        style="${iS};margin-top:6px;color:var(--t3);font-size:10px;border-style:dashed">
    </div>`).join('');
}

// ── Helper: lee NR editados desde el DOM ──────────────────────
function _leerNRsDesdeDOM(nrs, pfx){
  return (nrs||[]).map((nr,ni)=>({
    ...nr,
    label:  document.getElementById(`${pfx}-lbl-${ni}`)?.value    || nr.label,
    monto:  parseFloat(document.getElementById(`${pfx}-monto-${ni}`)?.value) || nr.monto,
    activo: document.getElementById(`${pfx}-activo-${ni}`)?.checked ?? nr.activo,
    nota:   document.getElementById(`${pfx}-nota-${ni}`)?.value    || nr.nota || ''
  }));
}

// ── Helper: HTML de fila vigencia + acuerdo ───────────────────
function _renderVigAcuerdoHTML(vigDef, acuerdoVal, iS){
  iS = iS || _ED_IS;
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
      <div>
        <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono);text-transform:uppercase">Vigencia nueva versión *</label>
        <input type="date" id="ed-vigencia" value="${vigDef}" style="${iS}">
      </div>
      <div>
        <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono);text-transform:uppercase">Texto del acuerdo</label>
        <input type="text" id="ed-acuerdo" value="${acuerdoVal||''}" style="${iS}">
      </div>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════
// EDITOR DE VALORES — ESCALA INTERNA
// Permite editar directamente cada valor de la tabla activa,
// creando una nueva versión con vigencia configurable.
// ═══════════════════════════════════════════════════════════════

function abrirEditorEscalaInterna(){
  const pane = document.getElementById('escala-pane-act');
  if(!pane) return;
  const escala = getEscalaActiva();
  const t = ESCALA_TRAMOS;
  const hoy = new Date();
  const primDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
  const iS = _ED_IS3; const iSR = _ED_IS3R; const iSC = _ED_IS3C;

  pane.innerHTML = `
    <div style="padding:10px 16px;background:rgba(61,127,255,.08);border:1px solid rgba(61,127,255,.3);border-radius:var(--r);margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--accent2);font-weight:500">✏ Modo edición — modificá los valores directamente</span>
      <div style="margin-left:auto;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:3px;text-transform:uppercase">Vigencia de la nueva versión *</label>
          <input type="date" id="editor-esc-vig" value="${primDia}" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:6px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:block;margin-bottom:3px;text-transform:uppercase">Comentario</label>
          <input type="text" id="editor-esc-com" placeholder="Ej: Paritaria junio 2026" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:6px 10px;color:var(--t1);font-size:12px;outline:none;min-width:220px">
        </div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px">
        <span style="font-size:13px;font-weight:600;color:var(--t1)">📊 Categorías generales</span>
        <span style="font-size:11px;color:var(--t3)">Código · Nombre · Nota opcional · % Dif. mes ant. · Valores por tramo</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;min-width:960px;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;min-width:280px">Categoría</th>
              <th style="padding:10px 8px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;width:90px">% Dif.</th>
              ${t.map(tr=>`<th style="padding:10px 8px;text-align:right;font-size:10px;font-family:var(--font-mono);color:${tr.color};text-transform:uppercase;min-width:155px">${tr.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${escala.categorias.map((c,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 12px">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <input type="text" id="ec-cod-${c.cat}" value="${c.cat}"
                    style="width:52px;${iSC};color:var(--accent2);font-weight:600">
                  <input type="text" id="ec-lbl-${c.cat}" value="${c.label}"
                    style="flex:1;${iS}">
                </div>
                <input type="text" id="ec-nota-${c.cat}" value="${c.nota||''}" placeholder="nota opcional"
                  style="width:100%;${iS};color:var(--t3);font-size:10px;border-style:dashed">
              </td>
              <td style="padding:8px;text-align:center">
                <div style="display:flex;align-items:center;gap:3px;justify-content:center">
                  <input type="number" id="ec-dif-${c.cat}" value="${(c.difMesAnt*100).toFixed(2)}" step="0.01"
                    style="width:62px;${iSC};font-size:11px">
                  <span style="font-size:10px;color:var(--t3)">%</span>
                </div>
              </td>
              ${t.map(tr=>`
              <td style="padding:8px">
                <input type="number" id="ec-val-${c.cat}-${tr.key}" value="${c.tramos[tr.key]!=null?c.tramos[tr.key]:''}" step="0.01"
                  style="${iSR};min-width:140px">
              </td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <span style="font-size:13px;font-weight:600;color:var(--t1)">🌎 Gerentes regionales</span>
      </div>
      <div style="padding:4px 0">
        ${escala.regionales.map((r,idx)=>`
        <div style="padding:12px 18px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr 170px 90px;gap:10px;align-items:center">
          <input type="text" id="er-lbl-${r.key}" value="${r.label}" style="${iS}">
          <input type="text" id="er-desc-${r.key}" value="${r.desc}" style="${iS};color:var(--t3);font-size:11px">
          <input type="number" id="er-monto-${r.key}" value="${r.monto}" step="0.01" style="${iSR}">
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" id="er-dif-${r.key}" value="${(r.difMesAnt*100).toFixed(2)}" step="0.01"
              style="width:60px;${iSC};font-size:11px">
            <span style="font-size:10px;color:var(--t3)">%</span>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;padding-bottom:16px">
      <button class="btn btn-ghost" onclick="_cancelarEditorEscala()" style="font-size:13px;padding:8px 16px">✕ Cancelar</button>
      <button class="btn btn-primary" onclick="_guardarEditorEscala()" style="font-size:13px;padding:8px 20px">✓ Guardar como nueva versión</button>
    </div>`;
}

function _cancelarEditorEscala(){
  const escala = getEscalaActiva();
  const conteo = {};
  const nomina = typeof getNomina==='function' ? getNomina().filter(e=>!e._deBaja&&!e.egreso) : [];
  nomina.forEach(e=>{ if(e.cat&&e.tramo){ const k=`${e.cat}__${e.tramo}`; conteo[k]=(conteo[k]||0)+1; }});
  _renderEscalaPaneActiva(escala, conteo, nomina);
}

async function _guardarEditorEscala(){
  const vig = document.getElementById('editor-esc-vig')?.value;
  const com = (document.getElementById('editor-esc-com')?.value||'').trim();
  if(!vig){ if(typeof showAlert==='function') showAlert('Ingresá la vigencia de la nueva versión.','warning'); return; }
  const t = ESCALA_TRAMOS;
  const activa = getEscalaActiva();
  const round2 = v => Math.round(v*100)/100;

  const categorias = activa.categorias.map(c=>{
    const cod   = (document.getElementById(`ec-cod-${c.cat}`)?.value||c.cat).trim().toUpperCase();
    const label = (document.getElementById(`ec-lbl-${c.cat}`)?.value||c.label).trim();
    const nota  = (document.getElementById(`ec-nota-${c.cat}`)?.value||'').trim();
    const dif   = parseFloat(document.getElementById(`ec-dif-${c.cat}`)?.value);
    const tramos = {};
    t.forEach(tr=>{
      const v = parseFloat(document.getElementById(`ec-val-${c.cat}-${tr.key}`)?.value);
      tramos[tr.key] = isNaN(v) ? c.tramos[tr.key] : round2(v);
    });
    return { cat:cod, label, nota, difMesAnt:isNaN(dif)?c.difMesAnt:dif/100, tramos };
  });

  const regionales = activa.regionales.map(r=>{
    const label  = (document.getElementById(`er-lbl-${r.key}`)?.value||r.label).trim();
    const desc   = (document.getElementById(`er-desc-${r.key}`)?.value||r.desc).trim();
    const monto  = parseFloat(document.getElementById(`er-monto-${r.key}`)?.value);
    const dif    = parseFloat(document.getElementById(`er-dif-${r.key}`)?.value);
    return { key:r.key, label, desc, monto:isNaN(monto)?r.monto:round2(monto), difMesAnt:isNaN(dif)?r.difMesAnt:dif/100 };
  });

  const nueva = {
    id: 'esc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
    vigencia: vig, mesLabel: _formatMesLabel(vig),
    origen: 'manual', porcentaje: null, alcance: 'todas',
    comentario: com || 'Edición manual de valores',
    creado: new Date().toISOString(),
    creadoPor: (typeof currentUser!=='undefined'&&currentUser?.emp?.leg)||null,
    baseVersionId: activa.id,
    categorias, regionales
  };
  saveEscalaVersion(nueva);
  renderEscalaSalarial();
  escalaTab('act');
  if(typeof toast==='function') toast(`✓ Nueva versión guardada — ${_formatMesLabel(vig)}`,'var(--green)',3000);
}

// ═══════════════════════════════════════════════════════════════
// EDITOR DE VALORES — UOM R.17 y COMERCIO
// Modal con edición directa de cada valor de la paritaria activa
// ═══════════════════════════════════════════════════════════════

function abrirEditorValoresUOM(){ _abrirEditorSind('uom'); }
function abrirEditorValoresCOM(){ _abrirEditorSind('com'); }

function _abrirEditorSind(sind){
  const prev = document.getElementById('modal-editor-sind');
  if(prev) prev.remove();
  const isUOM = sind==='uom';
  const act   = isUOM ? getUOMActivo() : getCOMActivo();
  const nombre = isUOM ? 'UOM – Rama 17' : 'Comercio (SEC)';
  const hoy = new Date();
  const primDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
  const iS = _ED_IS; const fN = n => n!=null ? String(n) : '';

  let camposBody = '';

  if(isUOM){
    // Jornalizado
    camposBody += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Jornalizado — valor hora ($/h)</div>`;
    camposBody += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">`;
    (act.jornalizado||[]).forEach((cat,i)=>{
      camposBody += `
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${cat.label} (${cat.cat})</label>
          <input type="number" id="ed-jor-${i}" value="${fN(cat.valorHora)}" step="0.01" style="${iS}">
        </div>`;
    });
    camposBody += `</div>`;

    // Mensualizado
    camposBody += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;margin-top:4px">Mensualizado — básico ($)</div>`;
    (act.mensualizado||[]).forEach((grp,gi)=>{
      camposBody += `<div style="font-size:10px;color:var(--t2);margin-bottom:4px;font-weight:500">Grupo ${grp.grupo} — ${grp.label}</div>`;
      camposBody += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">`;
      (grp.cats||[]).forEach((cat,ci)=>{
        camposBody += `
          <div>
            <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${cat.cat}</label>
            <input type="number" id="ed-men-${gi}-${ci}" value="${fN(cat.basico)}" step="0.01" style="${iS}">
          </div>`;
      });
      camposBody += `</div>`;
    });

    // IMGR
    camposBody += `<div style="margin-bottom:12px">
      <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono);text-transform:uppercase">IMGR ($)</label>
      <input type="number" id="ed-imgr" value="${fN(act.imgr||act.IMGR)}" step="1" style="${iS}">
    </div>`;

    // Adicionales
    camposBody += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;margin-top:4px">Adicionales — monto ($)</div>`;
    camposBody += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">`;
    (act.adicionales||[]).forEach((a,ai)=>{
      camposBody += `
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${a.art} — ${a.concepto.slice(0,30)}</label>
          <input type="number" id="ed-adic-${ai}" value="${fN(a.monto)}" step="0.01" style="${iS}">
        </div>`;
    });
    camposBody += `</div>`;

  } else {
    // Comercio — grupos de categorías
    (act.categorias||[]).forEach((grp,gi)=>{
      camposBody += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t2);font-weight:500;margin-bottom:6px;margin-top:${gi>0?'14px':'0'}">${grp.grupo} — básico ($)</div>`;
      camposBody += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">`;
      (grp.cats||[]).forEach((cat,ci)=>{
        camposBody += `
          <div>
            <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${cat.cat}</label>
            <input type="number" id="ed-cat-${gi}-${ci}" value="${fN(cat.basico)}" step="0.01" style="${iS}">
          </div>`;
      });
      camposBody += `</div>`;
    });

    // Adicionales COM
    camposBody += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;margin-top:14px">Adicionales — porcentaje (%)</div>`;
    camposBody += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">`;
    (act.adicionales||[]).forEach((a,ai)=>{
      camposBody += `
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${a.art} — ${a.concepto.slice(0,28)}</label>
          <input type="number" id="ed-adic-${ai}" value="${fN(a.pct)}" step="0.01" style="${iS}">
        </div>`;
    });
    camposBody += `</div>`;
  }

  // NR section (common)
  camposBody += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;margin-top:14px">No Remunerativos vigentes</div>`;
  camposBody += _renderNREditorHTML(act.noRemunerativos, 'ed-nr');

  camposBody += _renderVigAcuerdoHTML(primDia, act.acuerdo||'');
  _crearModalEditor('modal-editor-sind',
    `✏ Editar valores — ${nombre}`,
    `Base: ${act.mesLabel} · Los cambios crean una nueva versión`,
    camposBody, `_guardarEditorSind('${sind}')`, '640px');
}

function _guardarEditorSind(sind){
  const vig  = document.getElementById('ed-vigencia')?.value;
  if(!vig){ if(typeof showAlert==='function') showAlert('Ingresá la vigencia.','warning'); return; }
  const acuerdo = document.getElementById('ed-acuerdo')?.value||'';
  const isUOM = sind==='uom';
  const act   = isUOM ? getUOMActivo() : getCOMActivo();
  const round2 = v => Math.round(v*100)/100;

  let nueva;
  if(isUOM){
    const jornalizado = (act.jornalizado||[]).map((cat,i)=>{
      const v = parseFloat(document.getElementById(`ed-jor-${i}`)?.value);
      return { ...cat, valorHora: isNaN(v)?cat.valorHora:round2(v), ok:true };
    });
    const mensualizado = (act.mensualizado||[]).map((grp,gi)=>({
      ...grp,
      cats: (grp.cats||[]).map((cat,ci)=>{
        const v = parseFloat(document.getElementById(`ed-men-${gi}-${ci}`)?.value);
        return { ...cat, basico:isNaN(v)?cat.basico:round2(v), ok:true };
      })
    }));
    const imgr = parseFloat(document.getElementById('ed-imgr')?.value);
    const adicionales = (act.adicionales||[]).map((a,ai)=>{
      const v = parseFloat(document.getElementById(`ed-adic-${ai}`)?.value);
      return { ...a, monto:isNaN(v)?a.monto:round2(v) };
    });
    const noRemunerativos = _leerNRsDesdeDOM(act.noRemunerativos, 'ed-nr');
    nueva = { ...act, id:'uom_'+Date.now(), vigencia:vig, mesLabel:_formatMesLabel(vig),
      acuerdo, origen:'manual', jornalizado, mensualizado,
      imgr:isNaN(imgr)?act.imgr:imgr, noRemunerativos, adicionales };
    saveUOMVersion(nueva);
    document.getElementById('escala-pane-master-uom').dataset.loaded='';
    renderEscalaUOM();
  } else {
    const categorias = (act.categorias||[]).map((grp,gi)=>({
      ...grp,
      cats: (grp.cats||[]).map((cat,ci)=>{
        const v = parseFloat(document.getElementById(`ed-cat-${gi}-${ci}`)?.value);
        return { ...cat, basico:isNaN(v)?cat.basico:round2(v), ok:true };
      })
    }));
    const adicionales = (act.adicionales||[]).map((a,ai)=>{
      const v = parseFloat(document.getElementById(`ed-adic-${ai}`)?.value);
      return { ...a, pct:isNaN(v)?a.pct:round2(v) };
    });
    const noRemunerativos = _leerNRsDesdeDOM(act.noRemunerativos, 'ed-nr');
    nueva = { ...act, id:'com_'+Date.now(), vigencia:vig, mesLabel:_formatMesLabel(vig),
      acuerdo, origen:'manual', categorias, noRemunerativos, adicionales };
    saveCOMVersion(nueva);
    document.getElementById('escala-pane-master-comercio').dataset.loaded='';
    renderEscalaComercio();
  }
  document.getElementById('modal-editor-sind')?.remove();
  if(typeof toast==='function') toast(`✓ ${sind==='uom'?'UOM':'Comercio'} actualizado — ${_formatMesLabel(vig)}`,'var(--green)',3000);
}

// ═══════════════════════════════════════════════════════════════
// EDITOR DE VALORES — SINDICATOS GENÉRICOS (UOCRA, UOYEP, etc.)
// ═══════════════════════════════════════════════════════════════

function abrirEditorValoresSindGenerico(sindId){
  const prev = document.getElementById('modal-editor-sind-gen');
  if(prev) prev.remove();
  const sind = getSindById(sindId);
  if(!sind){ if(typeof toast==='function') toast('Sindicato no encontrado','var(--red)'); return; }
  const hoy = new Date();
  const primDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
  const iS = _ED_IS; const iSR = _ED_ISR; const fN = n => n!=null ? String(n) : '';

  let body = '';

  // Tablas (jornalizado/mensual)
  (sind.tablas||[]).forEach((tabla,ti)=>{
    body += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t2);font-weight:500;margin-bottom:8px;margin-top:${ti>0?'14px':'0'}">${tabla.titulo}</div>`;
    body += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">`;
    (tabla.cats||[]).forEach((cat,ci)=>{
      const esHora = tabla.tipo==='hora' || cat.valorHora!=null;
      const val = esHora ? fN(cat.valorHora) : fN(cat.basico);
      const sufijo = esHora ? '$/h' : '$/mes';
      body += `
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${cat.cat} — ${sufijo}</label>
          <input type="number" id="sg-val-${ti}-${ci}" value="${val}" step="0.01" style="${esHora?iSR:iSR}">
        </div>`;
    });
    body += `</div>`;
  });

  // NR
  body += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;margin-top:14px">No Remunerativos</div>`;
  body += _renderNREditorHTML(sind.noRemunerativos, 'sg-nr');

  // Adicionales (%)
  if((sind.adicionales||[]).length){
    body += `<div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;margin-top:14px">Adicionales (%)</div>`;
    body += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">`;
    (sind.adicionales||[]).forEach((a,ai)=>{
      body += `
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px;font-family:var(--font-mono)">${a.concepto}</label>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" id="sg-adic-${ai}" value="${fN(a.valor??a.pct)}" step="0.01" style="${iS}">
            <span style="font-size:11px;color:var(--t3)">%</span>
          </div>
        </div>`;
    });
    body += `</div>`;
  }

  body += _renderVigAcuerdoHTML(primDia, sind.acuerdo||'');
  _crearModalEditor('modal-editor-sind-gen',
    `✏ Editar valores — ${sind.icon||''} ${sind.nombre}`,
    `${sind.cct} · Los cambios guardan una nueva versión`,
    body, `_guardarEditorSindGen('${sindId}')`, '600px');
}

function _guardarEditorSindGen(sindId){
  const vig = document.getElementById('sg-vigencia')?.value;
  if(!vig){ if(typeof showAlert==='function') showAlert('Ingresá la vigencia.','warning'); return; }
  const acuerdo = document.getElementById('sg-acuerdo')?.value||'';
  const sind = getSindById(sindId);
  if(!sind) return;
  const round2 = v => Math.round(v*100)/100;

  const tablas = (sind.tablas||[]).map((tabla,ti)=>({
    ...tabla,
    cats: (tabla.cats||[]).map((cat,ci)=>{
      const v = parseFloat(document.getElementById(`sg-val-${ti}-${ci}`)?.value);
      const esHora = tabla.tipo==='hora' || cat.valorHora!=null;
      if(esHora) return { ...cat, valorHora:isNaN(v)?cat.valorHora:round2(v), ok:!isNaN(v) };
      else       return { ...cat, basico:isNaN(v)?cat.basico:round2(v),       ok:!isNaN(v) };
    })
  }));

  const noRemunerativos = _leerNRsDesdeDOM(sind.noRemunerativos, 'sg-nr');

  const adicionales = (sind.adicionales||[]).map((a,ai)=>{
    const v = parseFloat(document.getElementById(`sg-adic-${ai}`)?.value);
    return { ...a, valor:isNaN(v)?a.valor:round2(v), pct:isNaN(v)?a.pct:round2(v) };
  });

  const nueva = { ...sind, vigencia:vig, mesLabel:_formatMesLabel(vig),
    acuerdo, tablas, noRemunerativos, adicionales };

  // Guardar: si es builtin → no se puede sobrescribir el builtin, se guarda como user
  // Si ya existe como user → actualizar
  const userSinds = getSindsUser();
  const idx = userSinds.findIndex(s=>s.id===sindId);
  if(idx>=0){ userSinds[idx]=nueva; } else { userSinds.push({...nueva, builtin:false}); }
  saveSindsUser(userSinds);

  // Re-renderizar el pane
  const paneId = `escala-pane-master-sind_${sindId}`;
  const pane = document.getElementById(paneId);
  if(pane){ pane.dataset.loaded=''; renderEscalaSindGenerico(getSindById(sindId)||nueva, pane); }
  document.getElementById('modal-editor-sind-gen')?.remove();
  if(typeof toast==='function') toast(`✓ ${sind.codigo} actualizado — ${_formatMesLabel(vig)}`,'var(--green)',3000);
}

// ═══════════════════════════════════════════════════════════════
// EDITOR DE PERÍODOS — SMVM
// Edición inline de cada período existente
// ═══════════════════════════════════════════════════════════════

function abrirEditorPeriodoSMVM(mesKey){
  const data = getSMVMData();
  const idx  = data.cronograma.findIndex(r=>r.mes===mesKey);
  if(idx<0) return;
  const r    = data.cronograma[idx];
  const iS   = _ED_IS;
  const body = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px;font-family:var(--font-mono);text-transform:uppercase">Período (AAAA-MM)</label>
        <input type="month" id="smvm-ed-mes" value="${r.mes}" style="${iS}">
      </div>
      <div>
        <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px;font-family:var(--font-mono);text-transform:uppercase">Mensual ($)</label>
        <input type="number" id="smvm-ed-mensual" value="${r.mensual}" step="100" style="${iS}">
      </div>
      <div>
        <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px;font-family:var(--font-mono);text-transform:uppercase">Horario ($/h)</label>
        <input type="number" id="smvm-ed-horario" value="${r.horario}" step="1" style="${iS}">
      </div>
    </div>`;
  _crearModalEditor('modal-editor-smvm-periodo',
    `✏ Editar período SMVM — ${r.label}`, '',
    body, `_guardarEditorSMVMPeriodo('${mesKey}')`, '440px');
}

function _guardarEditorSMVMPeriodo(mesKeyAnterior){
  const mes     = document.getElementById('smvm-ed-mes')?.value;
  const mensual = parseFloat(document.getElementById('smvm-ed-mensual')?.value);
  const horario = parseFloat(document.getElementById('smvm-ed-horario')?.value);
  if(!mes||isNaN(mensual)){ if(typeof showAlert==='function') showAlert('Completá el período y el monto mensual.','warning'); return; }

  const data = getSMVMData();
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [y,m] = mes.split('-');
  const label = `${meses[parseInt(m, 10)-1]} ${y}`;

  // Eliminar el período original si el mes cambió
  data.cronograma = data.cronograma.filter(r=>r.mes!==mesKeyAnterior);
  // Eliminar también si ya existe el nuevo mes (para no duplicar)
  data.cronograma = data.cronograma.filter(r=>r.mes!==mes);
  data.cronograma.push({ mes, label, mensual, horario:isNaN(horario)?Math.round(mensual/200):horario });
  data.cronograma.sort((a,b)=>a.mes.localeCompare(b.mes));
  saveSMVMData(data);

  document.getElementById('modal-editor-smvm-periodo')?.remove();
  const smvmPane = document.getElementById('escala-pane-master-smvm');
  if(smvmPane){ smvmPane.dataset.loaded=''; renderSMVM(); }
  if(typeof toast==='function') toast(`✓ Período ${label} actualizado`,'var(--green)',2500);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN
// ═══════════════════════════════════════════════════════════════
function exportarEscalaCSV(){
  const BOM = '\ufeff';
  const esc = getEscalaActiva();
  let csv = `Escala salarial unificada — ${esc.mesLabel}\n`;
  csv += `Vigencia desde;${_fechaBonita(esc.vigencia)}\n\n`;
  csv += 'Categoria;Codigo;Nota;Dif. mes ant.;Inicial;Junior;Semi Senior;Senior\n';
  esc.categorias.forEach(c=>{
    csv += `"${c.label}";${c.cat};"${c.nota||''}";${(c.difMesAnt*100).toFixed(1).replace('.',',')}%;${c.tramos.INI};${c.tramos.JUN};${c.tramos.SEMI};${c.tramos.SEN}\n`;
  });
  csv += '\nGerentes Regionales\n';
  csv += 'Codigo;Descripcion;Dif. mes ant.;Monto\n';
  esc.regionales.forEach(r=>{
    csv += `${r.key};"${r.label} - ${r.desc}";${(r.difMesAnt*100).toFixed(1).replace('.',',')}%;${r.monto}\n`;
  });
  const blob = new Blob([BOM+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Escala_unificada_${esc.vigencia}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

function exportarEscalaXLSX(){
  const doExport = () => {
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const esc = getEscalaActiva();

    // Hoja 1: Escala vigente
    const rows = [
      [`Escala salarial unificada — ${esc.mesLabel}`,''],
      ['Vigencia desde:', _fechaBonita(esc.vigencia)],
      [],
      ['Categoría','Código','Nota','Dif. mes ant.','Inicial','Junior','Semi Senior','Senior']
    ];
    esc.categorias.forEach(c=>{
      rows.push([c.label, c.cat, c.nota||'', c.difMesAnt, c.tramos.INI, c.tramos.JUN, c.tramos.SEMI, c.tramos.SEN]);
    });
    rows.push([]);
    rows.push(['Gerentes regionales','','','','','','','']);
    rows.push(['Código','Título','Descripción','Dif. mes ant.','Monto','','','']);
    esc.regionales.forEach(r=>{
      rows.push([r.key, r.label, r.desc, r.difMesAnt, r.monto, '','','']);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:34},{wch:12},{wch:30},{wch:14},{wch:16},{wch:16},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, ws, 'Vigente');

    // Hoja 2: Histórico
    const versiones = getEscalaVersiones();
    const histRows = [
      ['Histórico de versiones de la escala unificada'],
      [],
      ['Vigencia','Mes','Origen','%','Alcance','Comentario','Creado','Por']
    ];
    versiones.forEach(v=>{
      histRows.push([
        _fechaBonita(v.vigencia),
        v.mesLabel,
        v.origen,
        v.porcentaje ?? '',
        v.alcance,
        v.comentario||'',
        v.creado ? new Date(v.creado).toLocaleString('es-AR') : '',
        v.creadoPor||''
      ]);
    });
    const wsH = XLSX.utils.aoa_to_sheet(histRows);
    wsH['!cols'] = [{wch:14},{wch:16},{wch:14},{wch:8},{wch:18},{wch:40},{wch:20},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsH, 'Histórico');

    // Hoja 3: Todas las versiones con valores
    versiones.forEach(v=>{
      const r = [
        [`${v.mesLabel} — ${_fechaBonita(v.vigencia)}`,''],
        ['Origen:', v.origen, 'Porcentaje:', v.porcentaje??'-', 'Alcance:', v.alcance],
        ['Comentario:', v.comentario||''],
        [],
        ['Categoría','Código','Inicial','Junior','Semi Senior','Senior']
      ];
      v.categorias.forEach(c=>{ r.push([c.label, c.cat, c.tramos.INI, c.tramos.JUN, c.tramos.SEMI, c.tramos.SEN]); });
      r.push([]);
      r.push(['Regionales','Descripción','Monto']);
      v.regionales.forEach(reg=>{ r.push([reg.label, reg.desc, reg.monto]); });
      const wsV = XLSX.utils.aoa_to_sheet(r);
      wsV['!cols']=[{wch:34},{wch:30},{wch:16},{wch:16},{wch:16},{wch:16}];
      // nombre de hoja: truncado y sin caracteres inválidos
      const name = (v.mesLabel || v.vigencia).replace(/[\/\\?*[\]:]/g,'').slice(0,28);
      XLSX.utils.book_append_sheet(wb, wsV, name);
    });

    XLSX.writeFile(wb, `Escala_unificada_${esc.vigencia}.xlsx`);
  };
  if(window.XLSX){ doExport(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = doExport;
  s.onerror = () => showAlert('No se pudo cargar la librería de Excel. Probá con CSV.', 'warning');
  document.head.appendChild(s);
}

async function renderEvaluacionesRRHH(){
  rrhhEvalTab('pend');
  await renderEvalPendientesRRHH();
  await actualizarBadgesEvalRRHH();
}

function _tipoLabel(tipo, anio){
  if(tipo === 'anual') return `📅 Anual ${anio||''}`.trim();
  if(tipo.startsWith('prueba_')) return `🔔 Prueba ${tipo.split('_')[1]} días`;
  return tipo;
}

async function renderEvalPendientesRRHH(){
  const div = document.getElementById('rrhh-eval-pend-list');
  if(!div) return;
  const q = (document.getElementById('rrhh-eval-pend-search')?.value||'').toLowerCase();
  const filtroTipo = document.getElementById('rrhh-eval-pend-tipo')?.value || '';

  const nomina = getNomina();
  const evals = await getEvaluaciones();
  let pendientes = evals.filter(e => e.estado === 'realizada');

  if(filtroTipo){
    if(filtroTipo === 'anual') pendientes = pendientes.filter(e=>e.tipo==='anual');
    else pendientes = pendientes.filter(e=>e.tipo===filtroTipo);
  }

  let filas = pendientes.map(ev=>{
    const emp = nomina.find(e=>e.leg===ev.leg);
    return { ev, emp };
  }).filter(r=>r.emp);

  if(q) filas = filas.filter(({emp})=>emp.nom.toLowerCase().includes(q) || emp.leg.includes(q) || (emp.emp||'').toLowerCase().includes(q));

  if(!filas.length){
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">📭 No hay evaluaciones pendientes de registrar</div>';
    return;
  }

  filas.sort((a,b)=>(a.ev.fechaRealizada||'').localeCompare(b.ev.fechaRealizada||'') || a.emp.nom.localeCompare(b.emp.nom));

  div.innerHTML = `<div style="display:grid;grid-template-columns:80px 1fr 160px 140px 140px 140px 200px;padding:8px 18px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">
    <span>Legajo</span><span>Empleado</span><span>Empresa</span><span>Tipo</span><span>Finalizada</span><span>Evaluador</span><span style="text-align:right">Acciones</span>
  </div>`+filas.map(({ev, emp})=>`
    <div style="display:grid;grid-template-columns:80px 1fr 160px 140px 140px 140px 200px;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border);gap:6px">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3)">${legD(emp.leg)}</div>
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--t1)">${emp.nom}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${emp.tarea||''}</div>
      </div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${emp.emp||'—'}</div>
      <div style="font-size:11px;color:var(--t1)">${_tipoLabel(ev.tipo, ev.anio)}</div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${fechaDDMMYYYY(ev.fechaRealizada)}</div>
      <div style="font-size:11px;color:var(--t1)">${(ev.evaluadorNom||'—').split(',')[0]}</div>
      <div style="text-align:right;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>
        <button class="btn btn-primary" style="font-size:11px;padding:3px 10px" onclick="registrarEvalRRHH(${ev.id})">✓ Registrar</button>
      </div>
    </div>`).join('');
}

async function registrarEvalRRHH(evId){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede registrar evaluaciones','var(--red)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Registrar esta evaluación en el legajo digital del empleado?<br><br>Una vez registrada, queda archivada en forma definitiva y el empleado podrá consultarla desde "Mis Datos".'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const evals = await getEvaluaciones();
  const ev = evals.find(e=>e.id===evId);
  if(!ev){ toast('⚠ Evaluación no encontrada','var(--red)'); return; }
  if(ev.estado !== 'realizada'){ toast('⚠ Solo se pueden registrar evaluaciones finalizadas por el gerente','var(--yellow)'); return; }
  ev.estado = 'registrada';
  ev.fechaRegistro = new Date().toISOString().slice(0,10);
  ev.registradoPor = currentUser?.emp?.leg || null;
  ev.registradoPorNom = currentUser?.emp?.nom || null;
  await updateEvaluacion(ev);
  toast('✓ Evaluación registrada en el legajo digital','var(--green)', 4000);
  renderEvalPendientesRRHH();
  actualizarBadgesEvalRRHH();
}

async function renderEvalHistoricoRRHH(){
  const div = document.getElementById('rrhh-eval-hist-list');
  if(!div) return;
  const q = (document.getElementById('rrhh-eval-hist-search')?.value||'').toLowerCase();
  const filtroTipo = document.getElementById('rrhh-eval-hist-tipo')?.value || '';
  const filtroEstado = document.getElementById('rrhh-eval-hist-estado')?.value || '';
  const filtroEmp = document.getElementById('rrhh-eval-hist-emp')?.value || '';

  const nomina = getNomina();
  const evals = await getEvaluaciones();

  // NO descartar filas si el empleado no está en la nómina actual.
  // Reconstruimos un empleado mínimo con el snapshot guardado en la evaluación
  // o el legajo, para que siempre se vean todas las evaluaciones históricas.
  let filas = evals.map(ev=>{
    let emp = nomina.find(e=>e.leg===ev.leg);
    if(!emp){
      emp = {
        leg: ev.leg,
        nom: ev.empNom || ev.nom || '(empleado no encontrado)',
        emp: ev.empEmpresa || ev.empresa || '—',
        lugar: ev.empLugar || '—',
        tarea: ev.empTarea || '',
        _baja: true
      };
    }
    return { ev, emp };
  });

  if(q) filas = filas.filter(({emp})=>
    (emp.nom||'').toLowerCase().includes(q) ||
    (emp.leg||'').includes(q) ||
    (emp.emp||'').toLowerCase().includes(q) ||
    (emp.lugar||emp.localidad||emp.loc||'').toLowerCase().includes(q)
  );
  if(filtroTipo){
    if(filtroTipo === 'prueba') filas = filas.filter(({ev})=>ev.tipo.startsWith('prueba_'));
    else filas = filas.filter(({ev})=>ev.tipo===filtroTipo);
  }
  if(filtroEstado) filas = filas.filter(({ev})=>ev.estado===filtroEstado);
  if(filtroEmp) filas = filas.filter(({emp})=>emp.emp===filtroEmp);

  if(!filas.length){
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Sin resultados</div>';
    return;
  }

  // Ordenar: más recientes primero (por fechaRealizada o fechaProgramada)
  filas.sort((a,b)=>{
    const fa = a.ev.fechaRealizada || a.ev.fechaProgramada || '';
    const fb = b.ev.fechaRealizada || b.ev.fechaProgramada || '';
    return fb.localeCompare(fa);
  });

  const estadoLabel = (ev)=>{
    if(ev.estado==='registrada') return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)">✓ Registrada</span>`;
    if(ev.estado==='realizada')  return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(61,127,255,.1);border:1px solid rgba(61,127,255,.3);color:var(--accent2);font-family:var(--font-mono)">📤 En RR.HH.</span>`;
    if(ev.estado==='pendiente')  return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:var(--yellow);font-family:var(--font-mono)">⏳ Pendiente gerente</span>`;
    if(ev.estado==='no_aplica')  return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(115,115,115,.1);border:1px solid rgba(115,115,115,.3);color:var(--t3);font-family:var(--font-mono)">— No aplica</span>`;
    return '';
  };

  const thSt = 'padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--bg2);position:sticky;top:0;z-index:1;white-space:nowrap';
  const tdSt = 'padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:middle;font-size:11px;color:var(--t2)';

  div.innerHTML = `<div style="width:100%;overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;table-layout:auto;min-width:1200px">
    <thead><tr>
      <th style="${thSt};width:70px">Legajo</th>
      <th style="${thSt};min-width:260px">Apellido y Nombre</th>
      <th style="${thSt};min-width:130px">Empresa</th>
      <th style="${thSt};min-width:130px">Locación</th>
      <th style="${thSt};min-width:130px">Tipo</th>
      <th style="${thSt};min-width:160px">Evaluador</th>
      <th style="${thSt};width:100px">Fecha</th>
      <th style="${thSt};width:130px">Estado</th>
      <th style="${thSt};width:80px;text-align:right">Ver</th>
    </tr></thead>
    <tbody>
    ${filas.map(({ev, emp})=>{
      const fecha = ev.estado==='registrada' ? ev.fechaRegistro : ev.fechaRealizada || ev.fechaProgramada;
      const locacion = emp.lugar || emp.localidad || emp.loc || '—';
      // Evaluador: real > esperado (del validador del empleado) > —
      let evaluadorDisplay = '—';
      let evaluadorTitle = '';
      if(ev.evaluadorNom){
        evaluadorDisplay = ev.evaluadorNom;
        evaluadorTitle = ev.evaluadorNom;
      } else if(emp.validador){
        const mgr = nomina.find(x => x.leg === emp.validador);
        if(mgr){
          evaluadorDisplay = `${mgr.nom} <span style="color:var(--t3);font-style:italic;font-size:9px">(esperado)</span>`;
          evaluadorTitle = `Evaluador esperado: ${mgr.nom}`;
        }
      }
      const bajaFlag = emp._baja
        ? ' <span style="font-size:9px;padding:1px 5px;border-radius:6px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--red);font-family:var(--font-mono);margin-left:6px">EX</span>'
        : '';
      const esc = s => (s||'').replace(/"/g,'&quot;');
      return `<tr style="${emp._baja?'opacity:.75':''}">
        <td style="${tdSt};font-family:var(--font-mono);color:var(--t3)">${emp.leg||'—'}</td>
        <td style="${tdSt}">
          <div style="font-size:12px;font-weight:500;color:var(--t1)" title="${esc(emp.nom)}">${emp.nom||'(sin nombre)'}${bajaFlag}</div>
          ${emp.tarea ? `<div style="font-size:10px;color:var(--t3);margin-top:2px" title="${esc(emp.tarea)}">${emp.tarea}</div>` : ''}
        </td>
        <td style="${tdSt};font-family:var(--font-mono);color:var(--t3);font-size:10px">${emp.emp||'—'}</td>
        <td style="${tdSt};color:var(--t3);font-size:10px">${locacion}</td>
        <td style="${tdSt};color:var(--t1)">${_tipoLabel(ev.tipo, ev.anio)}</td>
        <td style="${tdSt};color:var(--t2);font-size:11px" title="${esc(evaluadorTitle)}">${evaluadorDisplay}</td>
        <td style="${tdSt};font-family:var(--font-mono);color:var(--t3);font-size:10px;white-space:nowrap">${fechaDDMMYYYY(fecha)}</td>
        <td style="${tdSt}">${estadoLabel(ev)}</td>
        <td style="${tdSt};text-align:right">
          ${ev.datos ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>` : `<span style="font-size:10px;color:var(--t3);font-style:italic">sin datos</span>`}
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
  </div>`;
}

async function actualizarBadgesEvalRRHH(){
  if(currentUser?.role !== 'rrhh') return;
  const evals = await getEvaluaciones();
  const pendRRHH = evals.filter(e=>e.estado==='realizada').length;

  const cardBadge = document.getElementById('rrhh-badge-eval');
  if(cardBadge){
    if(pendRRHH > 0){
      cardBadge.style.display = 'inline-block';
      cardBadge.textContent = `${pendRRHH} a registrar`;
    } else cardBadge.style.display = 'none';
  }
  const pendBadge = document.getElementById('rrhh-eval-pend-badge');
  if(pendBadge){
    if(pendRRHH > 0){
      pendBadge.style.display = 'inline-block';
      pendBadge.textContent = pendRRHH;
    } else pendBadge.style.display = 'none';
  }
}

// SEEDS — UOM RAMA 17
// ═══════════════════════════════════════════════════════════════

const UOM_R17_SEED = {
  id: 'uom_r17_may2026',
  vigencia: '2026-05-01',
  mesLabel: 'Mayo 2026',
  origen: 'seed',
  cct: 'CCT 260/75 – Rama 17 (Metalmecánica · Ascensores · Fundición · Herrería · Pulvimetalurgia)',
  acuerdo: 'Disp. 207/2026 + base abr 2026 | Cámaras: ADIMRA, AFARTE, CAIAMA, FEDEHOGAR, AFAC, CAMIMA',
  imgr: 1036390,
  jornalizado: [
    { cat:'ING',    label:'Ingresante',                       valorHora: 4313.43 },
    { cat:'OPCA',   label:'Operario Calificado',              valorHora: 4672.74 },
    { cat:'MEOF',   label:'Medio Oficial',                    valorHora: 5036.08 },
    { cat:'OPESP',  label:'Operario Especializado',           valorHora: 5387.45 },
    { cat:'OPESPM', label:'Operario Especializado Múltiple',  valorHora: 5695.63 },
    { cat:'OF',     label:'Oficial',                          valorHora: 5958.84 },
    { cat:'OFM',    label:'Oficial Múltiple / Sup. CNC',      valorHora: 6418.60 },
    { cat:'OFMS',   label:'Oficial Múltiple Superior CNC',    valorHora: 6868.42 },
  ],
  mensualizado: [
    { grupo:'A', label:'Administrativos', cats:[
      { cat:'Cat. 1°', basico:833257.48,  ok:true },
      { cat:'Cat. 2°', basico:924732.49,  ok:true },
      { cat:'Cat. 3°', basico:1067759.96, ok:true },
      { cat:'Cat. 4°', basico:1166170.85, ok:true },
    ]},
    { grupo:'B', label:'Técnicos', cats:[
      { cat:'Cat. 1°', basico:833257.48,  ok:true },
      { cat:'Cat. 2°', basico:924875.28,  ok:true },
      { cat:'Cat. 3°', basico:988568.62,  ok:true },
      { cat:'Cat. 4°', basico:1121394.56, ok:true },
      { cat:'Cat. 5°', basico:1166216.35, ok:true, nota:'proporcional s/escala mar 2026' },
      { cat:'Cat. 6°', basico:1276880.99, ok:true },
    ]},
    { grupo:'C', label:'Auxiliares', cats:[
      { cat:'Cat. 1°', basico:801577.24,  ok:true },
      { cat:'Cat. 2°', basico:872359.46,  ok:true, nota:'proporcional s/escala mar 2026' },
      { cat:'Cat. 3°', basico:992754.70,  ok:true },
    ]},
  ],
  adicionales: [
    { art:'Art. 53/54', concepto:'Título técnico o secundario', monto:22836.06,  per:'mensual',    rem:true  },
    { art:'Art. 55',    concepto:'Idiomas',                     monto:12909.84,  per:'mensual',    rem:true  },
    { art:'Art. 57',    concepto:'Subsidio padres incapacitados',monto:57089.72, per:'mensual',    rem:true  },
    { art:'Art. 58',    concepto:'Fallecimiento de familiar',   monto:142723.51, per:'único',      rem:false },
    { art:'Art. 63',    concepto:'Llamada fuera de horario',    monto:3348.30,   per:'por evento', rem:true  },
    { art:'Art. 91',    concepto:'Viáticos viajante interior',  monto:37641.22,  per:'por viaje',  rem:false },
  ],
  noRemunerativos: [
    { id:'uom_nr_oct25', mes:'2025-10', label:'Octubre 2025',   monto:35000, remPct:null, activo:false },
    { id:'uom_nr_nov25', mes:'2025-11', label:'Noviembre 2025', monto:15000, remPct:4.2,  activo:false, nota:'+ 4,2% rem. sobre básicos' },
    { id:'uom_nr_dic25', mes:'2025-12', label:'Diciembre 2025', monto:35000, remPct:null, activo:false },
    { id:'uom_nr_ene26', mes:'2026-01', label:'Enero 2026',     monto:15000, remPct:4.2,  activo:false, nota:'+ 4,2% rem. sobre básicos' },
    { id:'uom_nr_feb26', mes:'2026-02', label:'Febrero 2026',   monto:25000, remPct:null, activo:false },
    { id:'uom_nr_mar26', mes:'2026-03', label:'Marzo 2026',     monto:35000, remPct:null, activo:false },
  ],
  antiguedad: { pct:1, base:'básico', nota:'1% por año, acumulativo' },
  presentismo: null,
};

const UOM_R17_SK = 'lsg_escala_uom_versiones';
function _getUOMVersionesUser(){ try{ return JSON.parse(localStorage.getItem(UOM_R17_SK)||'[]'); }catch(e){ return []; } }
function _setUOMVersionesUser(a){ localStorage.setItem(UOM_R17_SK, JSON.stringify(a)); }
function getUOMVersiones(){ return [UOM_R17_SEED, ..._getUOMVersionesUser()].sort((a,b)=>a.vigencia.localeCompare(b.vigencia)); }
function saveUOMVersion(v){ const u=_getUOMVersionesUser(); u.push(v); _setUOMVersionesUser(u); }
function eliminarUOMVersion(id){ if(id===UOM_R17_SEED.id) return false; _setUOMVersionesUser(_getUOMVersionesUser().filter(v=>v.id!==id)); return true; }
function getUOMActivo(fechaRef){
  const hoy = fechaRef||new Date().toISOString().slice(0,10);
  const ap = getUOMVersiones().filter(v=>v.vigencia<=hoy);
  return ap.length ? ap[ap.length-1] : getUOMVersiones()[0];
}

// ═══════════════════════════════════════════════════════════════
// SEEDS — COMERCIO (CCT 130/75)
// ═══════════════════════════════════════════════════════════════

const COM_SEED = {
  id: 'com_may2026',
  vigencia: '2026-05-01',
  mesLabel: 'Mayo 2026',
  origen: 'seed',
  cct: 'CCT 130/75 – Empleados de Comercio (FAECYS / SEC)',
  acuerdo: 'Acuerdo abr–jun 2026 (hom. 27/04/2026): +5% escalonado (2% abr + 1,5% may + 1,5% jun) + bono $120.000 · CAC, CAME, UDECA',
  categorias: [
    { grupo:'Maestranza', cats:[
      { cat:'Cat. A', basico:1215095, ok:true },
      { cat:'Cat. B', basico:1218163, ok:true },
      { cat:'Cat. C', basico:1222258, ok:true },
    ]},
    { grupo:'Administrativos', cats:[
      { cat:'Cat. A', basico:1226972, ok:true },
      { cat:'Cat. B', basico:1231728, ok:true },
      { cat:'Cat. C', basico:1236477, ok:true },
      { cat:'Cat. D', basico:1250732, ok:true },
      { cat:'Cat. E', basico:1262610, ok:true },
      { cat:'Cat. F', basico:1279966, ok:true },
    ]},
    { grupo:'Cajeros', cats:[
      { cat:'Cat. A', basico:1231163, ok:true },
      { cat:'Cat. B', basico:1236559, ok:true },
      { cat:'Cat. C', basico:1243613, ok:true },
    ]},
    { grupo:'Personal Auxiliar', cats:[
      { cat:'Cat. A', basico:1231163, ok:true },
      { cat:'Cat. B', basico:1238055, ok:true },
      { cat:'Cat. C', basico:1247013, ok:true },
    ]},
    { grupo:'Auxiliar Especializado', cats:[
      { cat:'Cat. A', basico:1240437, ok:true },
      { cat:'Cat. B', basico:1254950, ok:true },
    ]},
    { grupo:'Vendedores', cats:[
      { cat:'Cat. A', basico:1231163, ok:true },
      { cat:'Cat. B', basico:1254950, ok:true },
      { cat:'Cat. C', basico:1262610, ok:true },
      { cat:'Cat. D', basico:1279966, ok:true },
    ]},
  ],
  noRemunerativos: [
    { id:'com_nr_bono26', mes:'2026-04', label:'Bono extraordinario abr–jun 2026', monto:120000, activo:true,
      nota:'$100.000 prórroga + $20.000 nuevo. Abr/may/jun. En jul 2026: $20.000 se incorporan al básico.' },
  ],
  adicionales: [
    { art:'Art. 40', concepto:'Presentismo', tipo:'pct', pct:8.33, base:'básico + NR', rem:true,
      nota:'8,33% sobre básico + todos los rubros remunerativos y NR del acuerdo vigente' },
    { art:'Art. 24', concepto:'Antigüedad',  tipo:'pct', pct:1.2,  base:'básico', rem:true,
      nota:'1,20% por año de antigüedad, progresivo y acumulativo' },
  ],
};

const COM_SK = 'lsg_escala_com_versiones';
function _getCOMVersionesUser(){ try{ return JSON.parse(localStorage.getItem(COM_SK)||'[]'); }catch(e){ return []; } }
function _setCOMVersionesUser(a){ localStorage.setItem(COM_SK, JSON.stringify(a)); }
function getCOMVersiones(){ return [COM_SEED, ..._getCOMVersionesUser()].sort((a,b)=>a.vigencia.localeCompare(b.vigencia)); }
function saveCOMVersion(v){ const u=_getCOMVersionesUser(); u.push(v); _setCOMVersionesUser(u); }
function eliminarCOMVersion(id){ if(id===COM_SEED.id) return false; _setCOMVersionesUser(_getCOMVersionesUser().filter(v=>v.id!==id)); return true; }
function getCOMActivo(fechaRef){
  const hoy=fechaRef||new Date().toISOString().slice(0,10);
  const ap=getCOMVersiones().filter(v=>v.vigencia<=hoy);
  return ap.length ? ap[ap.length-1] : getCOMVersiones()[0];
}

// ═══════════════════════════════════════════════════════════════
// SEEDS — S.M.V.M.
// ═══════════════════════════════════════════════════════════════

const SMVM_SEED = {
  norma: 'Resolución 9/2025 del Consejo Nacional del Empleo, la Productividad y el SMVM',
  cronograma: [
    { mes:'2025-11', label:'Nov 2025', mensual:328400, horario:1642 },
    { mes:'2025-12', label:'Dic 2025', mensual:334800, horario:1674 },
    { mes:'2026-01', label:'Ene 2026', mensual:341000, horario:1705 },
    { mes:'2026-02', label:'Feb 2026', mensual:346800, horario:1734 },
    { mes:'2026-03', label:'Mar 2026', mensual:352400, horario:1762 },
    { mes:'2026-04', label:'Abr 2026', mensual:357800, horario:1789 },
    { mes:'2026-05', label:'May 2026', mensual:363000, horario:1815 },
    { mes:'2026-06', label:'Jun 2026', mensual:367800, horario:1839 },
    { mes:'2026-07', label:'Jul 2026', mensual:372400, horario:1862 },
    { mes:'2026-08', label:'Ago 2026', mensual:376600, horario:1883 },
  ],
};

const SMVM_USER_SK = 'lsg_smvm_user';
function getSMVMData(){
  try{ const u=JSON.parse(localStorage.getItem(SMVM_USER_SK)||'null'); return u||SMVM_SEED; }catch(e){ return SMVM_SEED; }
}
function saveSMVMData(d){ localStorage.setItem(SMVM_USER_SK, JSON.stringify(d)); }

function getSMVMActual(fechaRef){
  const hoy = (fechaRef || new Date().toISOString()).slice(0,7); // acepta YYYY-MM o ISO full
  const rows=[...getSMVMData().cronograma].sort((a,b)=>b.mes.localeCompare(a.mes));
  return rows.find(r=>r.mes<=hoy) || rows[rows.length-1];
}

function syncSMVMaLiquidaciones(mensual){
  if(typeof getLiqParams!=='function'||typeof saveLiqParams!=='function') return false;
  const p=getLiqParams();
  p.smvmMensual=mensual;
  saveLiqParams(p);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// RENDER — UOM RAMA 17
// ═══════════════════════════════════════════════════════════════

function renderEscalaUOM(){
  const pane=document.getElementById('escala-pane-master-uom');
  if(!pane) return;
  const fN=n=>(n===null||n===undefined||isNaN(n))
    ? '<span style="color:var(--t3);font-size:10px">— ver planilla</span>'
    : '$ '+Math.round(n).toLocaleString('es-AR');
  const fH=n=>'$ '+n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const act=getUOMActivo();
  const vers=getUOMVersiones();

  let html=`
    <div class="card" style="padding:16px 20px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">⚙️ UOM – ${act.cct}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:2px">Vigencia activa: <b style="color:var(--t2)">${act.mesLabel}</b> (${_fechaBonita(act.vigencia)}) · ${vers.length} versión${vers.length===1?'':'es'}</div>
        <div style="font-size:10px;color:var(--t3)">${act.acuerdo}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="abrirModalActualizarSindicato('uom')" style="font-size:12px;padding:6px 14px;white-space:nowrap">⇡ Cargar paritaria</button>
        <button class="btn btn-ghost" onclick="abrirEditorValoresUOM()" style="font-size:12px;padding:6px 14px;white-space:nowrap">✏ Editar valores</button>
      </div>
    </div>

    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">
      <button id="uom-tab-jor" onclick="uomTab('jor')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:600;color:var(--t1);border-bottom:2px solid var(--accent2);margin-bottom:-2px">📋 Jornalizado</button>
      <button id="uom-tab-men" onclick="uomTab('men')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📁 Mensualizado</button>
      <button id="uom-tab-adic" onclick="uomTab('adic')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">➕ Adicionales</button>
      <button id="uom-tab-nr" onclick="uomTab('nr')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📦 No Remunerativos</button>
      <button id="uom-tab-hist" onclick="uomTab('hist')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📜 Historial (${vers.length})</button>
    </div>

    <div id="uom-pane-jor">
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">Personal Jornalizado</span>
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">CCT 260/75 · valor por hora · jornal = valor × 8hs</span>
        </div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;min-width:280px">Categoría</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(59,130,246);text-transform:uppercase">Valor hora</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(34,197,94);text-transform:uppercase">Jornal (×8hs)</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(251,191,36);text-transform:uppercase">Mensual (×200hs)</th>
          </tr></thead>
          <tbody>
            ${act.jornalizado.map((c,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:11px 14px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:9px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:var(--bg2);color:var(--t3);border:1px solid var(--border)">${c.cat}</span>
                  <span style="color:var(--t1);font-weight:500">${c.label}</span>
                </div>
              </td>
              <td style="padding:11px 12px;text-align:right;font-family:var(--font-mono);color:rgb(59,130,246);font-weight:600">${fH(c.valorHora)}</td>
              <td style="padding:11px 12px;text-align:right;font-family:var(--font-mono);color:rgb(34,197,94)">${fH(c.valorHora*8)}</td>
              <td style="padding:11px 12px;text-align:right;font-family:var(--font-mono);color:rgb(251,191,36)">$ ${Math.round(c.valorHora*200).toLocaleString('es-AR')}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
        <div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2);font-size:11px;color:var(--t3);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>IMGR (piso garantizado, incl. NR, excl. HE): <b style="color:var(--t2);font-family:var(--font-mono)">$ ${act.imgr.toLocaleString('es-AR')}</b></span>
          <span>Antigüedad: <b style="color:var(--t2)">${act.antiguedad?.nota||'1% anual/básico'}</b></span>
        </div>
      </div>
    </div>

    <div id="uom-pane-men" style="display:none">
      ${act.mensualizado.map(g=>`
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">Grupo ${g.grupo} — ${g.label}</span>
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:10px">sueldo básico mensual</span>
        </div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Categoría</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Básico mensual</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Valor hora equiv.</th>
          </tr></thead>
          <tbody>
            ${g.cats.map((c,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px;color:var(--t1)">${c.cat}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${c.ok?'var(--t1)':'var(--t3)'};font-weight:${c.ok?'500':'400'}">${c.ok&&c.basico ? '$ '+Math.round(c.basico).toLocaleString('es-AR') : '<span style="font-size:10px;font-style:italic">ver planilla oficial</span>'}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:var(--t3);font-size:11px">${c.ok&&c.basico ? '$ '+(c.basico/200).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`).join('')}
      <div style="font-size:11px;color:var(--t3);padding:6px 2px">⚠ Las categorías intermedias sin valor se completan desde la planilla oficial de ADIMRA/UOM. Podés actualizarlas usando "Cargar paritaria".</div>
    </div>

    <div id="uom-pane-adic" style="display:none">
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">Adicionales del CCT 260/75</span>
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:10px">vigentes · mayo 2026</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Artículo</th>
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;min-width:220px">Concepto</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Monto vigente</th>
            <th style="padding:9px 10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Periodicidad</th>
            <th style="padding:9px 10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Tipo</th>
          </tr></thead>
          <tbody>
            ${act.adicionales.map((a,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px;font-size:10px;font-family:var(--font-mono);color:var(--t3)">${a.art}</td>
              <td style="padding:10px 14px;color:var(--t1);font-weight:500">${a.concepto}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:var(--t1);font-weight:600">$ ${a.monto.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              <td style="padding:10px 10px;text-align:center;font-size:11px;color:var(--t3)">${a.per}</td>
              <td style="padding:10px 10px;text-align:center">
                <span style="font-size:9px;padding:2px 8px;border-radius:10px;${a.rem?'background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)':'background:rgba(251,191,36,.1);color:rgb(251,191,36);border:1px solid rgba(251,191,36,.3)'}">
                  ${a.rem?'REM':'NR'}
                </span>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="uom-pane-nr" style="display:none">
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span style="font-size:12px;font-weight:600;color:var(--t1)">Conceptos No Remunerativos (NR)</span>
            <div style="font-size:10px;color:var(--t3);margin-top:2px">Cronograma del acuerdo oct 2025 – abr 2026 · No inciden en aportes previsionales (sí en sindicales)</div>
          </div>
          <button class="btn btn-ghost" onclick="abrirModalActualizarSindicato('uom','nr')" style="font-size:11px;padding:5px 12px">+ Agregar NR</button>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Período</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Suma NR</th>
            <th style="padding:9px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">% Rem. adjunto</th>
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Nota</th>
          </tr></thead>
          <tbody>
            ${act.noRemunerativos.map((r,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px">
                <span style="color:var(--t1);font-weight:500">${r.label}</span>
                ${r.activo?'<span style="font-size:9px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3);margin-left:6px">VIGENTE</span>':''}
              </td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(251,191,36);font-weight:600">$ ${r.monto.toLocaleString('es-AR')}</td>
              <td style="padding:10px 12px;text-align:center;font-family:var(--font-mono);color:${r.remPct?'rgb(34,197,94)':'var(--t3)'}">${r.remPct?'+'+r.remPct+'%':'—'}</td>
              <td style="padding:10px 14px;font-size:11px;color:var(--t3)">${r.nota||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:11px;color:var(--t3);padding:4px 2px">
        💡 Para sincronizar el NR vigente con la liquidación: actualizá el campo <b>Asignaciones NR → UOM</b> en el módulo de Parámetros de Liquidación.
      </div>
    </div>

    <div id="uom-pane-hist" style="display:none">
      ${_renderHistorialSindicato(vers, 'uom')}
    </div>`;

  pane.innerHTML = html;
}

function uomTab(which){
  ['jor','men','adic','nr','hist'].forEach(t=>{
    const b=document.getElementById(`uom-tab-${t}`);
    const p=document.getElementById(`uom-pane-${t}`);
    const on=t===which;
    if(b){ b.style.fontWeight=on?'600':'400'; b.style.color=on?'var(--t1)':'var(--t3)'; b.style.borderBottom=on?'2px solid var(--accent2)':'2px solid transparent'; }
    if(p) p.style.display=on?'block':'none';
  });
  const masterPane=document.getElementById('escala-pane-master-uom');
  if(masterPane&&masterPane.dataset.loaded) renderLiqSyncCard('uom',masterPane);
}

// ═══════════════════════════════════════════════════════════════
// RENDER — COMERCIO (CCT 130/75)
// ═══════════════════════════════════════════════════════════════

function renderEscalaComercio(){
  const pane=document.getElementById('escala-pane-master-comercio');
  if(!pane) return;
  const act=getCOMActivo();
  const vers=getCOMVersiones();

  let html=`
    <div class="card" style="padding:16px 20px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">🛒 ${act.cct}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:2px">Vigencia activa: <b style="color:var(--t2)">${act.mesLabel}</b> (${_fechaBonita(act.vigencia)}) · ${vers.length} versión${vers.length===1?'':'es'}</div>
        <div style="font-size:10px;color:var(--t3)">${act.acuerdo}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="abrirModalActualizarSindicato('com')" style="font-size:12px;padding:6px 14px;white-space:nowrap">⇡ Cargar paritaria</button>
        <button class="btn btn-ghost" onclick="abrirEditorValoresCOM()" style="font-size:12px;padding:6px 14px;white-space:nowrap">✏ Editar valores</button>
      </div>
    </div>

    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">
      <button id="com-tab-bas" onclick="comTab('bas')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:600;color:var(--t1);border-bottom:2px solid var(--accent2);margin-bottom:-2px">📋 Sueldos básicos</button>
      <button id="com-tab-adic" onclick="comTab('adic')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">➕ Adicionales</button>
      <button id="com-tab-nr" onclick="comTab('nr')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📦 No Remunerativos</button>
      <button id="com-tab-hist" onclick="comTab('hist')" style="background:none;border:none;padding:9px 16px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📜 Historial (${vers.length})</button>
    </div>

    <div id="com-pane-bas">
      ${act.categorias.map(g=>`
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">${g.grupo}</span>
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:10px">sueldo básico mensual · jornada legal 48hs</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Categoría</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Básico</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(34,197,94);text-transform:uppercase">+ Presentismo (8,33%)</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(251,191,36);text-transform:uppercase">+ Bono NR $120k</th>
          </tr></thead>
          <tbody>
            ${g.cats.map((c,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px;color:var(--t1)">${c.cat}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${c.ok&&c.basico?'var(--t1)':'var(--t3)'};font-weight:${c.ok&&c.basico?'600':'400'}">
                ${c.ok&&c.basico ? '$ '+Math.round(c.basico).toLocaleString('es-AR') : '<span style="font-size:10px;font-style:italic">ver planilla oficial</span>'}
              </td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(34,197,94);font-size:11px">
                ${c.ok&&c.basico ? '$ '+Math.round(c.basico*0.0833).toLocaleString('es-AR') : '—'}
              </td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(251,191,36);font-size:11px">
                ${c.ok&&c.basico ? '$ '+Math.round(c.basico + c.basico*0.0833 + 120000).toLocaleString('es-AR') : '—'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`).join('')}
      <div style="font-size:11px;color:var(--t3);padding:4px 2px">⚠ El presentismo y la antigüedad se calculan también sobre los NR del acuerdo vigente (Art. 40 CCT 130/75). Las categorías intermedias sin valor se completan desde la planilla oficial de FAECYS.</div>
    </div>

    <div id="com-pane-adic" style="display:none">
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">Adicionales del CCT 130/75</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Artículo</th>
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Concepto</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Valor</th>
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Base de cálculo</th>
          </tr></thead>
          <tbody>
            ${act.adicionales.map((a,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px;font-size:10px;font-family:var(--font-mono);color:var(--t3)">${a.art}</td>
              <td style="padding:10px 14px;color:var(--t1);font-weight:500">${a.concepto}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(34,197,94);font-weight:600">${a.pct}%</td>
              <td style="padding:10px 14px;font-size:11px;color:var(--t3)">${a.nota}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="com-pane-nr" style="display:none">
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span style="font-size:12px;font-weight:600;color:var(--t1)">Conceptos No Remunerativos (NR)</span>
            <div style="font-size:10px;color:var(--t3);margin-top:2px">Acuerdo abr–jun 2026 · Los NR inciden en presentismo y antigüedad</div>
          </div>
          <button class="btn btn-ghost" onclick="abrirModalActualizarSindicato('com','nr')" style="font-size:11px;padding:5px 12px">+ Agregar NR</button>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Concepto</th>
            <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Monto</th>
            <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Nota</th>
          </tr></thead>
          <tbody>
            ${act.noRemunerativos.map((r,i)=>`
            <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px">
                <span style="color:var(--t1);font-weight:500">${r.label}</span>
                ${r.activo?'<span style="font-size:9px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3);margin-left:6px">VIGENTE</span>':''}
              </td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(251,191,36);font-weight:600">$ ${r.monto.toLocaleString('es-AR')}</td>
              <td style="padding:10px 14px;font-size:11px;color:var(--t3)">${r.nota||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="com-pane-hist" style="display:none">
      ${_renderHistorialSindicato(vers, 'com')}
    </div>`;

  pane.innerHTML = html;
}

function comTab(which){
  ['bas','adic','nr','hist'].forEach(t=>{
    const b=document.getElementById(`com-tab-${t}`);
    const p=document.getElementById(`com-pane-${t}`);
    const on=t===which;
    if(b){ b.style.fontWeight=on?'600':'400'; b.style.color=on?'var(--t1)':'var(--t3)'; b.style.borderBottom=on?'2px solid var(--accent2)':'2px solid transparent'; }
    if(p) p.style.display=on?'block':'none';
  });
  const masterPane=document.getElementById('escala-pane-master-comercio');
  if(masterPane&&masterPane.dataset.loaded) renderLiqSyncCard('comercio',masterPane);
}

// ═══════════════════════════════════════════════════════════════
// RENDER — S.M.V.M.
// ═══════════════════════════════════════════════════════════════

function renderSMVM(){
  const pane=document.getElementById('escala-pane-master-smvm');
  if(!pane) return;
  const data=getSMVMData();
  const actual=getSMVMActual();
  const hoy=new Date().toISOString().slice(0,7);
  const smvmEnLiq=(typeof getLiqParams==='function') ? (getLiqParams().smvmMensual||0) : 0;
  // Con el fix, la liquidación siempre lee desde getSMVMActual() directamente,
  // por lo que el valor en liqParams ya no es la fuente de verdad.
  const sincronizado = smvmEnLiq===actual.mensual;

  pane.innerHTML=`
    <div class="card" style="padding:16px 20px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">💰 Salario Mínimo, Vital y Móvil</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:2px">${data.norma}</div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:10px">
          <div>
            <div style="font-size:11px;color:var(--t3);margin-bottom:2px">Valor vigente (${actual.label})</div>
            <div style="font-size:26px;font-weight:700;color:var(--t1);font-family:var(--font-mono)">$ ${actual.mensual.toLocaleString('es-AR')}</div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">horario: $ ${actual.horario.toLocaleString('es-AR')}/hora</div>
          </div>
          <div style="border-left:1px solid var(--border);padding-left:16px">
            <div style="font-size:11px;color:var(--t3);margin-bottom:4px">En módulo de Liquidaciones</div>
            <div style="font-size:13px;font-weight:600;font-family:var(--font-mono);color:rgb(34,197,94)">
              ✓ Automático
            </div>
            <div style="font-size:10px;color:var(--t3)">
              Siempre toma el valor del período liquidado
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-ghost" onclick="abrirModalNuevoPeriodoSMVM()" style="font-size:12px;padding:6px 14px">+ Agregar período</button>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
      <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <span style="font-size:12px;font-weight:600;color:var(--t1)">Cronograma vigente</span>
        <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:10px">Res. 9/2025 · nov 2025 – ago 2026</span>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
          <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Período</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Mensual</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Horario</th>
          <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Var. s/ ant.</th>
          <th style="padding:9px 10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Estado</th>
          <th style="padding:9px 8px;text-align:center;width:40px"></th>
        </tr></thead>
        <tbody>
          ${data.cronograma.map((r,i)=>{
            const esActual=r.mes===actual.mes;
            const esFuturo=r.mes>hoy;
            const prev=i>0?data.cronograma[i-1]:null;
            const varPct=prev ? ((r.mensual/prev.mensual-1)*100).toFixed(1) : null;
            return `
            <tr style="border-bottom:1px solid var(--border);background:${esActual?'rgba(61,127,255,.07)':i%2?'rgba(255,255,255,.01)':'transparent'}">
              <td style="padding:10px 14px;font-weight:${esActual?'600':'400'};color:${esActual?'var(--t1)':'var(--t2)'}">${r.label}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${esActual?'var(--accent2)':'var(--t1)'};font-weight:${esActual?'700':'500'}">$ ${r.mensual.toLocaleString('es-AR')}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:var(--t3);font-size:11px">$ ${r.horario.toLocaleString('es-AR')}</td>
              <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);font-size:11px;color:rgb(34,197,94)">${varPct?'+'+varPct+'%':'—'}</td>
              <td style="padding:10px 10px;text-align:center">
                ${esActual?'<span style="font-size:9px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(61,127,255,.1);color:var(--accent2);border:1px solid rgba(61,127,255,.3)">● ACTUAL</span>':esFuturo?'<span style="font-size:9px;color:var(--t3)">próximo</span>':'<span style="font-size:9px;color:var(--t3)">histórico</span>'}
              </td>
              <td style="padding:8px 10px;text-align:center">
                <button onclick="abrirEditorPeriodoSMVM('${r.mes}')" style="background:none;border:1px solid var(--border);border-radius:4px;padding:3px 8px;color:var(--t3);font-size:10px;cursor:pointer">✏</button>
              </td>
            </tr>`; }).join('')}
        </tbody>
      </table></div>
      <div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2);font-size:11px;color:var(--t3)">
        Incremento total previsto: <b style="color:var(--t2)">+16,8%</b> entre nov 2025 y ago 2026 · Valor final agosto 2026: <b style="color:var(--t2)">$ 376.600</b>
      </div>
    </div>`;
}

function sincronizarSMVM(){
  const actual=getSMVMActual();
  const anteriorVal=_getLiqDeep('smvmMensual');
  const ok=syncSMVMaLiquidaciones(actual.mensual);
  if(ok){
    _pushLiqSyncHist({ ts:new Date().toISOString(), sindId:'smvm', sindLabel:'S.M.V.M.',
      campo:'SMVM mensual', liqPath:'smvmMensual',
      valorAnterior:anteriorVal, valorNuevo:actual.mensual,
      operador:(typeof currentUser!=='undefined'&&currentUser?.emp?.leg)||null,
      operadorNom:(typeof currentUser!=='undefined'&&currentUser?.emp?.nom)||null });
    if(typeof toast==='function') toast(`✓ SMVM sincronizado: $ ${actual.mensual.toLocaleString('es-AR')} → módulo de liquidaciones`,'var(--green)',3500);
    renderSMVM();
    document.getElementById('escala-pane-master-smvm').dataset.loaded='1';
  } else {
    if(typeof showAlert==='function') showAlert('No se pudo acceder al módulo de liquidaciones.','warning');
  }
}

function abrirModalNuevoPeriodoSMVM(){
  const prev=document.getElementById('modal-smvm-periodo');
  if(prev) prev.remove();
  const modal=document.createElement('div');
  modal.id='modal-smvm-periodo';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML=`
    <div class="card" style="padding:0;max-width:460px;width:100%;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">+ Agregar período SMVM</div>
        <button onclick="document.getElementById('modal-smvm-periodo').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Período (AAAA-MM) *</label>
          <input type="month" id="smvm-new-mes" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Valor mensual ($) *</label>
          <input type="number" id="smvm-new-mensual" placeholder="Ej: 363000" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Valor horario ($)</label>
          <input type="number" id="smvm-new-horario" placeholder="Ej: 1815" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Norma (opcional)</label>
          <input type="text" id="smvm-new-norma" placeholder="Ej: Resolución X/2026" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-smvm-periodo').remove()" style="font-size:12px;padding:7px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarNuevoPeriodoSMVM()" style="font-size:12px;padding:7px 16px">Guardar período</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

function confirmarNuevoPeriodoSMVM(){
  const mes=(document.getElementById('smvm-new-mes')?.value||'').trim();
  const mensual=parseFloat(document.getElementById('smvm-new-mensual')?.value||'');
  const horario=parseFloat(document.getElementById('smvm-new-horario')?.value||'') || null;
  if(!mes||isNaN(mensual)||mensual<=0){ if(typeof showAlert==='function') showAlert('Completá el período y el valor mensual.','warning'); return; }
  const data=getSMVMData();
  const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [anio,m]=mes.split('-');
  const label=`${meses[parseInt(m, 10)-1]} ${anio}`;
  const idx=data.cronograma.findIndex(r=>r.mes===mes);
  if(idx>=0) data.cronograma[idx]={ mes, label, mensual, horario: horario||data.cronograma[idx].horario };
  else data.cronograma.push({ mes, label, mensual, horario: horario||0 });
  data.cronograma.sort((a,b)=>a.mes.localeCompare(b.mes));
  saveSMVMData(data);
  document.getElementById('modal-smvm-periodo')?.remove();
  renderSMVM();
  document.getElementById('escala-pane-master-smvm').dataset.loaded='1';
  if(typeof toast==='function') toast(`✓ Período ${label} guardado — $ ${mensual.toLocaleString('es-AR')}`,'var(--green)',3000);
}

// ═══════════════════════════════════════════════════════════════
// MODAL ACTUALIZACIÓN DE PARITARIA (UOM / COM)
// ═══════════════════════════════════════════════════════════════

function abrirModalActualizarSindicato(sind, tabDefault){
  const prev=document.getElementById('modal-actualizar-sind');
  if(prev) prev.remove();
  const isUOM=sind==='uom';
  const act=isUOM?getUOMActivo():getCOMActivo();
  const nombre=isUOM?'UOM – Rama 17':'Comercio (SEC)';
  const hoy=new Date();
  const primDia=new Date(hoy.getFullYear(),hoy.getMonth(),1).toISOString().slice(0,10);

  const modal=document.createElement('div');
  modal.id='modal-actualizar-sind';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML=`
    <div class="card" style="padding:0;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⇡ Nueva paritaria — ${nombre}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Base actual: <b>${act.mesLabel}</b> (${_fechaBonita(act.vigencia)})</div>
        </div>
        <button onclick="document.getElementById('modal-actualizar-sind').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>

      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Tipo de actualización *</label>
          <select id="sind-tipo" onchange="previsualizarActualizacion('${sind}')"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="pct_basico">Incremento % sobre sueldos básicos</option>
            <option value="monto_basico">Suma fija a sueldos básicos</option>
            <option value="nr_mensual">Suma No Remunerativa mensual (nueva)</option>
            <option value="nr_update">Actualizar NR vigente (cambiar monto)</option>
          </select>
        </div>

        <div id="sind-row-pct">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Porcentaje *</label>
          <div style="position:relative">
            <input type="number" id="sind-pct" step="0.01" placeholder="Ej: 7.5" oninput="previsualizarActualizacion('${sind}')"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 36px 9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--t3);font-family:var(--font-mono);font-size:13px">%</span>
          </div>
        </div>

        <div id="sind-row-monto" style="display:none">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Monto ($) *</label>
          <input type="number" id="sind-monto" step="1" placeholder="Ej: 30000" oninput="previsualizarActualizacion('${sind}')"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>

        <div id="sind-row-nr-label" style="display:none">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Descripción del NR *</label>
          <input type="text" id="sind-nr-label" placeholder="Ej: Agosto 2026"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Vigencia desde *</label>
          <input type="date" id="sind-vigencia" value="${primDia}"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Acuerdo / observaciones</label>
          <textarea id="sind-comentario" rows="2" placeholder="Ej: Paritaria UOM junio 2026"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:12px;outline:none;resize:vertical;font-family:inherit"></textarea>
        </div>

        <div id="sind-preview" style="display:none"></div>
      </div>

      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-actualizar-sind').remove()" style="font-size:12px;padding:7px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarActualizacionSindicato('${sind}')" style="font-size:12px;padding:7px 16px">Aplicar actualización</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

function previsualizarActualizacion(sind){
  const tipo=document.getElementById('sind-tipo')?.value||'pct_basico';
  const pctEl=document.getElementById('sind-pct');
  const montoEl=document.getElementById('sind-monto');
  const prev=document.getElementById('sind-preview');
  const rowPct=document.getElementById('sind-row-pct');
  const rowMonto=document.getElementById('sind-row-monto');
  const rowNrLabel=document.getElementById('sind-row-nr-label');

  // Mostrar/ocultar campos según tipo
  rowPct.style.display=(tipo==='pct_basico')?'block':'none';
  rowMonto.style.display=(tipo!=='pct_basico')?'block':'none';
  rowNrLabel.style.display=(tipo==='nr_mensual')?'block':'none';
  if(!prev) return;

  if(tipo==='pct_basico'){
    const pct=parseFloat(pctEl?.value||'');
    if(isNaN(pct)||pct===0){ prev.style.display='none'; return; }
    const act=sind==='uom'?getUOMActivo():getCOMActivo();
    const factor=1+pct/100;
    const fN=n=>n?'$ '+Math.round(n).toLocaleString('es-AR'):'—';
    // Muestra 2-3 muestras representativas
    let samples=[];
    if(sind==='uom'){
      samples=[
        { label:'Ingresante (hora)', antes: act.jornalizado[0].valorHora, despues: act.jornalizado[0].valorHora*factor, isHora:true },
        { label:'Oficial (hora)',    antes: act.jornalizado[5].valorHora, despues: act.jornalizado[5].valorHora*factor, isHora:true },
      ];
      const grpA=act.mensualizado[0].cats;
      const cat1=grpA.find(c=>c.basico);
      if(cat1) samples.push({ label:'Adm. Grupo A · Cat. 1°', antes:cat1.basico, despues:cat1.basico*factor });
    } else {
      const grp0=act.categorias[0].cats;
      const c0=grp0.find(c=>c.basico);
      const grp1=act.categorias[1].cats;
      const c1=grp1.find(c=>c.basico);
      if(c0) samples.push({ label:`${act.categorias[0].grupo} · ${c0.cat}`, antes:c0.basico, despues:c0.basico*factor });
      if(c1) samples.push({ label:`${act.categorias[1].grupo} · ${c1.cat}`, antes:c1.basico, despues:c1.basico*factor });
    }
    const color=pct>=0?'rgb(34,197,94)':'rgb(239,68,68)';
    const arrow=pct>=0?'↑':'↓';
    prev.style.display='block';
    prev.innerHTML=`<div style="padding:10px 12px;border-radius:var(--r);background:var(--bg2);border:1px solid var(--border)">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:8px">Previsualización (${pct>0?'+':''}${pct}%)</div>
      ${samples.map(s=>{
        const aF=s.isHora ? '$ '+s.antes.toFixed(2) : '$ '+Math.round(s.antes).toLocaleString('es-AR');
        const dF=s.isHora ? '$ '+s.despues.toFixed(2) : '$ '+Math.round(s.despues).toLocaleString('es-AR');
        return `<div style="padding:4px 0;display:flex;justify-content:space-between;font-size:12px;font-family:var(--font-mono)">
          <span style="color:var(--t2)">${s.label}</span>
          <span style="color:var(--t3)">${aF} <span style="color:${color}">${arrow}</span> <b style="color:var(--t1)">${dF}</b></span>
        </div>`;}).join('')}
    </div>`;
  } else {
    prev.style.display='none';
  }
}

async function confirmarActualizacionSindicato(sind){
  const tipo=document.getElementById('sind-tipo')?.value||'pct_basico';
  const vigencia=(document.getElementById('sind-vigencia')?.value||'').slice(0,10);
  const comentario=(document.getElementById('sind-comentario')?.value||'').trim();
  const pct=parseFloat(document.getElementById('sind-pct')?.value||'');
  const monto=parseFloat(document.getElementById('sind-monto')?.value||'');
  const nrLabel=(document.getElementById('sind-nr-label')?.value||'').trim();

  if(!vigencia){ if(typeof showAlert==='function') showAlert('Ingresá la fecha de vigencia.','warning'); return; }
  if(tipo==='pct_basico' && (isNaN(pct)||pct===0)){ if(typeof showAlert==='function') showAlert('Ingresá el porcentaje.','warning'); return; }
  if(tipo!=='pct_basico' && (isNaN(monto)||monto<=0)){ if(typeof showAlert==='function') showAlert('Ingresá el monto.','warning'); return; }
  if(tipo==='nr_mensual' && !nrLabel){ if(typeof showAlert==='function') showAlert('Ingresá la descripción del NR.','warning'); return; }

  const isUOM=sind==='uom';
  const actBase=isUOM?getUOMActivo():getCOMActivo();
  const round2=v=>Math.round(v*100)/100;
  const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const p=vigencia.split('-');
  const mesLabel=`${meses[parseInt(p[1], 10)-1]} ${p[0]}`;

  const nuevoId=sind+'_'+ Date.now()+'_'+Math.random().toString(36).slice(2,7);

  if(tipo==='pct_basico'){
    const factor=1+pct/100;
    if(isUOM){
      const nueva={
        ...JSON.parse(JSON.stringify(actBase)),
        id:nuevoId, vigencia, mesLabel, origen:'incremento', porcentaje:pct, comentario,
        acuerdo: comentario||actBase.acuerdo,
        jornalizado: actBase.jornalizado.map(c=>({...c, valorHora:round2(c.valorHora*factor)})),
        mensualizado: actBase.mensualizado.map(g=>({...g, cats:g.cats.map(c=>({...c, basico:c.basico?round2(c.basico*factor):null}))})),
      };
      saveUOMVersion(nueva);
    } else {
      const nueva={
        ...JSON.parse(JSON.stringify(actBase)),
        id:nuevoId, vigencia, mesLabel, origen:'incremento', porcentaje:pct, comentario,
        acuerdo: comentario||actBase.acuerdo,
        categorias: actBase.categorias.map(g=>({...g, cats:g.cats.map(c=>({...c, basico:c.basico?round2(c.basico*factor):null}))})),
      };
      saveCOMVersion(nueva);
    }
  } else if(tipo==='monto_basico'){
    if(isUOM){
      const nueva={
        ...JSON.parse(JSON.stringify(actBase)),
        id:nuevoId, vigencia, mesLabel, origen:'suma_fija', comentario,
        acuerdo: comentario||actBase.acuerdo,
        jornalizado: actBase.jornalizado.map(c=>{
          const jornalDia=c.valorHora*8;
          const nuevaJornal=jornalDia+monto;
          return {...c, valorHora:round2(nuevaJornal/8)};
        }),
        mensualizado: actBase.mensualizado.map(g=>({...g, cats:g.cats.map(c=>({...c, basico:c.basico?round2(c.basico+monto):null}))})),
      };
      saveUOMVersion(nueva);
    } else {
      const nueva={
        ...JSON.parse(JSON.stringify(actBase)),
        id:nuevoId, vigencia, mesLabel, origen:'suma_fija', comentario,
        acuerdo: comentario||actBase.acuerdo,
        categorias: actBase.categorias.map(g=>({...g, cats:g.cats.map(c=>({...c, basico:c.basico?round2(c.basico+monto):null}))})),
      };
      saveCOMVersion(nueva);
    }
  } else if(tipo==='nr_mensual'||tipo==='nr_update'){
    // Solo agrega/actualiza el NR en la versión activa sin crear nueva versión de básicos
    const dataCopy=JSON.parse(JSON.stringify(actBase));
    const nrId=sind+'_nr_'+Date.now();
    const newNR={ id:nrId, mes:vigencia.slice(0,7), label:nrLabel||`NR ${mesLabel}`, monto:Math.round(monto), activo:true, nota:comentario };
    // Marcar anteriores como inactivos
    dataCopy.noRemunerativos.forEach(r=>r.activo=false);
    dataCopy.noRemunerativos.push(newNR);
    dataCopy.id=nuevoId; dataCopy.vigencia=vigencia; dataCopy.mesLabel=mesLabel; dataCopy.comentario=comentario;
    if(isUOM) saveUOMVersion(dataCopy);
    else saveCOMVersion(dataCopy);
  }

  document.getElementById('modal-actualizar-sind')?.remove();
  if(typeof toast==='function') toast(`✓ Paritaria ${sind.toUpperCase()} registrada — vigencia ${mesLabel}`,'var(--green)',3500);

  // Re-render del tab correspondiente
  if(sind==='uom'){ renderEscalaUOM(); document.getElementById('escala-pane-master-uom').dataset.loaded='1'; }
  else { renderEscalaComercio(); document.getElementById('escala-pane-master-comercio').dataset.loaded='1'; }
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Historial compartido (UOM / COM)
// ═══════════════════════════════════════════════════════════════

function _renderHistorialSindicato(versiones, sind){
  if(!versiones.length) return '<div class="card" style="padding:20px;text-align:center;color:var(--t3)">Sin versiones.</div>';
  const hoy=new Date().toISOString().slice(0,10);
  const activaId=sind==='uom'?getUOMActivo().id:getCOMActivo().id;
  const fN=n=>n?'$ '+Math.round(n).toLocaleString('es-AR'):'—';
  const origenBadge=v=>{
    if(v.origen==='seed') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)">SEED</span>`;
    if(v.origen==='incremento') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)">+${v.porcentaje}%</span>`;
    if(v.origen==='suma_fija') return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(59,130,246,.1);color:rgb(59,130,246);border:1px solid rgba(59,130,246,.3)">Suma fija</span>`;
    return `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg2);color:var(--t3);border:1px solid var(--border)">${v.origen}</span>`;
  };
  const seedId=sind==='uom'?UOM_R17_SEED.id:COM_SEED.id;

  return [...versiones].reverse().map(v=>{
    const esActiva=v.id===activaId;
    const borde=esActiva?'border:2px solid var(--accent2)':'border:1px solid var(--border)';
    return `<div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;${borde}">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          ${origenBadge(v)}
          <div>
            <span style="font-size:13px;color:var(--t1);font-weight:600">${v.mesLabel}</span>
            ${esActiva?'<span style="font-size:10px;color:var(--accent2);margin-left:6px;font-family:var(--font-mono)">● ACTIVA</span>':''}
            <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">Vigencia: ${_fechaBonita(v.vigencia)}</div>
          </div>
        </div>
        ${v.origen!=='seed'?`<button class="btn-blanquear" onclick="confirmarEliminarVersionSind('${v.id}','${sind}')" style="font-size:11px;padding:4px 10px">✕ Eliminar</button>`:''}
      </div>
      ${v.comentario?`<div style="padding:8px 16px;font-size:11px;color:var(--t2);border-bottom:1px solid var(--border)"><i>${v.comentario}</i></div>`:''}
      <div style="padding:8px 16px;font-size:11px;color:var(--t3);font-family:var(--font-mono)">Acuerdo: ${v.acuerdo||'—'}</div>
    </div>`;}).join('');
}

async function confirmarEliminarVersionSind(id, sind){
  const vers=sind==='uom'?getUOMVersiones():getCOMVersiones();
  const v=vers.find(x=>x.id===id);
  if(!v) return;
  const _cfm=await showConfirm({ titulo:'Eliminar versión', mensaje:`¿Eliminar la versión <b>${v.mesLabel}</b> del historial?<br><br>Esta acción no se puede deshacer.`, labelOk:'Eliminar', peligroso:true });
  if(!_cfm) return;
  const ok=sind==='uom'?eliminarUOMVersion(id):eliminarCOMVersion(id);
  if(ok){
    if(sind==='uom'){ renderEscalaUOM(); document.getElementById('escala-pane-master-uom').dataset.loaded='1'; uomTab('hist'); }
    else { renderEscalaComercio(); document.getElementById('escala-pane-master-comercio').dataset.loaded='1'; comTab('hist'); }
  }
}


// ═══════════════════════════════════════════════════════════════
// SISTEMA GENÉRICO DE SINDICATOS — UOCRA, UECARA, ASIMRA, UOYEP
// + posibilidad de cargar nuevos sindicatos
// ═══════════════════════════════════════════════════════════════

const SINDS_GENERICOS_SK = 'lsg_sinds_user';

const SINDS_BUILTINS = [
  {
    id:'uocra', builtin:true, codigo:'UOCRA', icon:'🏗️',
    nombre:'Unión Obrera de la Construcción de la República Argentina',
    cct:'CCT 76/75 y 577/10', vigencia:'2026-05-01', mesLabel:'Mayo 2026',
    acuerdo:'Acuerdo mar–may 2026: +2%+1,9%+1,8% acumulativos | CAMARCO y FAEC',
    tablas:[{
      titulo:'Personal de Obra — Jornalizado (valor hora, Zona A)',
      subtitulo:'Zona A: CABA, BsAs, Santa Fe, Córdoba, Mendoza, Salta, Tucumán, Corrientes, Jujuy y más',
      tipo:'hora',
      cats:[
        { cat:'Oficial Especializado', valorHora:6011,   ok:true },
        { cat:'Oficial',              valorHora:5142,   ok:true },
        { cat:'Medio Oficial',        valorHora:4752,   ok:true },
        { cat:'Ayudante',             valorHora:4375,   ok:true,  nota:'calculado proporcional (ratio Jan 2026 vs Oficial Esp)' },
        { cat:'Sereno (mensual)',      basico:808877,    ok:true,  nota:'valor mensual Zona A — equiv. ~$4.044/h (800h)' },
      ]
    }],
    noRemunerativos:[
      { id:'uocra_nr_may26_oe', mes:'2026-05', label:'NR Oficial Especializado Zona A', monto:125400, activo:true },
      { id:'uocra_nr_may26_of', mes:'2026-05', label:'NR Oficial Zona A',               monto:114400, activo:true },
      { id:'uocra_nr_may26_mo', mes:'2026-05', label:'NR Medio Oficial Zona A',         monto:104900, activo:true },
      { id:'uocra_nr_may26_ay', mes:'2026-05', label:'NR Ayudante / Sereno Zona A',     monto:98500,  activo:true, nota:'Zonas B/C/Austral aplican coeficiente adicional' },
    ],
    adicionales:[
      { concepto:'Zona B (Neuquén, Río Negro, Chubut)',       tipo:'pct', valor:11,  base:'básico Zona A', rem:true,  nota:'coeficiente aproximado +11%' },
      { concepto:'Zona C (Santa Cruz)',                       tipo:'pct', valor:38,  base:'básico Zona A', rem:true,  nota:'coeficiente aproximado +38%' },
      { concepto:'Zona C Austral (Tierra del Fuego)',         tipo:'pct', valor:100, base:'básico Zona A', rem:true,  nota:'coeficiente ~×2' },
      { concepto:'Aporte solidario extraordinario (no afil.)',tipo:'pct', valor:2,   base:'remuneración',  rem:false, nota:'Desde abr 2026, 12 meses. Afiliados exentos.' },
    ],
    antiguedad:{ pct:1, nota:'1% por año acumulativo' },
  },
  {
    id:'uecara', builtin:true, codigo:'UECARA', icon:'🏛️',
    nombre:'Unión Empleados de la Construcción y Afines de la República Argentina',
    cct:'CCT 660/13 (Nacional) — CCT 735/15 (Córdoba)',
    vigencia:'2026-05-01', mesLabel:'Mayo 2026',
    acuerdo:'Acuerdo mar–may 2026: +2%+1,9%+1,8% acum. (~5,78%) + NR por cat. y zona | CAMARCO y FAEC',
    tablas:[{
      titulo:'Grupos del CCT 660/13',
      subtitulo:'Personal administrativo, técnico, capataces y maestranza de constructoras — montos ver planilla oficial',
      tipo:'mensual',
      cats:[
        { cat:'Grupo I — Capataces de Obra', basico:null, ok:false, nota:'ver planilla UECARA vigente' },
        { cat:'Grupo II — Administrativos',  basico:null, ok:false, nota:'ver planilla UECARA vigente' },
        { cat:'Grupo III — Técnicos',        basico:null, ok:false, nota:'ver planilla UECARA vigente' },
        { cat:'Grupo IV — Sistemas',         basico:null, ok:false, nota:'ver planilla UECARA vigente' },
        { cat:'Grupo V — Maestranza',        basico:null, ok:false, nota:'ver planilla UECARA vigente' },
      ]
    }],
    noRemunerativos:[
      { id:'uecara_nr_may26', mes:'2026-05', label:'NR mayo 2026 (por categoría y zona)', monto:null, activo:true,
        nota:'Monto variable por grupo y zona (Norte / Centro / Norpatagonia / Patagonia Sur). Ver planilla oficial.' },
    ],
    adicionales:[
      { concepto:'Aporte solidario extraordinario (no afil.)', tipo:'pct', valor:1.5, base:'salarios sujetos a aportes', rem:false, nota:'Desde abr 2026, 6 meses. Afiliados exentos.' },
    ],
    antiguedad:{ pct:1, nota:'1% por año acumulativo' },
  },
  {
    id:'asimra', builtin:true, codigo:'ASIMRA', icon:'🔩',
    nombre:'Asoc. de Supervisores de la Industria Metalmecánica (ASIMRA)',
    cct:'CCT 246/94 Rama 16 · CCTs 233/94, 237/94, 247/95, 248/95, 249/95, 251/95–253/95, 266/95, 275/75',
    vigencia:'2026-04-01', mesLabel:'Abril 2026',
    acuerdo:'Acuerdo sep 2025–mar 2026: 4,2% nov + 4,2% ene (14% acum.) + NR 6 cuotas | ADIMRA, AFARTE, CAJAMA, FEDEHOGAR, AFAC, CAMIMA',
    tablas:[{
      titulo:'Supervisores — CCT 246/94 Rama 16 (Mecánica y Electrónica)',
      subtitulo:'Categoría de referencia del acuerdo. Resto de categorías y ramas: ajuste proporcional.',
      tipo:'mensual',
      cats:[
        { cat:'Supervisor de Fábrica de 1° (ref. Rama 16)', basico:1112823, ok:true, nota:'Desde 1/4/2026. Base de cálculo del acuerdo.' },
        { cat:'Demás categorías por Rama',                  basico:null,    ok:false, nota:'Ajuste proporcional — ver planilla ADIMRA/ASIMRA por Rama' },
      ]
    }],
    noRemunerativos:[
      { id:'asimra_nr_oct25', mes:'2025-10', label:'Gratif. NR oct 2025',  monto:43050, activo:false },
      { id:'asimra_nr_nov25', mes:'2025-11', label:'Gratif. NR nov 2025',  monto:18450, activo:false },
      { id:'asimra_nr_dic25', mes:'2025-12', label:'Gratif. NR dic 2025',  monto:43050, activo:false },
      { id:'asimra_nr_ene26', mes:'2026-01', label:'Gratif. NR ene 2026',  monto:18450, activo:false },
      { id:'asimra_nr_feb26', mes:'2026-02', label:'Gratif. NR feb 2026',  monto:30750, activo:false },
      { id:'asimra_nr_mar26', mes:'2026-03', label:'Gratif. NR mar 2026',  monto:43050, activo:false, nota:'Última cuota del acuerdo sep 2025–mar 2026' },
    ],
    adicionales:[
      { concepto:'Cuota sindical ASIMRA', tipo:'pct', valor:3, base:'remuneración bruta', rem:false, nota:'Aprox. 3% — verificar % vigente en tu seccional' },
    ],
    antiguedad:{ pct:1, nota:'1% por año acumulativo' },
  },
  {
    id:'uoyep', builtin:true, codigo:'UOYEP', icon:'🏭',
    nombre:'Unión Obreros y Empleados Plásticos (UOYEP)',
    cct:'CCT 797/22',
    vigencia:'2026-05-01', mesLabel:'Mayo 2026',
    acuerdo:'Acuerdo mar–ago 2026: +16,83% total en 6 meses + NR $80.000 (mayo) | CAIP',
    tablas:[
      {
        titulo:'Producción y Mantenimiento (jornalizado, por hora)',
        subtitulo:'CCT 797/22 — Operarios de planta, jornada legal',
        tipo:'hora',
        cats:[
          { cat:'Operario',                valorHora:5859.82,  ok:true },
          { cat:'Auxiliar',                valorHora:6318.52,  ok:true },
          { cat:'Operador',                valorHora:6799.49,  ok:true },
          { cat:'Operador Calificado',     valorHora:7103.66,  ok:true },
          { cat:'Operador Especializado',  valorHora:7400.74,  ok:true },
          { cat:'Oficial Especializado',   valorHora:8213.79,  ok:true },
        ]
      },
      {
        titulo:'Personal Administrativo (mensual)',
        subtitulo:'Categorías administrativas del CCT 797/22',
        tipo:'mensual',
        cats:[
          { cat:'Nivel 1 (inicial)', basico:null, ok:false, nota:'consultar planilla oficial UOYEP/CAIP para mayo 2026' },
          { cat:'Nivel máximo',      basico:null, ok:false, nota:'consultar planilla oficial UOYEP/CAIP para mayo 2026' },
        ]
      }
    ],
    noRemunerativos:[
      { id:'uoyep_nr_may26', mes:'2026-05', label:'NR todas las categorías — mayo 2026',
        monto:80000, activo:true, nota:'$80.000 fija para todas las categorías. Vigencia: mayo 2026 (confirmar cronograma completo mar–ago 2026).' },
    ],
    adicionales:[
      { concepto:'Presentismo',  tipo:'pct', valor:0, base:'básico', rem:true,  nota:'Verificar % vigente en CCT 797/22' },
      { concepto:'Antigüedad',   tipo:'pct', valor:1, base:'básico', rem:true,  nota:'1% por año acumulativo' },
    ],
    antiguedad:{ pct:1, nota:'1% por año acumulativo' },
  },
];

function getSindsUser(){ try{ return JSON.parse(localStorage.getItem(SINDS_GENERICOS_SK)||'[]'); }catch(e){ return []; } }
function saveSindsUser(arr){ localStorage.setItem(SINDS_GENERICOS_SK, JSON.stringify(arr)); }
function getAllSindGenericos(){ return [...SINDS_BUILTINS, ...getSindsUser()]; }
function getSindById(id){ return getAllSindGenericos().find(s=>s.id===id)||null; }

// Historial por sindicato genérico
function getSindHist(id){ try{ return JSON.parse(localStorage.getItem(`lsg_sinh_${id}`)||'[]'); }catch(e){ return []; } }
function saveSindHist(id, arr){ localStorage.setItem(`lsg_sinh_${id}`, JSON.stringify(arr)); }
function pushSindHist(id, entry){ const h=getSindHist(id); h.push(entry); saveSindHist(id, h); }

// ── Nueva renderEscalaSalarial con tabs dinámicos ──────────────
function renderEscalaSalarial(){
  const cont=document.getElementById('escala-content');
  if(!cont) return;
  const genericos=getAllSindGenericos();
  const tabs=[
    { id:'interna',   label:'🏢 Escala interna' },
    { id:'uom',       label:'⚙️ UOM R.17' },
    { id:'comercio',  label:'🛒 Comercio' },
    ...genericos.map(s=>({ id:`sind_${s.id}`, label:`${s.icon||'🔧'} ${s.codigo}` })),
    { id:'smvm',      label:'💰 SMVM' },
    { id:'__nuevo__', label:'＋ Nuevo' },
  ];
  cont.innerHTML=`
    <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border);flex-wrap:wrap;overflow-x:auto" id="escala-master-tabbar">
      ${tabs.map((t,i)=>`
        <button id="escala-mtab-${t.id}" onclick="escalaMasterTab('${t.id}')"
          style="background:none;border:none;padding:9px 15px;cursor:pointer;font-size:12px;white-space:nowrap;
                 font-weight:${i===0?'600':'400'};color:${i===0?'var(--t1)':t.id==='__nuevo__'?'var(--accent2)':'var(--t3)'};
                 border-bottom:2px solid ${i===0?'var(--accent2)':'transparent'};margin-bottom:-2px">
          ${t.label}
        </button>`).join('')}
    </div>
    <div id="escala-pane-master-interna"></div>
    <div id="escala-pane-master-uom"      style="display:none"></div>
    <div id="escala-pane-master-comercio" style="display:none"></div>
    ${genericos.map(s=>`<div id="escala-pane-master-sind_${s.id}" style="display:none"></div>`).join('')}
    <div id="escala-pane-master-smvm"     style="display:none"></div>`;
  _renderEscalaInternaEnPaneMaster();
}

// ── Render genérico de sindicato ───────────────────────────────
function renderEscalaSindGenerico(sind, paneEl){
  const pane=paneEl||document.getElementById(`escala-pane-master-sind_${sind.id}`);
  if(!pane) return;
  const fN=n=>(n===null||n===undefined||isNaN(n))
    ?'<span style="font-size:10px;font-style:italic;color:var(--t3)">ver planilla</span>'
    :'$ '+Math.round(n).toLocaleString('es-AR');
  const fH=n=>'$ '+n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const hist=getSindHist(sind.id);
  const isUser=!sind.builtin;

  const subTabs=['cat','adic','nr','hist'];
  let html=`
    <div class="card" style="padding:14px 18px;margin-bottom:14px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:2px">${sind.icon||'🔧'} ${sind.nombre}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-bottom:2px">${sind.cct}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Vigencia: <b style="color:var(--t2)">${sind.mesLabel}</b> (${_fechaBonita(sind.vigencia)})</div>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">${sind.acuerdo}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="abrirModalActualizarSindGenerico('${sind.id}')" style="font-size:11px;padding:5px 12px;white-space:nowrap">⇡ Cargar paritaria</button>
        <button class="btn btn-ghost" onclick="abrirEditorValoresSindGenerico('${sind.id}')" style="font-size:11px;padding:5px 12px;white-space:nowrap">✏ Editar valores</button>
        ${isUser?`<button class="btn-blanquear" onclick="confirmarEliminarSindUser('${sind.id}')" style="font-size:11px;padding:5px 12px">✕ Eliminar</button>`:''}
      </div>
    </div>

    <div style="display:flex;gap:0;margin-bottom:14px;border-bottom:2px solid var(--border)">
      <button id="sg-${sind.id}-tab-cat"  onclick="sgTab('${sind.id}','cat')"  style="background:none;border:none;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:600;color:var(--t1);border-bottom:2px solid var(--accent2);margin-bottom:-2px">📋 Categorías</button>
      <button id="sg-${sind.id}-tab-adic" onclick="sgTab('${sind.id}','adic')" style="background:none;border:none;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">➕ Adicionales</button>
      <button id="sg-${sind.id}-tab-nr"   onclick="sgTab('${sind.id}','nr')"   style="background:none;border:none;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📦 No Rem.</button>
      <button id="sg-${sind.id}-tab-hist" onclick="sgTab('${sind.id}','hist')" style="background:none;border:none;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:400;color:var(--t3);border-bottom:2px solid transparent;margin-bottom:-2px">📜 Historial (${hist.length})</button>
    </div>

    <div id="sg-${sind.id}-pane-cat">
      ${(sind.tablas||[]).map(tabla=>`
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
          <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
            <span style="font-size:12px;font-weight:600;color:var(--t1)">${tabla.titulo}</span>
            ${tabla.subtitulo?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${tabla.subtitulo}</div>`:''}
          </div>
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;min-width:260px">Categoría</th>
              ${tabla.tipo==='hora'
                ? `<th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(59,130,246);text-transform:uppercase">Valor hora</th>
                   <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(34,197,94);text-transform:uppercase">Jornal (×8hs)</th>
                   <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(251,191,36);text-transform:uppercase">Mensual (×200hs)</th>`
                : `<th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Básico mensual</th>`
              }
              <th style="padding:9px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Nota</th>
            </tr></thead>
            <tbody>
              ${tabla.cats.map((c,i)=>`
              <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
                <td style="padding:10px 14px;color:var(--t1);font-weight:500">${c.cat}</td>
                ${tabla.tipo==='hora'
                  ? `<td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${c.ok&&c.valorHora?'rgb(59,130,246)':'var(--t3)'};font-weight:600">${c.valorHora?fH(c.valorHora):'—'}</td>
                     <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(34,197,94);font-size:11px">${c.valorHora?fH(c.valorHora*8):'—'}</td>
                     <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(251,191,36);font-size:11px">${c.valorHora?'$ '+Math.round(c.valorHora*200).toLocaleString('es-AR'):(c.basico?fN(c.basico)+'<span style="font-size:9px;color:var(--t3);margin-left:3px">mensual</span>':'—')}</td>`
                  : `<td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${c.ok&&c.basico?'var(--t1)':'var(--t3)'};font-weight:${c.ok?'600':'400'}">${c.ok&&c.basico?fN(c.basico):'<span style="font-size:10px;font-style:italic">ver planilla</span>'}</td>`
                }
                <td style="padding:10px 12px;font-size:10px;color:var(--t3)">${c.nota||''}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`).join('')}
      ${sind.antiguedad?`<div style="font-size:11px;color:var(--t3);padding:2px 2px">Antigüedad: ${sind.antiguedad.nota}</div>`:''}
    </div>

    <div id="sg-${sind.id}-pane-adic" style="display:none">
      ${(sind.adicionales||[]).length===0
        ? `<div class="card" style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin adicionales definidos.</div>`
        : `<div class="card" style="padding:0;overflow:hidden">
            <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)">
              <span style="font-size:12px;font-weight:600;color:var(--t1)">Adicionales y descuentos</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;min-width:220px">Concepto</th>
                <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Valor</th>
                <th style="padding:9px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Base</th>
                <th style="padding:9px 10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Tipo</th>
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Nota</th>
              </tr></thead>
              <tbody>
                ${sind.adicionales.map((a,i)=>`
                <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
                  <td style="padding:10px 14px;color:var(--t1);font-weight:500">${a.concepto}</td>
                  <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:${a.tipo==='pct'?'rgb(34,197,94)':'var(--t1)'};font-weight:600">${a.tipo==='pct'?a.valor+'%':'$ '+a.valor.toLocaleString('es-AR')}</td>
                  <td style="padding:10px 12px;font-size:11px;color:var(--t3)">${a.base||'—'}</td>
                  <td style="padding:10px 10px;text-align:center">
                    <span style="font-size:9px;padding:2px 7px;border-radius:10px;${a.rem?'background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)':'background:rgba(251,191,36,.1);color:rgb(251,191,36);border:1px solid rgba(251,191,36,.3)'}">
                      ${a.rem?'REM':'NR'}
                    </span>
                  </td>
                  <td style="padding:10px 14px;font-size:10px;color:var(--t3)">${a.nota||''}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
    </div>

    <div id="sg-${sind.id}-pane-nr" style="display:none">
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <span style="font-size:12px;font-weight:600;color:var(--t1)">Conceptos No Remunerativos</span>
          <button class="btn btn-ghost" onclick="abrirModalActualizarSindGenerico('${sind.id}','nr')" style="font-size:11px;padding:4px 10px">+ Agregar NR</button>
        </div>
        ${(sind.noRemunerativos||[]).length===0
          ? `<div style="padding:16px;text-align:center;font-size:12px;color:var(--t3)">Sin NR registrados.</div>`
          : `<table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Concepto</th>
                <th style="padding:9px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Monto</th>
                <th style="padding:9px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Nota</th>
              </tr></thead>
              <tbody>
                ${sind.noRemunerativos.map((r,i)=>`
                <tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
                  <td style="padding:10px 14px">
                    <span style="color:var(--t1);font-weight:500">${r.label}</span>
                    ${r.activo?'<span style="font-size:9px;font-family:var(--font-mono);padding:1px 6px;border-radius:8px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3);margin-left:6px">VIGENTE</span>':''}
                    <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:1px">${r.mes||''}</div>
                  </td>
                  <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:rgb(251,191,36);font-weight:600">${r.monto?'$ '+r.monto.toLocaleString('es-AR'):'(variable)'}</td>
                  <td style="padding:10px 14px;font-size:10px;color:var(--t3)">${r.nota||'—'}</td>
                </tr>`).join('')}
              </tbody>
            </table>`}
      </div>
    </div>

    <div id="sg-${sind.id}-pane-hist" style="display:none">
      ${hist.length===0
        ? `<div class="card" style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin actualizaciones registradas todavía.</div>`
        : [...hist].reverse().map(h=>`
          <div class="card" style="padding:14px 18px;margin-bottom:10px;border:1px solid var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
              <div>
                <span style="font-size:13px;font-weight:600;color:var(--t1)">${h.mesLabel}</span>
                <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:8px">${_fechaBonita(h.vigencia)}</span>
                <div style="font-size:11px;color:var(--t3);margin-top:3px">${h.descripcion||'—'}</div>
              </div>
              <div style="font-family:var(--font-mono);font-size:13px;color:${h.tipo==='pct'?'rgb(34,197,94)':'rgb(59,130,246)'};font-weight:600">
                ${h.tipo==='pct'?(h.valor>0?'+':'')+h.valor+'%':'$ '+Math.round(h.valor).toLocaleString('es-AR')+' fijo'}
              </div>
            </div>
          </div>`).join('')}
    </div>`;

  pane.innerHTML=html;
}

function sgTab(id, which){
  ['cat','adic','nr','hist'].forEach(t=>{
    const b=document.getElementById(`sg-${id}-tab-${t}`);
    const p=document.getElementById(`sg-${id}-pane-${t}`);
    const on=t===which;
    if(b){ b.style.fontWeight=on?'600':'400'; b.style.color=on?'var(--t1)':'var(--t3)'; b.style.borderBottom=on?'2px solid var(--accent2)':'2px solid transparent'; }
    if(p) p.style.display=on?'block':'none';
  });
}

// ── Modal actualización genérico ───────────────────────────────
function abrirModalActualizarSindGenerico(id, tabDefault){
  const sind=getSindById(id);
  if(!sind) return;
  const prev=document.getElementById('modal-upd-sind-gen');
  if(prev) prev.remove();
  const hoy=new Date();
  const primDia=new Date(hoy.getFullYear(),hoy.getMonth(),1).toISOString().slice(0,10);
  const modal=document.createElement('div');
  modal.id='modal-upd-sind-gen';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML=`
    <div class="card" style="padding:0;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1)">⇡ Cargar paritaria — ${sind.icon} ${sind.codigo}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Vigencia actual: <b>${sind.mesLabel}</b></div>
        </div>
        <button onclick="document.getElementById('modal-upd-sind-gen').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:13px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Tipo de actualización</label>
          <select id="upd-gen-tipo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none"
            onchange="document.getElementById('upd-gen-row-pct').style.display=this.value==='pct'?'block':'none';document.getElementById('upd-gen-row-monto').style.display=this.value!=='pct'?'block':'none';">
            <option value="pct">Incremento % sobre básicos</option>
            <option value="fijo">Suma fija a básicos</option>
            <option value="nr">Suma No Remunerativa mensual (nueva)</option>
          </select>
        </div>
        <div id="upd-gen-row-pct">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Porcentaje *</label>
          <div style="position:relative">
            <input type="number" id="upd-gen-pct" step="0.01" placeholder="Ej: 5.8"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 34px 8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--t3);font-family:var(--font-mono)">%</span>
          </div>
        </div>
        <div id="upd-gen-row-monto" style="display:none">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Monto ($) *</label>
          <input type="number" id="upd-gen-monto" step="1" placeholder="Ej: 65000"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Vigencia desde *</label>
          <input type="date" id="upd-gen-vigencia" value="${primDia}"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Descripción / acuerdo *</label>
          <input type="text" id="upd-gen-desc" placeholder="Ej: Paritaria UOCRA junio 2026"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
      </div>
      <div style="padding:12px 18px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-upd-sind-gen').remove()" style="font-size:12px;padding:7px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarActualizacionSindGenerico('${id}')" style="font-size:12px;padding:7px 16px">Registrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

function confirmarActualizacionSindGenerico(id){
  const tipo=document.getElementById('upd-gen-tipo')?.value||'pct';
  const pct=parseFloat(document.getElementById('upd-gen-pct')?.value||'');
  const monto=parseFloat(document.getElementById('upd-gen-monto')?.value||'');
  const vigencia=(document.getElementById('upd-gen-vigencia')?.value||'').slice(0,10);
  const desc=(document.getElementById('upd-gen-desc')?.value||'').trim();
  const valor=tipo==='pct'?pct:monto;
  if(!vigencia){ if(typeof showAlert==='function') showAlert('Ingresá la fecha de vigencia.','warning'); return; }
  if(isNaN(valor)||valor===0){ if(typeof showAlert==='function') showAlert('Ingresá el porcentaje o monto.','warning'); return; }
  if(!desc){ if(typeof showAlert==='function') showAlert('Ingresá una descripción.','warning'); return; }
  const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const p=vigencia.split('-');
  const mesLabel=`${meses[parseInt(p[1], 10)-1]} ${p[0]}`;
  // Actualizar la versión en el sind (para user-created) o solo en historial (builtin)
  const sind=getSindById(id);
  if(!sind) return;
  if(!sind.builtin){
    // Para sindicatos de usuario, actualizamos la estructura
    const users=getSindsUser();
    const idx=users.findIndex(s=>s.id===id);
    if(idx>=0){
      const s=users[idx];
      s.vigencia=vigencia; s.mesLabel=mesLabel; s.acuerdo=desc;
      if(tipo==='pct' && pct!==0){
        const factor=1+pct/100;
        (s.tablas||[]).forEach(t=>t.cats.forEach(c=>{ if(c.basico) c.basico=Math.round(c.basico*factor); if(c.valorHora) c.valorHora=Math.round(c.valorHora*factor*100)/100; }));
      } else if(tipo==='fijo' && monto!==0){
        (s.tablas||[]).forEach(t=>t.cats.forEach(c=>{ if(c.basico) c.basico=Math.round(c.basico+monto); }));
      }
      users[idx]=s;
      saveSindsUser(users);
    }
  }
  // Para todos: registrar en historial
  pushSindHist(id, { vigencia, mesLabel, tipo, valor, descripcion: desc, ts: new Date().toISOString() });
  document.getElementById('modal-upd-sind-gen')?.remove();
  if(typeof toast==='function') toast(`✓ Actualización ${mesLabel} registrada en ${id.toUpperCase()}`,'var(--green)',3000);
  // Re-render del pane
  const pane=document.getElementById(`escala-pane-master-sind_${id}`);
  if(pane){ pane.dataset.loaded=''; const sindActualizado=getSindById(id); if(sindActualizado) renderEscalaSindGenerico(sindActualizado, pane); pane.dataset.loaded='1'; }
}

// ── Modal nuevo sindicato ──────────────────────────────────────
function abrirModalNuevoSindicato(){
  const prev=document.getElementById('modal-nuevo-sind');
  if(prev) prev.remove();
  const modal=document.createElement('div');
  modal.id='modal-nuevo-sind';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML=`
    <div class="card" style="padding:0;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:13px;font-weight:600;color:var(--t1)">＋ Nuevo sindicato</div>
        <button onclick="document.getElementById('modal-nuevo-sind').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:13px">
        <div style="display:grid;grid-template-columns:60px 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Ícono</label>
            <input type="text" id="ns-icon" value="🔧" maxlength="4"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px;color:var(--t1);font-size:20px;text-align:center;outline:none">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Código (sigla) *</label>
            <input type="text" id="ns-codigo" placeholder="Ej: SMATA" maxlength="20"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);text-transform:uppercase">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Nombre completo *</label>
          <input type="text" id="ns-nombre" placeholder="Ej: Sindicato de Mecánicos y Afines del Transporte Automotor"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">CCT / Convenio</label>
          <input type="text" id="ns-cct" placeholder="Ej: CCT 594/10"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Vigencia desde *</label>
            <input type="date" id="ns-vigencia"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">% Antigüedad/año</label>
            <input type="number" id="ns-antig" value="1" step="0.1" min="0"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">Acuerdo / descripción</label>
          <textarea id="ns-acuerdo" rows="2" placeholder="Ej: Paritaria 2026: +8% semestral | Cámara XYZ"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:12px;outline:none;resize:vertical;font-family:inherit"></textarea>
        </div>
        <div>
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:8px">Categorías (una por línea)</div>
          <div style="font-size:10px;color:var(--t3);margin-bottom:6px">Formato: <code style="background:var(--bg2);padding:1px 5px;border-radius:4px">Nombre categoría | tipo | valor</code> — tipo: <b>hora</b> o <b>mensual</b> · valor: número o vacío</div>
          <textarea id="ns-cats" rows="6" placeholder="Ingresante | hora | 4313.43&#10;Operario Calificado | hora | 4672.74&#10;Oficial | hora | 5958.84&#10;Cat. 1° Administrativos | mensual | 833257&#10;Cat. 4° Administrativos | mensual | 1166170"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:12px;outline:none;resize:vertical;font-family:var(--font-mono)"></textarea>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:5px;text-transform:uppercase">% Presentismo (0 = no aplica)</label>
          <input type="number" id="ns-present" value="0" step="0.1" min="0"
            style="width:200px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
      </div>
      <div style="padding:12px 18px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-nuevo-sind').remove()" style="font-size:12px;padding:7px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarNuevoSindicato()" style="font-size:12px;padding:7px 16px">Crear sindicato</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  // Setear fecha por defecto
  const hoy=new Date();
  const prim=new Date(hoy.getFullYear(),hoy.getMonth(),1).toISOString().slice(0,10);
  const el=document.getElementById('ns-vigencia');
  if(el) el.value=prim;
}

function confirmarNuevoSindicato(){
  const codigo=(document.getElementById('ns-codigo')?.value||'').trim().toUpperCase();
  const nombre=(document.getElementById('ns-nombre')?.value||'').trim();
  const icon=(document.getElementById('ns-icon')?.value||'🔧').trim()||'🔧';
  const cct=(document.getElementById('ns-cct')?.value||'').trim();
  const vigencia=(document.getElementById('ns-vigencia')?.value||'').slice(0,10);
  const acuerdo=(document.getElementById('ns-acuerdo')?.value||'').trim();
  const antigPct=parseFloat(document.getElementById('ns-antig')?.value||'1')||1;
  const presentPct=parseFloat(document.getElementById('ns-present')?.value||'0')||0;
  const catsRaw=(document.getElementById('ns-cats')?.value||'').trim();

  if(!codigo){ if(typeof showAlert==='function') showAlert('Ingresá el código del sindicato.','warning'); return; }
  if(!nombre){ if(typeof showAlert==='function') showAlert('Ingresá el nombre.','warning'); return; }
  if(!vigencia){ if(typeof showAlert==='function') showAlert('Ingresá la fecha de vigencia.','warning'); return; }

  // Verificar que el id no exista ya
  const id=codigo.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(getSindById(id)){ if(typeof showAlert==='function') showAlert(`Ya existe un sindicato con código "${codigo}".`,'warning'); return; }

  // Parsear categorías
  const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const p=vigencia.split('-');
  const mesLabel=`${meses[parseInt(p[1], 10)-1]} ${p[0]}`;

  const horaLines=[], mensualLines=[];
  catsRaw.split('\n').forEach(l=>{
    const parts=l.split('|').map(x=>x.trim());
    if(!parts[0]) return;
    const catNom=parts[0];
    const tipo=(parts[1]||'mensual').toLowerCase();
    const val=parseFloat(parts[2])||null;
    if(tipo==='hora') horaLines.push({ cat:catNom, valorHora:val, ok:val!==null });
    else mensualLines.push({ cat:catNom, basico:val, ok:val!==null });
  });

  const tablas=[];
  if(horaLines.length) tablas.push({ titulo:'Personal jornalizado (por hora)', subtitulo:'', tipo:'hora', cats:horaLines });
  if(mensualLines.length) tablas.push({ titulo:'Personal mensualizado', subtitulo:'', tipo:'mensual', cats:mensualLines });
  if(!tablas.length) tablas.push({ titulo:'Categorías', subtitulo:'', tipo:'mensual', cats:[] });

  const adicionales=[];
  if(presentPct>0) adicionales.push({ concepto:'Presentismo', tipo:'pct', valor:presentPct, base:'básico', rem:true, nota:'' });
  if(antigPct>0)   adicionales.push({ concepto:'Antigüedad',  tipo:'pct', valor:antigPct,  base:'básico', rem:true, nota:`${antigPct}% por año acumulativo` });

  const nuevoSind={
    id, builtin:false, codigo, icon, nombre, cct, vigencia, mesLabel, acuerdo,
    tablas, adicionales, noRemunerativos:[],
    antiguedad:{ pct:antigPct, nota:`${antigPct}% por año acumulativo` },
  };

  const users=getSindsUser();
  users.push(nuevoSind);
  saveSindsUser(users);
  document.getElementById('modal-nuevo-sind')?.remove();
  if(typeof toast==='function') toast(`✓ Sindicato ${codigo} creado — recargando módulo...`,'var(--green)',3000);
  // Recargar el módulo para que aparezca la nueva tab
  setTimeout(()=>{
    renderEscalaSalarial();
    setTimeout(()=>escalaMasterTab(`sind_${id}`), 100);
  }, 300);
}

async function confirmarEliminarSindUser(id){
  const sind=getSindById(id);
  if(!sind||sind.builtin) return;
  const _cfm=await showConfirm({ titulo:'Eliminar sindicato', mensaje:`¿Eliminar el sindicato <b>${sind.codigo} — ${sind.nombre}</b>?<br><br>Se borrarán también sus datos de historial. Esta acción no se puede deshacer.`, labelOk:'Eliminar', peligroso:true });
  if(!_cfm) return;
  const users=getSindsUser().filter(s=>s.id!==id);
  saveSindsUser(users);
  localStorage.removeItem(`lsg_sinh_${id}`);
  if(typeof toast==='function') toast(`✓ Sindicato ${sind.codigo} eliminado`,'var(--green)',2500);
  setTimeout(()=>{ renderEscalaSalarial(); }, 200);
}


// ═══════════════════════════════════════════════════════════════
// SINCRONIZACIÓN ESCALA SALARIAL → MÓDULO DE LIQUIDACIONES
// Historial completo de cambios en parámetros de liquidación
// ═══════════════════════════════════════════════════════════════

const LIQ_SYNC_HIST_SK = 'lsg_liq_sync_hist';

// Mapeo: sindId → parámetros de liquidación que controla
const SIND_LIQ_PARAMS = {
  uom:      [{ campo:'Asig. NR mensual (UOM)',        liqPath:'asignacionNoRemPorSindicato.UOM',      formato:'$', getEscala: ()=>_getNRActivoSind('uom') }],
  comercio: [
    { campo:'Asig. NR mensual (SEC/Comercio)',         liqPath:'asignacionNoRemPorSindicato.SEC',      formato:'$', getEscala: ()=>_getNRActivoSind('comercio') },
    { campo:'% Presentismo (CCT 130/75)',               liqPath:'pctPresentismo',                       formato:'%', getEscala: ()=>8.33, nota:'Aplica a todos los empleados con pctPresentismo global — verificar si hay otros convenios' },
  ],
  uoyep:    [{ campo:'Asig. NR mensual (Plástico)',    liqPath:'asignacionNoRemPorSindicato.PLASTICO', formato:'$', getEscala: ()=>_getNRActivoSind('uoyep') }],
  asimra:   [{ campo:'Asig. NR mensual (ASIMRA)',      liqPath:'asignacionNoRemPorSindicato.ASIMRA',   formato:'$', getEscala: ()=>_getNRActivoSind('asimra') }],
  uocra:    [{ campo:'Asig. NR mensual (UOCRA)',       liqPath:'asignacionNoRemPorSindicato.UOCRA',    formato:'$', getEscala: ()=>_getNRActivoSind('uocra') }],
  uecara:   [{ campo:'Asig. NR mensual (UECARA)',      liqPath:'asignacionNoRemPorSindicato.UECARA',   formato:'$', getEscala: ()=>_getNRActivoSind('uecara') }],
  smvm:     [{ campo:'SMVM mensual',                   liqPath:'smvmMensual',                           formato:'$', getEscala: ()=>getSMVMActual()?.mensual || 0 }],
};

// Obtiene el NR activo vigente de cada sindicato
function _getNRActivoSind(sindId){
  if(sindId==='uom')     { const a=getUOMActivo()?.noRemunerativos?.find(r=>r.activo); return a?.monto||0; }
  if(sindId==='comercio'){ const a=getCOMActivo()?.noRemunerativos?.find(r=>r.activo); return a?.monto||0; }
  const s=getSindById(sindId);
  if(s){ const a=s.noRemunerativos?.find(r=>r.activo); return a?.monto||0; }
  return 0;
}

// Obtiene el label del sindicato para mostrar en historial
function _getSindLabel(sindId){
  if(sindId==='uom')     return 'UOM – Rama 17';
  if(sindId==='comercio') return 'Comercio (SEC)';
  if(sindId==='smvm')    return 'S.M.V.M.';
  const s=getSindById(sindId);
  return s ? `${s.codigo} — ${s.nombre.split('(')[0].trim()}` : sindId.toUpperCase();
}

// ── Acceso a parámetros anidados por path 'a.b.c' ─────────────
function _getLiqDeep(path){
  if(typeof getLiqParams!=='function') return undefined;
  const p=getLiqParams();
  return path.split('.').reduce((o,k)=>o?.[k], p);
}
function _setLiqDeep(path, valor){
  if(typeof getLiqParams!=='function'||typeof saveLiqParams!=='function') return false;
  const p=getLiqParams();
  const parts=path.split('.');
  let obj=p;
  for(let i=0;i<parts.length-1;i++){
    if(!obj[parts[i]]) obj[parts[i]]={};
    obj=obj[parts[i]];
  }
  obj[parts[parts.length-1]]=valor;
  saveLiqParams(p);
  return true;
}

// ── Historial de sincronizaciones ─────────────────────────────
function getLiqSyncHist(){
  try{ return JSON.parse(localStorage.getItem(LIQ_SYNC_HIST_SK)||'[]'); }catch(e){ return []; }
}
function _pushLiqSyncHist(entry){
  const h=getLiqSyncHist();
  h.push(entry);
  // Mantener últimas 500 entradas
  if(h.length>500) h.splice(0, h.length-500);
  localStorage.setItem(LIQ_SYNC_HIST_SK, JSON.stringify(h));
}

// ── Sincronización ────────────────────────────────────────────
function _toggleLiqHist(sindId){
  const div=document.getElementById(`liq-hist-${sindId}`);
  const arr=document.getElementById(`liq-hist-arrow-${sindId}`);
  if(!div) return;
  const open=div.style.display==='none';
  div.style.display=open?'block':'none';
  if(arr) arr.textContent=open?'▲':'▼';
}

// ── Historial global de sincronizaciones ──────────────────────
function renderHistorialLiqSyncGlobal(){
  const hist=getLiqSyncHist().slice().reverse().slice(0,100);
  const fN=v=>v===null||v===undefined?'—':(typeof v==='number'&&v>100?'$ '+Math.round(v).toLocaleString('es-AR'):v);
  if(!hist.length) return '<div class="card" style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin sincronizaciones registradas todavía.</div>';
  const hSt='padding:8px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;background:var(--bg2);border-bottom:1px solid var(--border)';
  return `<div class="card" style="padding:0;overflow:hidden">
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:800px">
      <thead><tr>
        <th style="${hSt}">Fecha y hora</th>
        <th style="${hSt}">Sindicato</th>
        <th style="${hSt};min-width:200px">Campo / Parámetro</th>
        <th style="${hSt}">Anterior</th>
        <th style="${hSt}">Nuevo</th>
        <th style="${hSt}">Operador</th>
      </tr></thead>
      <tbody>
        ${hist.map((h,i)=>{
          const ts=new Date(h.ts);
          const fecha=`${ts.getDate().toString().padStart(2,'0')}/${(ts.getMonth()+1).toString().padStart(2,'0')}/${ts.getFullYear()} ${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}`;
          return `<tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
            <td style="padding:9px 14px;font-family:var(--font-mono);color:var(--t3);font-size:11px;white-space:nowrap">${fecha}</td>
            <td style="padding:9px 14px;color:var(--t1);font-weight:500">${h.sindLabel||h.sindId}</td>
            <td style="padding:9px 14px">
              <div style="color:var(--t2)">${h.campo}</div>
              <div style="font-size:9px;font-family:var(--font-mono);color:var(--t3)">${h.liqPath}</div>
            </td>
            <td style="padding:9px 14px;font-family:var(--font-mono);color:var(--t3)">${fN(h.valorAnterior)}</td>
            <td style="padding:9px 14px;font-family:var(--font-mono);color:rgb(34,197,94);font-weight:600">${fN(h.valorNuevo)}</td>
            <td style="padding:9px 14px;font-size:11px;color:var(--t3)">${h.operadorNom||h.operador||'—'}</td>
          </tr>`;}).join('')}
      </tbody>
    </table></div>
  </div>`;
}

// ── escalaMasterTab (versión final con inyección de tarjeta liq)
function escalaMasterTab(which){
  if(which==='__nuevo__'){ abrirModalNuevoSindicato(); return; }
  document.querySelectorAll('[id^="escala-mtab-"]').forEach(btn=>{
    const id=btn.id.replace('escala-mtab-','');
    const on=id===which;
    btn.style.fontWeight=on?'600':'400';
    btn.style.color=on?'var(--t1)':id==='__nuevo__'?'var(--accent2)':'var(--t3)';
    btn.style.borderBottom=on?'2px solid var(--accent2)':'2px solid transparent';
  });
  document.querySelectorAll('[id^="escala-pane-master-"]').forEach(p=>p.style.display='none');
  const pane=document.getElementById(`escala-pane-master-${which}`);
  if(pane) pane.style.display='block';
  if(!pane||pane.dataset.loaded) return;

  // Lazy render del contenido
  if(which==='uom')              { renderEscalaUOM(); }
  else if(which==='comercio')    { renderEscalaComercio(); }
  else if(which==='smvm')        { renderSMVM(); }
  else if(which.startsWith('sind_')){
    const id=which.slice(5);
    const sind=getSindById(id);
    if(sind) renderEscalaSindGenerico(sind, pane);
  }
  pane.dataset.loaded='1';

  // Inyectar tarjeta de sincronización con liquidaciones
  // (para todos excepto escala interna y SMVM que tiene su propio sync)
  if(which!=='interna' && which!=='smvm'){
    const sindIdForCard=which.startsWith('sind_')?which.slice(5):which;
    if(SIND_LIQ_PARAMS[sindIdForCard]){
      renderLiqSyncCard(sindIdForCard, pane);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SYNC COMPLETO — REMUNERATIVOS + NO REMUNERATIVOS
// Todos los valores de escala → liqParams.escalasParitaria + asigNR
// ═══════════════════════════════════════════════════════════════

// Obtiene la escala activa de cualquier sindicato en formato uniforme
function _getEscalaActivaForSind(sindId){
  if(sindId==='uom')      return getUOMActivo();
  if(sindId==='comercio') return getCOMActivo();
  return getSindById(sindId)||null;
}

// Sanitiza un string a clave JS válida
function _sanitKey(s){ return String(s).replace(/[^a-zA-Z0-9]/g,'_').replace(/^_+|_+$/g,'').toLowerCase(); }

// Formatea un valor según el tipo para la UI
function _fmtSyncVal(v, fmt){
  if(v===null||v===undefined||v==='') return '—';
  if(fmt==='h$') return '$ '+parseFloat(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(fmt==='%')  return parseFloat(v)+'%';
  return '$ '+Math.round(v).toLocaleString('es-AR');
}

// Compara dos valores según el formato (tolerancia para floats)
function _syncValEqual(a, b, fmt){
  if(a===null||a===undefined||b===null||b===undefined) return false;
  if(fmt==='%'||fmt==='h$') return Math.abs(parseFloat(a)-parseFloat(b))<0.005;
  return Math.round(a)===Math.round(b);
}

// ── Construye todas las filas de sync para un sindicato ────────
function _buildSyncRows(sindId){
  const rows=[];

  // ── NR vigente ────────────────────────────────────────────────
  const nrMap={
    uom:'asignacionNoRemPorSindicato.UOM', comercio:'asignacionNoRemPorSindicato.SEC',
    uoyep:'asignacionNoRemPorSindicato.PLASTICO', asimra:'asignacionNoRemPorSindicato.ASIMRA',
    uocra:'asignacionNoRemPorSindicato.UOCRA', uecara:'asignacionNoRemPorSindicato.UECARA',
  };
  if(sindId==='smvm'){
    rows.push({ seccion:'Referencia legal', campo:'SMVM mensual', liqPath:'smvmMensual', fmt:'$', tipo:'REF',
      escalaVal: getSMVMActual()?.mensual||0 });
    rows.push({ seccion:'Referencia legal', campo:'SMVM jornalizado (por hora)', liqPath:'escalasParitaria.SMVM.horario', fmt:'h$', tipo:'REF',
      escalaVal: getSMVMActual()?.horario||0 });
    return rows;
  }
  if(nrMap[sindId]){
    const nrVal=_getNRActivoSind(sindId);
    const escala=_getEscalaActivaForSind(sindId);
    const nrActivo=escala?.noRemunerativos?.find(r=>r.activo);
    rows.push({
      seccion:'No Remunerativos', tipo:'NR',
      campo: nrActivo?`${nrActivo.label} (activo)`:'NR mensual',
      liqPath: nrMap[sindId], fmt:'$', escalaVal: nrVal,
    });
    // Para Comercio también el presentismo
    if(sindId==='comercio'){
      rows.push({ seccion:'No Remunerativos', tipo:'NR',
        campo:'Presentismo % (Art.40 CCT 130/75)',
        liqPath:'pctPresentismo', fmt:'%', escalaVal:8.33,
        nota:'Campo global — verificar si otros convenios usan % distinto' });
    }
  }

  // ── Valores remunerativos según tipo de sindicato ─────────────
  const SK=sindId.toUpperCase();
  const BASE=`escalasParitaria.${SK}`;

  if(sindId==='uom'){
    const act=getUOMActivo();
    if(!act) return rows;
    // Jornalizado
    act.jornalizado.forEach(c=>{
      rows.push({ seccion:'Jornalizado (valor hora)', tipo:'REM',
        campo:`${c.label}`, liqPath:`${BASE}.jorn_${c.cat}`, fmt:'h$',
        escalaVal: c.valorHora, catCode: c.cat });
    });
    // IMGR
    rows.push({ seccion:'Jornalizado (valor hora)', tipo:'REM',
      campo:'IMGR (piso garantizado mensual)', liqPath:`${BASE}.imgr`, fmt:'$',
      escalaVal: act.imgr });
    // Mensualizado
    act.mensualizado.forEach(g=>{
      g.cats.filter(c=>c.ok&&c.basico).forEach(c=>{
        rows.push({ seccion:`Mensualizado — Grupo ${g.grupo} (${g.label})`, tipo:'REM',
          campo:`${g.label} · ${c.cat}`,
          liqPath:`${BASE}.men${g.grupo}_${_sanitKey(c.cat)}`, fmt:'$',
          escalaVal: c.basico });
      });
    });
  }
  else if(sindId==='comercio'){
    const act=getCOMActivo();
    if(!act) return rows;
    act.categorias.forEach(g=>{
      const gk=_sanitKey(g.grupo.slice(0,4));
      g.cats.filter(c=>c.ok&&c.basico).forEach(c=>{
        rows.push({ seccion:`Básicos — ${g.grupo}`, tipo:'REM',
          campo:`${g.grupo} · ${c.cat}`,
          liqPath:`${BASE}.${gk}_${_sanitKey(c.cat)}`, fmt:'$',
          escalaVal: c.basico });
      });
    });
  }
  else {
    // Sindicatos genéricos
    const sind=getSindById(sindId);
    if(!sind) return rows;
    (sind.tablas||[]).forEach(t=>{
      const tKey=_sanitKey(t.tipo+t.titulo.slice(0,6));
      t.cats.filter(c=>c.ok&&(c.valorHora||c.basico)).forEach(c=>{
        const val=c.valorHora||c.basico;
        const fmt=c.valorHora?'h$':'$';
        rows.push({ seccion:t.titulo, tipo:'REM',
          campo:c.cat, liqPath:`${BASE}.${tKey}_${_sanitKey(c.cat)}`, fmt,
          escalaVal: val });
      });
    });
    // ASIMRA: básico de referencia
    if(sindId==='asimra'){
      const basic=sind.tablas?.[0]?.cats?.find(c=>c.ok&&c.basico);
      if(basic) rows.push({ seccion:'Referencia acuerdo', tipo:'REM',
        campo:'Básico referencia (Sup. Fábrica 1° Rama 16)',
        liqPath:`${BASE}.basico_ref`, fmt:'$', escalaVal: basic.basico });
    }
  }
  return rows;
}

// ── Render de la tarjeta completa de sincronización ────────────
function renderLiqSyncCard(sindId, paneEl){
  const existingCard=paneEl.querySelector('.liq-sync-card');
  if(existingCard) existingCard.remove();
  if(typeof getLiqParams!=='function') return;

  const rows=_buildSyncRows(sindId);
  if(!rows.length) return;

  const hist=getLiqSyncHist().filter(h=>h.sindId===sindId).slice(-10).reverse();
  const fV=_fmtSyncVal;

  // Enriquecer filas con estado de sync
  const enriched=rows.map((r,idx)=>{
    const liqVal=_getLiqDeep(r.liqPath);
    const sinc=r.escalaVal?((_syncValEqual(r.escalaVal,liqVal,r.fmt))):(!liqVal||liqVal===0);
    const noData=!r.escalaVal||r.escalaVal===0;
    return {...r, liqVal, sinc, noData, idx};
  });
  // Las filas NR ya son automáticas en la liquidación (via _nrParaCodSindicato).
  // Solo se cuentan como "pendientes" las filas remunerativas (escalasParitaria).
  const pendientes=enriched.filter(r=>!r.sinc&&!r.noData&&r.tipo!=='NR'&&r.tipo!=='REF');
  const hasPending=pendientes.length>0;

  // Agrupar por sección
  const secciones={};
  enriched.forEach(r=>{ if(!secciones[r.seccion]) secciones[r.seccion]=[]; secciones[r.seccion].push(r); });

  const panelId=paneEl.id.replace('escala-pane-master-','');

  const card=document.createElement('div');
  card.className='liq-sync-card';
  card.style.marginTop='18px';
  card.innerHTML=`
    <div class="card" style="padding:0;overflow:hidden;border:${hasPending?'1px solid rgba(61,127,255,.4)':'1px solid var(--border)'}">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);background:${hasPending?'rgba(61,127,255,.06)':'var(--bg2)'};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1)">🔗 Sincronización con Liquidaciones</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">
            ${hasPending
              ? `<span style="color:rgb(239,68,68)">⚠ ${pendientes.length} valor${pendientes.length===1?'':'es'} desfasado${pendientes.length===1?'':'s'}</span> — los recibos de este convenio pueden no reflejar la paritaria vigente`
              : '✓ Todos los parámetros están sincronizados con el módulo de liquidaciones'}
          </div>
        </div>
        ${hasPending?`<button class="btn btn-primary" onclick="_syncTodosRows('${sindId}','${panelId}')" style="font-size:12px;padding:6px 14px;white-space:nowrap">⇡ Sincronizar todo (${pendientes.length})</button>`:''}
      </div>

      ${Object.entries(secciones).map(([sec, filas])=>`
        <div>
          <div style="padding:8px 18px;background:var(--bg2);border-bottom:1px solid var(--border);border-top:1px solid var(--border)">
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em">
              ${filas[0].tipo==='NR'?'📦 ':filas[0].tipo==='REF'?'📌 ':'💰 '}${sec}
            </span>
          </div>
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">
            <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:8px 18px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;min-width:240px">Concepto</th>
              <th style="padding:8px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(59,130,246);text-transform:uppercase">Escala</th>
              <th style="padding:8px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:rgb(251,191,36);text-transform:uppercase">En Liq.</th>
              <th style="padding:8px 10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Estado</th>
              <th style="padding:8px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Ruta parámetro</th>
              <th style="padding:8px 10px;width:90px"></th>
            </tr></thead>
            <tbody>
              ${filas.map(r=>`
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:9px 18px">
                  <div style="color:var(--t1);font-weight:500">${r.campo}</div>
                  ${r.nota?`<div style="font-size:9px;color:rgb(251,191,36);margin-top:1px">⚠ ${r.nota}</div>`:''}
                </td>
                <td style="padding:9px 12px;text-align:right;font-family:var(--font-mono);font-weight:600;color:${r.noData?'var(--t3)':r.tipo==='NR'?'rgb(251,191,36)':'rgb(59,130,246)'}">
                  ${r.noData?'<span style="font-size:10px;font-style:italic">sin dato</span>':fV(r.escalaVal,r.fmt)}
                </td>
                <td style="padding:9px 12px;text-align:right;font-family:var(--font-mono);color:${r.liqVal?'var(--t2)':'var(--t3)'};font-size:11px">
                  ${r.liqVal!==null&&r.liqVal!==undefined&&r.liqVal!==0?fV(r.liqVal,r.fmt):'—'}
                </td>
                <td style="padding:9px 10px;text-align:center">
                  ${r.tipo==='NR'?'<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3);white-space:nowrap">⚡ Auto</span>'
                  :r.noData?'<span style="font-size:10px;color:var(--t3)">—</span>'
                  :r.sinc?'<span style="font-size:11px;color:rgb(34,197,94)">✓</span>'
                  :'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 6px;border-radius:6px;background:rgba(239,68,68,.1);color:rgb(239,68,68);border:1px solid rgba(239,68,68,.3)">⚠</span>'}
                </td>
                <td style="padding:9px 12px;font-size:9px;font-family:var(--font-mono);color:var(--t3)">${r.liqPath}</td>
                <td style="padding:9px 10px;text-align:right">
                  ${(r.tipo!=='NR'&&!r.sinc&&!r.noData)?`<button class="btn btn-ghost" onclick="_syncOneRow('${sindId}',${r.idx},'${panelId}')" style="font-size:10px;padding:3px 9px">Sync</button>`:''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`).join('')}

      ${hist.length>0?`
      <div style="border-top:1px solid var(--border)">
        <div style="padding:9px 16px;background:var(--bg2);display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="_toggleLiqHist('${sindId}')">
          <span style="font-size:11px;font-weight:600;color:var(--t2)">📜 Historial de sincronizaciones (${hist.length} recientes)</span>
          <span id="liq-hist-arrow-${sindId}" style="font-size:12px;color:var(--t3)">▼</span>
        </div>
        <div id="liq-hist-${sindId}" style="display:none">
          <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:700px">
            <thead><tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:7px 16px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;white-space:nowrap">Fecha</th>
              <th style="padding:7px 14px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;min-width:200px">Campo / Parámetro</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Anterior</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Nuevo</th>
              <th style="padding:7px 10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Por</th>
            </tr></thead>
            <tbody>
              ${hist.map((h,i)=>{
                const ts=new Date(h.ts);
                const fecha=`${ts.getDate().toString().padStart(2,'0')}/${(ts.getMonth()+1).toString().padStart(2,'0')}/${ts.getFullYear()} ${ts.getHours().toString().padStart(2,'0')}:${ts.getMinutes().toString().padStart(2,'0')}`;
                const fH=v=>v===null||v===undefined?'—':(typeof v==='number'&&v>100?'$ '+Math.round(v).toLocaleString('es-AR'):(typeof v==='number'?v+'':v));
                return `<tr style="border-bottom:1px solid var(--border);background:${i%2?'rgba(255,255,255,.01)':'transparent'}">
                  <td style="padding:7px 16px;font-family:var(--font-mono);color:var(--t3);white-space:nowrap">${fecha}</td>
                  <td style="padding:7px 14px">
                    <div style="color:var(--t2)">${h.campo}</div>
                    <div style="font-size:9px;font-family:var(--font-mono);color:var(--t3)">${h.liqPath}</div>
                  </td>
                  <td style="padding:7px 10px;text-align:right;font-family:var(--font-mono);color:var(--t3)">${fH(h.valorAnterior)}</td>
                  <td style="padding:7px 10px;text-align:right;font-family:var(--font-mono);color:rgb(34,197,94);font-weight:600">${fH(h.valorNuevo)}</td>
                  <td style="padding:7px 10px;text-align:center;color:var(--t3)">${h.operador||'—'}</td>
                </tr>`; }).join('')}
            </tbody>
          </table></div>
        </div>
      </div>`:''}
    </div>`;

  paneEl.appendChild(card);
}

// ── Helpers de sync por índice de fila (para botones en la tabla)
function _syncOneRow(sindId, rowIdx, panelId){
  const rows=_buildSyncRows(sindId);
  const row=rows[rowIdx];
  if(!row) return;
  const anterior=_getLiqDeep(row.liqPath);
  const ok=_setLiqDeep(row.liqPath, row.fmt==='%'?parseFloat(row.escalaVal):row.escalaVal);
  if(!ok){ if(typeof toast==='function') toast('⚠ No se pudo acceder a liquidaciones','var(--red)'); return; }
  _pushLiqSyncHist({ ts:new Date().toISOString(), sindId, sindLabel:_getSindLabel(sindId),
    campo:row.campo, liqPath:row.liqPath, valorAnterior:anterior, valorNuevo:row.escalaVal,
    operador:(typeof currentUser!=='undefined'&&currentUser?.emp?.leg)||null,
    operadorNom:(typeof currentUser!=='undefined'&&currentUser?.emp?.nom)||null });
  if(typeof toast==='function') toast(`✓ ${row.campo}: ${_fmtSyncVal(row.escalaVal,row.fmt)} → Liquidaciones`,'var(--green)',2500);
  // Re-render de la tarjeta
  const pane=document.getElementById(`escala-pane-master-${panelId}`);
  if(pane) renderLiqSyncCard(sindId, pane);
}

function _syncTodosRows(sindId, panelId){
  const rows=_buildSyncRows(sindId);
  let count=0;
  rows.forEach((row,idx)=>{
    if(!row.escalaVal||row.escalaVal===0) return;
    const liqVal=_getLiqDeep(row.liqPath);
    if(_syncValEqual(row.escalaVal,liqVal,row.fmt)) return; // ya sincronizado
    const anterior=liqVal;
    const ok=_setLiqDeep(row.liqPath, row.fmt==='%'?parseFloat(row.escalaVal):row.escalaVal);
    if(!ok) return;
    _pushLiqSyncHist({ ts:new Date().toISOString(), sindId, sindLabel:_getSindLabel(sindId),
      campo:row.campo, liqPath:row.liqPath, valorAnterior:anterior, valorNuevo:row.escalaVal,
      operador:(typeof currentUser!=='undefined'&&currentUser?.emp?.leg)||null,
      operadorNom:(typeof currentUser!=='undefined'&&currentUser?.emp?.nom)||null });
    count++;
  });
  if(typeof toast==='function')
    toast(count>0?`✓ ${count} valor${count===1?'':'es'} sincronizado${count===1?'':'s'} → Liquidaciones`:'Sin cambios pendientes','var(--green)',3500);
  const pane=document.getElementById(`escala-pane-master-${panelId}`);
  if(pane) renderLiqSyncCard(sindId, pane);
}


// ═══════════════════════════════════════════════════════════════════════════
// EDITOR DE MONTOS DE TÍTULO — Panel de Escala Salarial
// ═══════════════════════════════════════════════════════════════════════════

function abrirEditorMontosTitulo(){
  const escala = getEscalaActiva();
  const mt = escala.montos_titulo || { secundario:0, terciario:0, universitario:0 };

  const prev = document.getElementById('modal-montos-titulo');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-montos-titulo';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:500px;width:100%;border:1px solid var(--border)">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">🎓 Montos de adicional por título</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Estos valores se aplican a todos los empleados bajo CCT que tengan el título correspondiente</div>
        </div>
        <button onclick="document.getElementById('modal-montos-titulo').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:12px">
        <div style="padding:10px 12px;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);font-size:12px;color:var(--yellow);line-height:1.5">
          ⚠ Estos montos se negocian por paritaria. Al guardar se guardan sobre la versión de escala activa
          y aplican a la próxima liquidación.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Secundario ($)</label>
            <input type="number" id="mt-sec" step="1" min="0" value="${mt.secundario||0}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Terciario ($)</label>
            <input type="number" id="mt-ter" step="1" min="0" value="${mt.terciario||0}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Universitario ($)</label>
            <input type="number" id="mt-uni" step="1" min="0" value="${mt.universitario||0}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
        </div>
        <div style="font-size:11px;color:var(--t3);font-style:italic;line-height:1.5">
          Los sindicatos que <strong>no disponen</strong> adicional por título (UOCRA, UOYEP, UECARA)
          ignoran estos valores independientemente de lo que se configure aquí.
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-montos-titulo').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_guardarMontosTitulo()" style="font-size:13px;padding:8px 20px">✓ Guardar montos</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('mt-sec')?.focus();
}

function _guardarMontosTitulo(){
  const sec = parseFloat(document.getElementById('mt-sec')?.value||'0') || 0;
  const ter = parseFloat(document.getElementById('mt-ter')?.value||'0') || 0;
  const uni = parseFloat(document.getElementById('mt-uni')?.value||'0') || 0;

  // Guardar sobre la versión activa en el storage de usuario
  // Si la activa es la seed, crear una versión "override de montos" basada en ella
  const escalaActiva = getEscalaActiva();
  const versiones = _getEscalaVersionesRaw();

  // Buscar si hay una versión de usuario con el mismo id o vigencia
  const idxUser = versiones.findIndex(v => v.id === escalaActiva.id || v.vigencia === escalaActiva.vigencia);
  if(idxUser >= 0){
    versiones[idxUser].montos_titulo = { secundario: sec, terciario: ter, universitario: uni };
    _setEscalaVersionesRaw(versiones);
  } else {
    // La activa es la seed — crear una versión de override
    const nueva = {
      ...JSON.parse(JSON.stringify(escalaActiva)),
      id: 'esc_titulo_' + Date.now(),
      vigencia: escalaActiva.vigencia,
      mesLabel: escalaActiva.mesLabel + ' (actualización título)',
      origen: 'montos_titulo',
      comentario: 'Actualización de montos de adicional por título',
      creado: new Date().toISOString(),
      creadoPor: typeof currentUser !== 'undefined' ? (currentUser?.emp?.nom || null) : null,
      montos_titulo: { secundario: sec, terciario: ter, universitario: uni }
    };
    versiones.push(nueva);
    _setEscalaVersionesRaw(versiones);
  }

  document.getElementById('modal-montos-titulo')?.remove();
  if(typeof renderEscalaSalarial === 'function') renderEscalaSalarial();
  if(typeof logAuditX === 'function') logAuditX('escala', 'actualizar_montos_titulo', { sec, ter, uni });
  toast('✅ Montos de adicional por título actualizados', 'var(--green)', 3000);
}
