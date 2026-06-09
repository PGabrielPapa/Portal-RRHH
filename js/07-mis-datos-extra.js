// ═══════════════════════════════════════════════════════════════════════
// ═══   MIS DATOS EXTRA — Familiares, talles, documentación personal   ═══
// ═══   Módulo 07                                                       ═══
// ═══════════════════════════════════════════════════════════════════════

function toggleFormCambioDom(){
  const f = document.getElementById('form-cambio-dom');
  const c = document.getElementById('dom-confirmacion');
  if(c) c.style.display='none';
  if(f){
    f.style.display = f.style.display==='none' ? 'block' : 'none';
    if(f.style.display==='none'){
      ['new-dom-calle','new-dom-nro','new-dom-piso','new-dom-depto','new-dom-loc','new-dom-prov','new-dom-cp']
        .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// EMPLEADO · Mis talles de trabajo (autoservicio)
// El empleado puede consultar y cargar sus propios talles
// Lee/escribe en los mismos datos que el panel HyS de RR.HH.
// ═══════════════════════════════════════════════════════════════
function toggleMisTalles(){
  const w = document.getElementById('mis-talles-wrap');
  if(!w) return;
  const showing = w.style.display !== 'none';
  if(showing){ w.style.display = 'none'; return; }
  w.style.display = 'block';
  renderMisTalles();
}

function renderMisTalles(){
  const w = document.getElementById('mis-talles-wrap');
  if(!w || !currentUser) return;
  const leg = currentUser.emp.leg;
  const t = (typeof getHysTallesEmp === 'function' ? getHysTallesEmp(leg) : null) || {};
  const fmtFecha = iso => {
    if(!iso) return '';
    try { return new Date(iso).toLocaleString('es-AR'); } catch(e){ return iso; }
  };

  const campo = (id, label, ph, val, ayuda) => `
    <div>
      <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">${label}</label>
      <input type="text" id="${id}" value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
      ${ayuda?`<div style="font-size:10px;color:var(--t3);margin-top:3px">${ayuda}</div>`:''}
    </div>`;

  w.innerHTML = `
    <div class="card" style="padding:18px 20px;max-width:720px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">👕 Mis talles de trabajo</div>
        <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(251,146,60,.1);color:rgb(251,146,60);border:1px solid rgba(251,146,60,.3)">HIGIENE Y SEGURIDAD</span>
      </div>
      <div style="font-size:12px;color:var(--t2);line-height:1.5;margin-bottom:14px">
        Cargá tus talles para que RR.HH. y el área de Higiene y Seguridad puedan preparar correctamente los elementos de protección personal y la ropa de trabajo. Podés actualizar estos datos cuando quieras.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        ${campo('mt-calzado','Calzado / Botín','Ej: 42 / 9 USA',t.calzado)}
        ${campo('mt-pantalon','Pantalón','Ej: 42, M, L',t.pantalon)}
        ${campo('mt-buzo','Buzo / Pulóver','Ej: M, L, XL',t.buzo)}
        ${campo('mt-remera','Remera','Ej: M, L, XL',t.remera)}
        ${campo('mt-campera','Campera','Ej: M, L, XL',t.campera)}
        ${campo('mt-camisa','Camisa','Ej: 42, M, L',t.camisa)}
        ${campo('mt-casco','Casco','Ej: M, L, Único',t.casco)}
        ${campo('mt-guantes','Guantes','Ej: 9, M, L',t.guantes)}
      </div>
      <div style="margin-top:14px">
        <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Observaciones</label>
        <textarea id="mt-obs" rows="2" placeholder="Particularidades, talles especiales, alergias a materiales, etc."
          style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(t.observaciones||'').replace(/</g,'&lt;')}</textarea>
      </div>
      ${t.actualizado ? `
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">
          📅 Última actualización: ${fmtFecha(t.actualizado)}${t.actualizado_por?' · por '+t.actualizado_por:''}
        </div>
      ` : `
        <div style="font-size:11px;color:rgb(251,146,60);font-family:var(--font-mono);margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">
          ⚠ Aún no cargaste tus talles. Por favor, completalos para recibir correctamente la ropa y EPP.
        </div>
      `}
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="toggleMisTalles()" style="font-size:12px;padding:7px 14px">Cerrar</button>
        <button class="btn btn-primary" onclick="guardarMisTalles()" style="font-size:12px;padding:7px 16px">💾 Guardar mis talles</button>
      </div>
    </div>`;
}

function guardarMisTalles(){
  if(!currentUser) return;
  const leg = currentUser.emp.leg;
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const data = {
    calzado:  gv('mt-calzado'),
    pantalon: gv('mt-pantalon'),
    buzo:     gv('mt-buzo'),
    remera:   gv('mt-remera'),
    campera:  gv('mt-campera'),
    camisa:   gv('mt-camisa'),
    casco:    gv('mt-casco'),
    guantes:  gv('mt-guantes'),
    observaciones: gv('mt-obs'),
    actualizado: new Date().toISOString(),
    actualizado_por: currentUser?.emp?.nom || 'Empleado'
  };
  const all = (typeof getHysTalles === 'function' ? getHysTalles() : {});
  all[leg] = data;
  if(typeof setHysTalles === 'function') setHysTalles(all);
  toast('✓ Tus talles fueron guardados correctamente','var(--green)');
  renderMisTalles();
}

// ═══════════════════════════════════════════════════════════════
// MÓDULO FAMILIARES
// Empleado: ver / agregar / editar / borrar sus propios familiares
// RR.HH.: visualizar familiares de todos los empleados
// Storage: localStorage 'lsg_familiares' = { [legajo]: [familiares...] }
// ═══════════════════════════════════════════════════════════════

const FAM_STORAGE_KEY = 'lsg_familiares';

// Tipos de vínculo permitidos
const FAM_TIPOS = [
  { v:'padre',     label:'Padre',       icon:'👨' },
  { v:'madre',     label:'Madre',       icon:'👩' },
  { v:'conyuge',   label:'Cónyuge',     icon:'💍', conFecha:true,  fechaLabel:'Fecha de matrimonio' },
  { v:'concubino', label:'Concubino/a', icon:'❤',  conFecha:true,  fechaLabel:'Fecha de unión convivencial' },
  { v:'hijo',      label:'Hijo',        icon:'👦' },
  { v:'hija',      label:'Hija',        icon:'👧' },
  { v:'hijastro',  label:'Hijastro',    icon:'👦' },
  { v:'hijastra',  label:'Hijastra',    icon:'👧' }
];

function _famGetAll(){
  try { const r = localStorage.getItem(FAM_STORAGE_KEY); return r ? JSON.parse(r) : {}; }
  catch(e){ return {}; }
}
function _famSetAll(o){ localStorage.setItem(FAM_STORAGE_KEY, JSON.stringify(o)); }

// Devuelve hijos vigentes que ya cumplieron `edadCorte` años (default 18).
// Útil para alertar a RR.HH. de vínculos que deberían cerrarse por mayoría.
function getHijosConMayoria(leg, edadCorte){
  const corte = edadCorte || 18;
  return getFamiliaresVigentes(leg).filter(f => {
    if(!['hijo','hija','hijastro','hijastra'].includes(f.tipo)) return false;
    const edad = _famCalcularEdad(f.fecha_nac);
    return edad !== null && edad >= corte;
  });
}

// Cierre automático masivo: cierra todos los hijos vigentes que cumplieron
// `edadCorte` años con motivo `mayoria_edad`. Usa la fecha del cumpleaños 18
// como vigenciaHasta.
function cerrarHijosPorMayoria(leg, edadCorte){
  const corte = edadCorte || 18;
  const hijos = getHijosConMayoria(leg, corte);
  let cerrados = 0;
  for(const f of hijos){
    // Cumpleaños 18: misma fecha de nacimiento + 18 años
    let fechaCierre = _hoyIsoFam();
    if(f.fecha_nac){
      const partes = f.fecha_nac.split(/[-\/]/);
      try {
        let yyyy, mm, dd;
        if(f.fecha_nac.includes('-')){ [yyyy, mm, dd] = partes; }
        else { [dd, mm, yyyy] = partes; }
        const cumple18 = new Date(+yyyy + corte, +mm - 1, +dd);
        fechaCierre = cumple18.toISOString().slice(0, 10);
      } catch(_){}
    }
    const r = cerrarVinculoFamiliar(leg, f.id, fechaCierre, 'mayoria_edad');
    if(r.ok) cerrados++;
  }
  return cerrados;
}

function getFamiliaresEmp(leg){
  const all = _famGetAll();
  if(!Array.isArray(all[leg])) return [];
  // Migración lazy: cualquier familiar sin `vigenciaDesde` se considera vigente
  // desde su fecha de creación (o fecha de vínculo si la tiene). vigenciaHasta=null.
  let mutado = false;
  all[leg].forEach(f => {
    if(!f.vigenciaDesde){
      f.vigenciaDesde = (f.fecha_vinculo || (f.creado ? f.creado.slice(0,10) : null) || _hoyIsoFam());
      mutado = true;
    }
    if(f.vigenciaHasta === undefined){ f.vigenciaHasta = null; mutado = true; }
    if(f.motivoCierre === undefined){ f.motivoCierre = ''; mutado = true; }
  });
  if(mutado) _famSetAll(all);
  return all[leg];
}

function saveFamiliaresEmp(leg, arr){
  const all = _famGetAll();
  all[leg] = arr;
  _famSetAll(all);
}

function _hoyIsoFam(){ return new Date().toISOString().slice(0,10); }

// Devuelve solo los vínculos VIGENTES en `fecha` (default = hoy).
//   - vigenciaDesde <= fecha (ya empezó)
//   - vigenciaHasta es null (sigue vigente) o vigenciaHasta >= fecha (todavía no cerró)
function getFamiliaresVigentes(leg, fecha){
  const f = fecha || _hoyIsoFam();
  return getFamiliaresEmp(leg).filter(x =>
    (x.vigenciaDesde || '0000') <= f &&
    (!x.vigenciaHasta || x.vigenciaHasta >= f)
  );
}

// Devuelve los vínculos cerrados (con vigenciaHasta seteada).
function getFamiliaresHistorico(leg){
  return getFamiliaresEmp(leg).filter(x => !!x.vigenciaHasta);
}

// Cierra un vínculo (no lo elimina): setea vigenciaHasta y motivoCierre.
// Útil para divorcio, mayoría de edad, fallecimiento, etc.
function cerrarVinculoFamiliar(leg, id, vigenciaHasta, motivo){
  const lista = getFamiliaresEmp(leg);
  const f = lista.find(x => x.id === id);
  if(!f) return { ok:false, error:'Familiar no encontrado' };
  if(f.vigenciaHasta) return { ok:false, error:'El vínculo ya estaba cerrado' };
  if(!vigenciaHasta) return { ok:false, error:'Falta la fecha de cierre' };
  if(vigenciaHasta < f.vigenciaDesde) return { ok:false, error:'La fecha de cierre no puede ser anterior a la de inicio' };
  f.vigenciaHasta = vigenciaHasta;
  f.motivoCierre  = motivo || '';
  f.actualizado   = new Date().toISOString();
  f.actualizado_por = currentUser?.emp?.nom || 'RRHH';
  saveFamiliaresEmp(leg, lista);
  return { ok:true };
}

// Reactiva un vínculo cerrado por error (vuelve a vigente).
function reactivarVinculoFamiliar(leg, id){
  const lista = getFamiliaresEmp(leg);
  const f = lista.find(x => x.id === id);
  if(!f) return { ok:false, error:'Familiar no encontrado' };
  if(!f.vigenciaHasta) return { ok:false, error:'El vínculo ya estaba vigente' };
  f.vigenciaHasta = null;
  f.motivoCierre  = '';
  f.actualizado   = new Date().toISOString();
  f.actualizado_por = currentUser?.emp?.nom || 'RRHH';
  saveFamiliaresEmp(leg, lista);
  return { ok:true };
}

function _famTipoInfo(tipo){
  return FAM_TIPOS.find(t => t.v === tipo) || { v:tipo, label:tipo, icon:'👤' };
}

// Etiqueta visual para género (icono + label legible)
function _famGeneroInfo(g){
  const map = {
    masculino: { icon:'♂', label:'Masculino' },
    femenino:  { icon:'♀', label:'Femenino' },
    otro:      { icon:'⚧', label:'Otro' }
  };
  return map[g] || null;
}

function _famFmtFecha(iso){
  if(!iso) return '';
  if(iso.includes('-')){ const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
  return iso;
}

function _famCalcularEdad(fechaNac){
  if(!fechaNac) return null;
  try {
    const nac = new Date(fechaNac);
    if(isNaN(nac)) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if(m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  } catch(e){ return null; }
}

function _famValidarDni(dni){
  const s = String(dni||'').replace(/\./g,'').replace(/\s/g,'').trim();
  if(!s) return null; // DNI no obligatorio
  if(!/^\d{7,9}$/.test(s)) return 'El DNI debe tener entre 7 y 9 dígitos';
  return null; // OK
}

// Normaliza un CUIL al formato XX-XXXXXXXX-X (acepta entrada con o sin guiones)
function _famNormalizarCuil(raw){
  const s = String(raw||'').replace(/[\s\-\.]/g,'').trim();
  if(!s) return '';
  if(!/^\d{11}$/.test(s)) return raw; // devuelve original si no son 11 dígitos
  return `${s.slice(0,2)}-${s.slice(2,10)}-${s.slice(10,11)}`;
}

function _famValidarCuil(cuil){
  const s = String(cuil||'').replace(/[\s\-\.]/g,'').trim();
  if(!s) return null; // CUIL no obligatorio
  if(!/^\d{11}$/.test(s)) return 'El CUIL debe tener 11 dígitos (formato: XX-XXXXXXXX-X)';
  // Validación de dígito verificador (algoritmo AFIP)
  const mult = [5,4,3,2,7,6,5,4,3,2];
  let suma = 0;
  for(let i=0; i<10; i++) suma += parseInt(s[i],10) * mult[i];
  const resto = suma % 11;
  let dv = 11 - resto;
  if(dv === 11) dv = 0;
  if(dv === 10) dv = 9; // regla AFIP
  if(dv !== parseInt(s[10],10)) return 'El dígito verificador del CUIL no es válido';
  return null;
}

// ═══════════════════════════════════════════════════════════════
// PANEL EMPLEADO — Mis familiares
// ═══════════════════════════════════════════════════════════════
// Antes este módulo se desplegaba inline dentro de "Mis Datos" mediante
// toggleMisFamiliares(). Ahora vive en su propia sección (sec-familiares)
// accesible desde el botón "Mis Familiares" de la home del empleado.
// El alias toggleMisFamiliares() queda como compat para llamadas viejas.
function toggleMisFamiliares(){
  // Compatibilidad hacia atrás: redirige a la sección dedicada.
  if(typeof nav === 'function') nav('familiares');
}

function renderMisFamiliares(){
  const w = document.getElementById('mis-familiares-wrap');
  if(!w || !currentUser) return;
  const leg = currentUser.emp.leg;
  const todos = getFamiliaresEmp(leg);
  const sortFn = (a,b) => {
    const ia = FAM_TIPOS.findIndex(t => t.v === a.tipo);
    const ib = FAM_TIPOS.findIndex(t => t.v === b.tipo);
    if(ia !== ib) return (ia<0?99:ia) - (ib<0?99:ib);
    return (a.fecha_nac||'').localeCompare(b.fecha_nac||'');
  };
  const vigentes = todos.filter(f => !f.vigenciaHasta).sort(sortFn);
  const cerrados = todos.filter(f => !!f.vigenciaHasta).sort((a,b)=>(b.vigenciaHasta||'').localeCompare(a.vigenciaHasta||''));

  // Actualizar contador de la home-card (solo cuenta vigentes)
  const homeCnt = document.getElementById('home-fam-count');
  if(homeCnt){
    if(vigentes.length > 0){
      homeCnt.style.display = 'inline-block';
      homeCnt.textContent = `${vigentes.length} vigente${vigentes.length!==1?'s':''}`;
    } else {
      homeCnt.style.display = 'none';
    }
  }

  const _MOTIVOS = {
    mayoria_edad: 'Mayoría de edad',
    divorcio: 'Divorcio / separación',
    fallecimiento: 'Fallecimiento',
    autonomia: 'Autonomía económica',
    error_carga: 'Error de carga',
    otro: 'Otro'
  };

  const renderFila = (f, esCerrado) => {
    const tInfo = _famTipoInfo(f.tipo);
    const edad = _famCalcularEdad(f.fecha_nac);
    const fechaVinculoLabel = tInfo.fechaLabel || '';
    const acciones = esCerrado
      ? `<button class="btn btn-ghost" onclick="reactivarMiVinculo('${f.id}')" style="font-size:11px;padding:5px 10px;color:var(--green);border-color:rgba(34,197,94,.3)" title="Reactivar (se cerró por error)">↺</button>
         <button class="btn btn-ghost" onclick="eliminarFamiliar('${f.id}')" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar definitivamente">✕</button>`
      : `<button class="btn btn-ghost" onclick="abrirFormFamiliar('${f.id}')" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" title="Editar">✎</button>
         <button class="btn btn-ghost" onclick="abrirCerrarVinculo('${f.id}')" style="font-size:11px;padding:5px 10px;color:var(--yellow);border-color:rgba(234,179,8,.3)" title="Cerrar vínculo (preserva histórico)">⊘</button>
         <button class="btn btn-ghost" onclick="eliminarFamiliar('${f.id}')" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar (sin histórico)">✕</button>`;
    const motivoLabel = f.motivoCierre ? (_MOTIVOS[f.motivoCierre] || f.motivoCierre) : '';
    return `
      <div class="card" style="background:var(--bg2);padding:12px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;${esCerrado?'opacity:.6':''}">
        <div style="font-size:28px;line-height:1">${tInfo.icon}</div>
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${(f.apellido||'').toUpperCase()}, ${(f.nombre||'').toUpperCase()}</span>
            <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(94,194,255,.1);color:rgb(94,194,255);border:1px solid rgba(94,194,255,.3);text-transform:uppercase">${tInfo.label}</span>
            ${esCerrado
              ? `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.08);color:var(--red);border:1px solid rgba(239,68,68,.3);text-transform:uppercase">CERRADO</span>`
              : `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.08);color:var(--green);border:1px solid rgba(34,197,94,.3);text-transform:uppercase">VIGENTE</span>`}
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:flex;flex-wrap:wrap;gap:14px">
            ${f.dni?`<span>📄 DNI ${f.dni}</span>`:''}
            ${f.cuil?`<span>🆔 CUIL ${f.cuil}</span>`:''}
            ${(()=>{ const g=_famGeneroInfo(f.genero); return g?`<span>${g.icon} ${g.label}</span>`:''; })()}
            ${f.fecha_nac?`<span>🎂 ${_famFmtFecha(f.fecha_nac)}${edad!==null?` (${edad} años)`:''}</span>`:''}
            ${tInfo.conFecha && f.fecha_vinculo?`<span>💍 ${fechaVinculoLabel}: ${_famFmtFecha(f.fecha_vinculo)}</span>`:''}
          </div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:4px">
            Vigente desde ${_famFmtFecha(f.vigenciaDesde)}${esCerrado ? ` · cerrado el ${_famFmtFecha(f.vigenciaHasta)}${motivoLabel?` (${motivoLabel})`:''}`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${acciones}</div>
      </div>`;
  };

  let html = `
    <div class="card" style="padding:20px 22px;max-width:880px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(94,194,255,.1);color:rgb(94,194,255);border:1px solid rgba(94,194,255,.3)">GRUPO FAMILIAR</span>
      </div>
      <div style="font-size:12px;color:var(--t2);line-height:1.6;margin-bottom:16px">
        Cargá tu grupo familiar declarado: padres, cónyuge o concubino/a, hijos e hijastros. Estos datos sirven a RR.HH. para gestiones de obra social, asignaciones familiares y trámites administrativos. Los vínculos llevan vigencia para conservar el histórico (divorcio, fallecimiento, mayoría de edad).
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${vigentes.length} vigente${vigentes.length!==1?'s':''}${cerrados.length?' · '+cerrados.length+' en histórico':''}</div>
        <button class="btn btn-primary" onclick="abrirFormFamiliar(null)" style="font-size:12px;padding:7px 14px">+ Agregar familiar</button>
      </div>`;

  if(vigentes.length === 0 && cerrados.length === 0){
    html += `
      <div style="padding:36px;text-align:center;color:var(--t3);background:var(--bg2);border:1px dashed var(--border);border-radius:var(--r);font-size:12px">
        <div style="font-size:34px;margin-bottom:10px">👨‍👩‍👧‍👦</div>
        <div style="font-size:14px;color:var(--t2);margin-bottom:4px">Aún no cargaste familiares</div>
        <div style="font-size:11px">Tocá <b>+ Agregar familiar</b> para sumar el primero.</div>
      </div>`;
  } else {
    if(vigentes.length){
      html += `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">`;
      for(const f of vigentes) html += renderFila(f, false);
      html += `</div>`;
    }
    if(cerrados.length){
      html += `<details style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px">
        <summary style="cursor:pointer;color:var(--t1);font-size:12px;font-weight:500">📜 Histórico (${cerrados.length} vínculo${cerrados.length!==1?'s':''} cerrado${cerrados.length!==1?'s':''})</summary>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          ${cerrados.map(f => renderFila(f, true)).join('')}
        </div>
      </details>`;
    }
  }

  html += `</div>`;
  w.innerHTML = html;
}

// ─── Modal "Cerrar vínculo" — usado desde Mis Familiares (empleado) ──────
function abrirCerrarVinculo(id, legParam){
  const leg = legParam || currentUser?.emp?.leg;
  if(!leg) return;
  const lista = getFamiliaresEmp(leg);
  const f = lista.find(x => x.id === id);
  if(!f){ toast('⚠ Vínculo no encontrado','var(--red)'); return; }

  const tInfo = _famTipoInfo(f.tipo);
  const html = `
    <div id="modal-cerrar-vinculo" style="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)" onclick="if(event.target===this)cerrarModalCerrarVinculo()">
      <div class="card" style="padding:0;max-width:480px;width:100%;border:1px solid var(--border)">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg2)">
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⊘ Cerrar vínculo</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${tInfo.icon} ${tInfo.label} · ${(f.apellido||'').toUpperCase()}, ${(f.nombre||'').toUpperCase()}</div>
        </div>
        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
          <div style="background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--yellow);line-height:1.6">
            ℹ️ Cerrar el vínculo <strong>conserva el histórico</strong>. Si cargaste por error, mejor eliminá directamente.
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px">Fecha de cierre *</label>
            <input type="date" id="cerrar-vinc-fecha" value="${_hoyIsoFam()}" max="${_hoyIsoFam()}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px">Motivo *</label>
            <select id="cerrar-vinc-motivo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              <option value="">— Elegí un motivo —</option>
              ${(f.tipo==='hijo'||f.tipo==='hija'||f.tipo==='hijastro'||f.tipo==='hijastra')?'<option value="mayoria_edad">Mayoría de edad</option>':''}
              ${(f.tipo==='conyuge'||f.tipo==='concubino')?'<option value="divorcio">Divorcio / separación</option>':''}
              <option value="fallecimiento">Fallecimiento</option>
              <option value="autonomia">Autonomía económica</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="cerrarModalCerrarVinculo()" style="font-size:13px;padding:8px 14px">Cancelar</button>
          <button class="btn" onclick="confirmarCerrarVinculo('${leg}','${id}')" style="font-size:13px;padding:8px 18px;background:var(--yellow);color:#222;border-color:var(--yellow)">⊘ Cerrar vínculo</button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

function cerrarModalCerrarVinculo(){
  const m = document.getElementById('modal-cerrar-vinculo');
  if(m) m.remove();
}

async function confirmarCerrarVinculo(leg, id){
  const fecha = document.getElementById('cerrar-vinc-fecha')?.value;
  const motivo = document.getElementById('cerrar-vinc-motivo')?.value;
  if(!fecha){ toast('⚠ Indicá la fecha de cierre','var(--yellow)'); return; }
  if(!motivo){ toast('⚠ Indicá el motivo','var(--yellow)'); return; }
  const r = cerrarVinculoFamiliar(leg, id, fecha, motivo);
  if(!r.ok){ toast('⚠ ' + r.error,'var(--red)'); return; }
  cerrarModalCerrarVinculo();
  toast('✓ Vínculo cerrado · queda en el histórico','var(--green)');
  if(typeof renderMisFamiliares === 'function') renderMisFamiliares();
  if(typeof renderFamiliaresPanel === 'function') renderFamiliaresPanel();
  const det = document.getElementById('modal-familiares-emp');
  if(det){ const legAttr = det.dataset.leg; if(legAttr) abrirDetalleFamiliaresEmp(legAttr); }
}

// Reactiva un vínculo cerrado (para usar desde la UI del empleado).
async function reactivarMiVinculo(id){
  const leg = currentUser?.emp?.leg;
  if(!leg) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Reactivar este vínculo? Volverá a estar vigente desde hoy.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const r = reactivarVinculoFamiliar(leg, id);
  if(!r.ok){ toast('⚠ ' + r.error,'var(--red)'); return; }
  toast('✓ Vínculo reactivado','var(--green)');
  if(typeof renderMisFamiliares === 'function') renderMisFamiliares();
}

// Versión RRHH (recibe el legajo del empleado en lugar de tomarlo del currentUser)
async function reactivarFamiliarRRHH(id, leg){
  if(!leg) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Reactivar este vínculo? Volverá a estar vigente desde hoy.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const r = reactivarVinculoFamiliar(leg, id);
  if(!r.ok){ toast('⚠ ' + r.error,'var(--red)'); return; }
  toast('✓ Vínculo reactivado','var(--green)');
  if(typeof renderFamiliaresPanel === 'function') renderFamiliaresPanel();
  if(typeof abrirDetalleFamiliaresEmp === 'function') abrirDetalleFamiliaresEmp(leg);
}

// ═══════════════════════════════════════════════════════════════
// MODAL FORMULARIO (alta / edición de un familiar)
// ═══════════════════════════════════════════════════════════════
function abrirFormFamiliar(idEdit, legParam){
  // legParam permite a RR.HH. operar sobre cualquier empleado;
  // si no se pasa, se usa el legajo del empleado logueado
  const leg = legParam || currentUser?.emp?.leg;
  if(!leg){ toast('⚠ No se pudo determinar el empleado','var(--red)'); return; }

  const lista = getFamiliaresEmp(leg);
  const f = idEdit ? lista.find(x => x.id === idEdit) : null;
  const editing = !!f;

  const prev = document.getElementById('modal-familiar');
  if(prev) prev.remove();

  const tipoActual = f?.tipo || 'hijo';
  const tInfo = _famTipoInfo(tipoActual);
  const conFecha = !!tInfo.conFecha;

  const tipoOpts = FAM_TIPOS.map(t =>
    `<option value="${t.v}" ${tipoActual===t.v?'selected':''}>${t.icon} ${t.label}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-familiar';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2)">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${editing?'✎ Editar familiar':'+ Agregar familiar'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">Empleado · Legajo ${leg}</div>
        </div>
        <button onclick="cerrarFormFamiliar()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Vínculo *</label>
          <select id="fam-tipo" onchange="_famActualizarFechaVinculo()"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            ${tipoOpts}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Apellido *</label>
            <input type="text" id="fam-apellido" value="${(f?.apellido||'').replace(/"/g,'&quot;')}" placeholder="Ej: Pérez"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Nombre *</label>
            <input type="text" id="fam-nombre" value="${(f?.nombre||'').replace(/"/g,'&quot;')}" placeholder="Ej: María Eugenia"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Fecha de nacimiento</label>
            <input type="date" id="fam-fecha-nac" value="${f?.fecha_nac||''}" max="${new Date().toISOString().slice(0,10)}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">DNI</label>
            <input type="text" id="fam-dni" value="${(f?.dni||'').replace(/"/g,'&quot;')}" placeholder="Ej: 30123456" maxlength="11"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">CUIL</label>
            <input type="text" id="fam-cuil" value="${(f?.cuil||'').replace(/"/g,'&quot;')}" placeholder="Ej: 27-30123456-4" maxlength="13" onblur="(function(el){const v=_famNormalizarCuil(el.value);if(v) el.value=v;})(this)"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Formato XX-XXXXXXXX-X — se autocompleta</div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Género</label>
            <select id="fam-genero"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              <option value="" ${!f?.genero?'selected':''}>—</option>
              <option value="masculino" ${f?.genero==='masculino'?'selected':''}>♂ Masculino</option>
              <option value="femenino"  ${f?.genero==='femenino'?'selected':''}>♀ Femenino</option>
              <option value="otro"      ${f?.genero==='otro'?'selected':''}>⚧ Otro</option>
            </select>
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Opcional</div>
          </div>
        </div>

        <div id="fam-fecha-vinculo-wrap" style="display:${conFecha?'block':'none'}">
          <label id="fam-fecha-vinculo-label" style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">${tInfo.fechaLabel || 'Fecha de vínculo'}</label>
          <input type="date" id="fam-fecha-vinculo" value="${f?.fecha_vinculo||''}" max="${new Date().toISOString().slice(0,10)}"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          <div style="font-size:10px;color:var(--t3);margin-top:3px">Fecha desde la cual existe el vínculo (matrimonio o unión)</div>
        </div>

        <!-- Vigencia del vínculo -->
        <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Vigencia del vínculo</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px">Vigente desde *</label>
              <input type="date" id="fam-vig-desde" value="${f?.vigenciaDesde || f?.fecha_vinculo || new Date().toISOString().slice(0,10)}"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px">Vigente hasta (vacío = activo)</label>
              <input type="date" id="fam-vig-hasta" value="${f?.vigenciaHasta || ''}"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
          </div>
          <div style="margin-top:10px">
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px">Motivo de cierre (si aplica)</label>
            <select id="fam-motivo-cierre" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              <option value="">— Sigue vigente —</option>
              <option value="mayoria_edad" ${f?.motivoCierre==='mayoria_edad'?'selected':''}>Mayoría de edad</option>
              <option value="divorcio" ${f?.motivoCierre==='divorcio'?'selected':''}>Divorcio / separación</option>
              <option value="fallecimiento" ${f?.motivoCierre==='fallecimiento'?'selected':''}>Fallecimiento</option>
              <option value="autonomia" ${f?.motivoCierre==='autonomia'?'selected':''}>Autonomía económica</option>
              <option value="error_carga" ${f?.motivoCierre==='error_carga'?'selected':''}>Error de carga (cargado por equivocación)</option>
              <option value="otro" ${f?.motivoCierre==='otro'?'selected':''}>Otro</option>
            </select>
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Cerrar un vínculo conserva el histórico (no lo elimina). Útil para divorcios, hijos que cumplen 18, fallecimientos.</div>
          </div>
        </div>
      </div>

      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="cerrarFormFamiliar()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarFamiliar('${leg}', ${editing?`'${f.id}'`:'null'})" style="font-size:13px;padding:8px 18px">${editing?'Guardar cambios':'Agregar'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', ev => { if(ev.target === modal) cerrarFormFamiliar(); });
  setTimeout(()=>{ const el=document.getElementById(editing?'fam-apellido':'fam-tipo'); if(el) el.focus(); }, 50);
}

// Mostrar/ocultar el campo "fecha desde" según tipo seleccionado
async function _famActualizarFechaVinculo(){
  const tipo = document.getElementById('fam-tipo')?.value;
  const wrap = document.getElementById('fam-fecha-vinculo-wrap');
  const label = document.getElementById('fam-fecha-vinculo-label');
  if(!tipo || !wrap) return;
  const tInfo = _famTipoInfo(tipo);
  if(tInfo.conFecha){
    wrap.style.display = 'block';
    if(label) label.textContent = tInfo.fechaLabel || 'Fecha desde';
  } else {
    wrap.style.display = 'none';
    const inp = document.getElementById('fam-fecha-vinculo');
    if(inp) inp.value = '';
  }
}

function cerrarFormFamiliar(){
  const m = document.getElementById('modal-familiar');
  if(m) m.remove();
}

async function guardarFamiliar(leg, idEdit){
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const tipo = gv('fam-tipo');
  const apellido = gv('fam-apellido');
  const nombre = gv('fam-nombre');
  const fecha_nac = gv('fam-fecha-nac');
  const dni = gv('fam-dni').replace(/\./g,'').replace(/\s/g,'');
  const cuilNorm = _famNormalizarCuil(gv('fam-cuil'));
  const genero = gv('fam-genero');
  const fecha_vinculo = gv('fam-fecha-vinculo');

  if(!tipo){ showAlert('Seleccioná el vínculo.', 'warning'); return; }
  if(!apellido){ showAlert('El apellido es obligatorio.', 'warning'); return; }
  if(!nombre){ showAlert('El nombre es obligatorio.', 'warning'); return; }

  const dniErr = _famValidarDni(dni);
  if(dniErr){ showAlert(dniErr, "error"); return; }

  const cuilErr = _famValidarCuil(cuilNorm);
  if(cuilErr){ showAlert(cuilErr, "error"); return; }

  // Coherencia DNI ↔ CUIL: los 8 dígitos del medio del CUIL deben coincidir con DNI (si ambos cargados)
  if(dni && cuilNorm){
    const cuilNum = cuilNorm.replace(/-/g,'');
    const dniDeCuil = cuilNum.slice(2, 10).replace(/^0+/,'');
    const dniNum = dni.replace(/^0+/,'');
    if(dniDeCuil !== dniNum){
      const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`Aviso: el DNI cargado (${dni}) no coincide con el del CUIL (${dniDeCuil}).<br><br>¿Querés guardarlo igual?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
    }
  }

  if(fecha_nac && fecha_nac > new Date().toISOString().slice(0,10)){
    showAlert('La fecha de nacimiento no puede ser futura.', 'warning'); return;
  }

  const tInfo = _famTipoInfo(tipo);
  if(tInfo.conFecha && fecha_vinculo && fecha_vinculo > new Date().toISOString().slice(0,10)){
    showAlert('La fecha de vínculo no puede ser futura.', 'warning'); return;
  }

  const lista = getFamiliaresEmp(leg);

  // Validar DNI duplicado dentro del mismo grupo familiar (solo si se cargó)
  if(dni){
    const dup = lista.find(x => x.dni && x.dni === dni && (!idEdit || x.id !== idEdit));
    if(dup){
      showAlert(`Ya hay un familiar con DNI ${dni} (${_famTipoInfo(dup.tipo).label}). No se puede repetir.`, "error");
      return;
    }
  }

  // Validar CUIL duplicado dentro del mismo grupo familiar (solo si se cargó)
  if(cuilNorm){
    const dupCuil = lista.find(x => x.cuil && x.cuil === cuilNorm && (!idEdit || x.id !== idEdit));
    if(dupCuil){
      showAlert(`Ya hay un familiar con CUIL ${cuilNorm} (${_famTipoInfo(dupCuil.tipo).label}). No se puede repetir.`, "error");
      return;
    }
  }

  // Vigencia del vínculo
  const vigDesde   = gv('fam-vig-desde') || _hoyIsoFam();
  const vigHasta   = gv('fam-vig-hasta') || null;  // null = vigente
  const motivoCie  = gv('fam-motivo-cierre');

  if(vigHasta && vigHasta < vigDesde){
    showAlert('La fecha "vigente hasta" no puede ser anterior a "vigente desde".', 'warning'); return;
  }

  // Validar único cónyuge / concubino VIGENTE: no pueden coexistir dos
  // (los cerrados sí pueden quedar en el histórico)
  if((tipo === 'conyuge' || tipo === 'concubino') && !vigHasta){
    const dup2 = lista.find(x =>
      (x.tipo === 'conyuge' || x.tipo === 'concubino') &&
      !x.vigenciaHasta &&  // solo los vigentes
      (!idEdit || x.id !== idEdit)
    );
    if(dup2){
      showAlert(`Ya tenés cargado un/a ${_famTipoInfo(dup2.tipo).label} VIGENTE. Cerrá ese vínculo (con motivo divorcio/fallecimiento) antes de cargar uno nuevo.`, "error");
      return;
    }
  }

  const data = {
    id: idEdit || 'fam_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    tipo, apellido, nombre, fecha_nac, dni,
    cuil: cuilNorm,
    genero,
    fecha_vinculo: tInfo.conFecha ? fecha_vinculo : '',
    vigenciaDesde: vigDesde,
    vigenciaHasta: vigHasta,
    motivoCierre:  vigHasta ? motivoCie : '',
    actualizado: new Date().toISOString(),
    actualizado_por: currentUser?.emp?.nom || 'Empleado'
  };

  if(idEdit){
    const i = lista.findIndex(x => x.id === idEdit);
    if(i >= 0){
      data.creado = lista[i].creado || data.actualizado;
      lista[i] = data;
    }
  } else {
    data.creado = data.actualizado;
    lista.push(data);
  }

  saveFamiliaresEmp(leg, lista);
  cerrarFormFamiliar();
  toast(`✓ Familiar ${idEdit?'actualizado':'agregado'}`, 'var(--green)');

  // Refrescar la vista activa según contexto.
  // El módulo del empleado ahora vive en sec-familiares (sección dedicada);
  // sólo re-renderiza si esa sección está activa para no rebotar la pantalla.
  const secFam = document.getElementById('sec-familiares');
  if(secFam && secFam.classList.contains('active')) renderMisFamiliares();
  const rrhhCont = document.getElementById('familiares-content');
  if(rrhhCont) renderFamiliaresPanel();
  // Si está abierto el detalle del empleado en el panel RRHH
  const detalle = document.getElementById('modal-familiares-emp');
  if(detalle){ const legAttr = detalle.dataset.leg; if(legAttr) abrirDetalleFamiliaresEmp(legAttr); }
}

async function eliminarFamiliar(id, legParam){
  const leg = legParam || currentUser?.emp?.leg;
  if(!leg) return;
  const lista = getFamiliaresEmp(leg);
  const f = lista.find(x => x.id === id);
  if(!f) return;
  const tInfo = _famTipoInfo(f.tipo);
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar a ${f.apellido}, ${f.nombre} (${tInfo.label})?<br><br>Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const nueva = lista.filter(x => x.id !== id);
  saveFamiliaresEmp(leg, nueva);
  toast('✓ Familiar eliminado', 'var(--red)');

  // Refrescar
  const secFam = document.getElementById('sec-familiares');
  if(secFam && secFam.classList.contains('active')) renderMisFamiliares();
  const rrhhCont = document.getElementById('familiares-content');
  if(rrhhCont) renderFamiliaresPanel();
  const detalle = document.getElementById('modal-familiares-emp');
  if(detalle){ const legAttr = detalle.dataset.leg; if(legAttr) abrirDetalleFamiliaresEmp(legAttr); }
}

// ═══════════════════════════════════════════════════════════════
// PANEL RR.HH. — Familiares de los empleados
// ═══════════════════════════════════════════════════════════════
let _famFiltroRRHH = { empresa:'', busqueda:'', soloConFam: false };

function renderFamiliaresPanel(){
  const cont = document.getElementById('familiares-content');
  if(!cont) return;

  const nomina = (typeof getNomina === 'function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
  const empresas = [...new Set(nomina.map(e => e.emp).filter(Boolean))].sort();
  const all = _famGetAll();

  // Filtros
  let lista = nomina.slice();
  if(_famFiltroRRHH.empresa) lista = lista.filter(e => e.emp === _famFiltroRRHH.empresa);
  if(_famFiltroRRHH.busqueda){
    const q = _famFiltroRRHH.busqueda.toLowerCase();
    lista = lista.filter(e =>
      (e.nom||'').toLowerCase().includes(q) ||
      (e.leg||'').toLowerCase().includes(q) ||
      (e.cuil||'').includes(q)
    );
  }
  // Información por empleado: cantidad de familiares VIGENTES (no histórico)
  const conMetricas = lista.map(e => ({ emp: e, fams: getFamiliaresVigentes(e.leg) }));
  if(_famFiltroRRHH.soloConFam){
    lista = conMetricas.filter(x => x.fams.length > 0).map(x => x.emp);
  }

  // Métricas globales: solo cuentan los VIGENTES
  const totalEmpl = nomina.length;
  let conFamCount = 0, totalFam = 0;
  for(const e of nomina){
    const arr = getFamiliaresVigentes(e.leg);
    if(arr.length > 0) conFamCount++;
    totalFam += arr.length;
  }
  const sinFam = totalEmpl - conFamCount;

  // Composición por tipo
  const composicion = {};
  for(const k of Object.keys(all)){
    for(const f of (all[k] || [])){
      // Solo vigentes (sin vigenciaHasta)
      if(!f.vigenciaHasta) composicion[f.tipo] = (composicion[f.tipo] || 0) + 1;
    }
  }

  let html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;margin-bottom:18px">
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Empleados</div>
        <div style="font-size:24px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:4px">${totalEmpl}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Con familiares</div>
        <div style="font-size:24px;font-weight:600;color:rgb(34,197,94);font-family:var(--font-mono);margin-top:4px">${conFamCount}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Sin cargar</div>
        <div style="font-size:24px;font-weight:600;color:${sinFam>0?'rgb(251,191,36)':'var(--t1)'};font-family:var(--font-mono);margin-top:4px">${sinFam}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Total familiares</div>
        <div style="font-size:24px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:4px">${totalFam}</div>
      </div>
    </div>`;

  // Mini composición por tipo
  if(totalFam > 0){
    const tipoChips = FAM_TIPOS.filter(t => composicion[t.v]).map(t =>
      `<span style="font-size:10px;font-family:var(--font-mono);padding:3px 9px;border-radius:99px;background:var(--bg2);border:1px solid var(--border);color:var(--t2)">${t.icon} ${t.label}: <b style="color:var(--t1)">${composicion[t.v]}</b></span>`
    ).join('');
    html += `
      <div class="card" style="padding:12px 16px;margin-bottom:14px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:8px">Composición por vínculo</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${tipoChips}</div>
      </div>`;
  }

  // Filtros + acciones
  html += `
    <div class="card" style="padding:12px 16px;margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <select onchange="_famSetFiltro('empresa', this.value)"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;min-width:200px;font-family:var(--font-mono)">
        <option value="">Todas las empresas</option>
        ${empresas.map(e => `<option value="${e}" ${_famFiltroRRHH.empresa===e?'selected':''}>${e}</option>`).join('')}
      </select>
      <input type="text" id="fam-rrhh-busq" placeholder="Buscar por nombre, legajo o CUIL..." value="${_famFiltroRRHH.busqueda||''}"
        oninput="_famSetFiltro('busqueda', this.value)"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;flex:1;min-width:200px">
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);cursor:pointer;font-family:var(--font-mono)">
        <input type="checkbox" ${_famFiltroRRHH.soloConFam?'checked':''} onchange="_famSetFiltro('soloConFam', this.checked)" style="width:15px;height:15px;cursor:pointer">
        <span>Solo con familiares</span>
      </label>
      <button class="btn btn-ghost" onclick="exportarFamiliaresExcel()" style="font-size:11px;padding:6px 12px;color:rgb(34,197,94);border-color:rgba(34,197,94,.3)">⬇ Excel</button>
      <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${lista.length} resultado${lista.length!==1?'s':''}</span>
    </div>`;

  if(lista.length === 0){
    html += `<div class="card" style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Sin empleados que coincidan con los filtros aplicados.</div>`;
  } else {
    // Agrupar por empresa
    const grupos = {};
    for(const e of lista){
      const k = e.emp || '(sin empresa)';
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(e);
    }

    for(const empresa of Object.keys(grupos).sort()){
      const empleadosEmp = grupos[empresa];
      html += `
        <div style="margin-bottom:18px">
          <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding:0 4px">
            🏢 ${empresa} <span style="color:var(--t3);font-weight:normal">· ${empleadosEmp.length} empleado${empleadosEmp.length!==1?'s':''}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${empleadosEmp.map(e => _famRenderFilaEmp(e)).join('')}
          </div>
        </div>`;
    }
  }

  cont.innerHTML = html;
}

function _famRenderFilaEmp(emp){
  const fams = getFamiliaresVigentes(emp.leg);  // solo vigentes para los chips
  const totalCerrados = getFamiliaresHistorico(emp.leg).length;
  // Composición rápida por tipo (icono + cantidad)
  const composicion = {};
  for(const f of fams){ composicion[f.tipo] = (composicion[f.tipo]||0)+1; }
  const chips = FAM_TIPOS.filter(t => composicion[t.v]).map(t =>
    `<span title="${t.label}" style="font-size:11px;padding:1px 7px;border-radius:99px;background:var(--bg2);border:1px solid var(--border);color:var(--t2);white-space:nowrap">${t.icon} ${composicion[t.v]}</span>`
  ).join('') + (totalCerrados>0 ? `<span title="${totalCerrados} cerrado${totalCerrados!==1?'s':''} en histórico" style="font-size:10px;padding:1px 6px;border-radius:99px;background:var(--bg2);border:1px dashed var(--border);color:var(--t3);white-space:nowrap;font-family:var(--font-mono);cursor:help">📜 ${totalCerrados}</span>` : '');

  // Hijos vigentes que ya cumplieron 18 años — vínculos a revisar
  const hijosMayoria = getHijosConMayoria(emp.leg);
  const warningMayoria = hijosMayoria.length > 0
    ? `<span title="${hijosMayoria.length} hijo${hijosMayoria.length!==1?'s':''} vigente${hijosMayoria.length!==1?'s':''} con 18+ años — revisar/cerrar" style="font-size:10px;padding:1px 6px;border-radius:99px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:var(--yellow);white-space:nowrap;font-family:var(--font-mono);cursor:help;margin-left:4px">⚠ ${hijosMayoria.length} mayor${hijosMayoria.length!==1?'es':''}</span>`
    : '';

  return `
    <div onclick="abrirDetalleFamiliaresEmp('${emp.leg}')" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;cursor:pointer;transition:all .15s"
      onmouseover="this.style.borderColor='rgba(94,194,255,.4)';this.style.background='var(--bg3)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg2)'">
      <div style="min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">${emp.nom||'(sin nombre)'}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${emp.leg||'—'} · ${emp.cuil||'—'}${emp.lugar?' · 📍 '+emp.lugar:''}${emp.tarea?' · '+emp.tarea:''}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:280px">
        ${fams.length === 0 ? '<span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);font-style:italic">Sin familiares</span>' : chips}
        ${warningMayoria}
      </div>
      <div style="text-align:center;min-width:60px">
        <div style="font-size:18px;font-weight:600;color:${fams.length>0?'var(--t1)':'var(--t3)'};font-family:var(--font-mono)">${fams.length}</div>
        <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">familiar${fams.length!==1?'es':''}</div>
      </div>
    </div>`;
}

function _famSetFiltro(campo, valor){
  _famFiltroRRHH[campo] = valor;
  renderFamiliaresPanel();
  if(campo === 'busqueda'){
    setTimeout(()=>{
      const el = document.getElementById('fam-rrhh-busq');
      if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
  }
}

// ═══════════════════════════════════════════════════════════════
// MODAL DE DETALLE (RR.HH. abre el grupo familiar de un empleado)
// ═══════════════════════════════════════════════════════════════
function abrirDetalleFamiliaresEmp(leg){
  const emp = empByLeg(leg);
  if(!emp){ toast('⚠ Empleado no encontrado','var(--red)'); return; }

  const sortFn = (a,b) => {
    const ia = FAM_TIPOS.findIndex(t => t.v === a.tipo);
    const ib = FAM_TIPOS.findIndex(t => t.v === b.tipo);
    if(ia !== ib) return (ia<0?99:ia) - (ib<0?99:ib);
    return (a.fecha_nac||'').localeCompare(b.fecha_nac||'');
  };
  const todos    = getFamiliaresEmp(leg);
  const vigentes = todos.filter(f => !f.vigenciaHasta).sort(sortFn);
  const cerrados = todos.filter(f => !!f.vigenciaHasta).sort((a,b)=>(b.vigenciaHasta||'').localeCompare(a.vigenciaHasta||''));

  const _MOTIVOS = {
    mayoria_edad:'Mayoría de edad', divorcio:'Divorcio / separación',
    fallecimiento:'Fallecimiento', autonomia:'Autonomía económica',
    error_carga:'Error de carga', otro:'Otro'
  };

  const prev = document.getElementById('modal-familiares-emp');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-familiares-emp';
  modal.dataset.leg = leg;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  const renderFila = (f, esCerrado) => {
    const tInfo = _famTipoInfo(f.tipo);
    const edad = _famCalcularEdad(f.fecha_nac);
    const motivoLabel = f.motivoCierre ? (_MOTIVOS[f.motivoCierre]||f.motivoCierre) : '';
    const acciones = esCerrado
      ? `<button class="btn btn-ghost" onclick="reactivarFamiliarRRHH('${f.id}','${leg}')" style="font-size:11px;padding:5px 10px;color:var(--green);border-color:rgba(34,197,94,.3)" title="Reactivar">↺</button>
         <button class="btn btn-ghost" onclick="eliminarFamiliar('${f.id}','${leg}')" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar definitivo">✕</button>`
      : `<button class="btn btn-ghost" onclick="abrirFormFamiliar('${f.id}','${leg}')" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" title="Editar">✎</button>
         <button class="btn btn-ghost" onclick="abrirCerrarVinculo('${f.id}','${leg}')" style="font-size:11px;padding:5px 10px;color:var(--yellow);border-color:rgba(234,179,8,.3)" title="Cerrar vínculo">⊘</button>
         <button class="btn btn-ghost" onclick="eliminarFamiliar('${f.id}','${leg}')" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar (sin histórico)">✕</button>`;
    return `
      <div class="card" style="background:var(--bg2);padding:12px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;${esCerrado?'opacity:.6':''}">
        <div style="font-size:28px;line-height:1">${tInfo.icon}</div>
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${(f.apellido||'').toUpperCase()}, ${(f.nombre||'').toUpperCase()}</span>
            <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(94,194,255,.1);color:rgb(94,194,255);border:1px solid rgba(94,194,255,.3);text-transform:uppercase">${tInfo.label}</span>
            ${esCerrado
              ? `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.08);color:var(--red);border:1px solid rgba(239,68,68,.3);text-transform:uppercase">CERRADO</span>`
              : `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.08);color:var(--green);border:1px solid rgba(34,197,94,.3);text-transform:uppercase">VIGENTE</span>`}
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:flex;flex-wrap:wrap;gap:14px">
            ${f.dni?`<span>📄 DNI ${f.dni}</span>`:''}
            ${f.cuil?`<span>🆔 CUIL ${f.cuil}</span>`:''}
            ${(()=>{ const g=_famGeneroInfo(f.genero); return g?`<span>${g.icon} ${g.label}</span>`:''; })()}
            ${f.fecha_nac?`<span>🎂 ${_famFmtFecha(f.fecha_nac)}${edad!==null?` (${edad} años)`:''}</span>`:''}
            ${tInfo.conFecha && f.fecha_vinculo?`<span>💍 ${tInfo.fechaLabel}: ${_famFmtFecha(f.fecha_vinculo)}</span>`:''}
          </div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:4px">
            Vigente desde ${_famFmtFecha(f.vigenciaDesde)}${esCerrado ? ` · cerrado ${_famFmtFecha(f.vigenciaHasta)}${motivoLabel?` (${motivoLabel})`:''}`:''}
          </div>
          ${f.actualizado?`<div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">Últ. modif: ${new Date(f.actualizado).toLocaleString('es-AR')}${f.actualizado_por?' · '+f.actualizado_por:''}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">${acciones}</div>
      </div>`;
  };

  let body = '';
  if(todos.length === 0){
    body = `
      <div style="padding:30px;text-align:center;color:var(--t3);font-size:13px">
        <div style="font-size:30px;margin-bottom:8px">👨‍👩‍👧‍👦</div>
        <div style="font-size:14px;color:var(--t2);margin-bottom:4px">Este empleado no cargó familiares todavía</div>
        <div style="font-size:11px">Podés cargarle uno tocando "+ Agregar familiar" si necesitás dejar el dato registrado.</div>
      </div>`;
  } else {
    body = '';
    if(vigentes.length){
      body += `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">${vigentes.map(f=>renderFila(f,false)).join('')}</div>`;
    }
    if(cerrados.length){
      body += `<details style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px">
        <summary style="cursor:pointer;color:var(--t1);font-size:12px;font-weight:500">📜 Histórico (${cerrados.length} cerrado${cerrados.length!==1?'s':''})</summary>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          ${cerrados.map(f=>renderFila(f,true)).join('')}
        </div>
      </details>`;
    }
  }

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:760px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2);position:sticky;top:0;z-index:2">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">👨‍👩‍👧 ${emp.nom||'(sin nombre)'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${legD(emp.leg)} · ${emp.cuil||''} · ${emp.emp||''}</div>
        </div>
        <button onclick="document.getElementById('modal-familiares-emp').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 22px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${vigentes.length} vigente${vigentes.length!==1?'s':''}${cerrados.length?' · '+cerrados.length+' en histórico':''}</div>
          <button class="btn btn-primary" onclick="abrirFormFamiliar(null,'${leg}')" style="font-size:12px;padding:7px 14px">+ Agregar familiar</button>
        </div>
        ${body}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-familiares-emp').remove()" style="font-size:13px;padding:8px 16px">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', ev => { if(ev.target === modal) modal.remove(); });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN A EXCEL (RR.HH.)
// ═══════════════════════════════════════════════════════════════
function exportarFamiliaresExcel(){
  // Reutiliza el helper de SheetJS de HyS si existe; si no, intenta cargar
  const cargarYExportar = () => {
    const XLSX = window.XLSX;
    if(!XLSX){ toast('⚠ Librería Excel no disponible','var(--red)'); return; }

    const wb = XLSX.utils.book_new();
    const nomina = (typeof getNomina === 'function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
    const all = _famGetAll();

    // Hoja 1: detalle de familiares
    const filasDet = [['LEGAJO','EMPLEADO','EMPRESA','VÍNCULO','APELLIDO','NOMBRE','DNI','CUIL','GENERO','FECHA_NACIMIENTO','EDAD','FECHA_VINCULO','OBSERVACIONES']];
    for(const e of nomina){
      const fams = all[e.leg] || [];
      for(const f of fams){
        const tInfo = _famTipoInfo(f.tipo);
        const edad = _famCalcularEdad(f.fecha_nac);
        const gInfo = _famGeneroInfo(f.genero);
        filasDet.push([
          e.leg, e.nom, e.emp, tInfo.label,
          f.apellido||'', f.nombre||'',
          f.dni||'',
          f.cuil||'',
          gInfo ? gInfo.label : '',
          _famFmtFecha(f.fecha_nac),
          edad !== null ? edad : '',
          tInfo.conFecha ? _famFmtFecha(f.fecha_vinculo) : '',
          tInfo.conFecha ? tInfo.fechaLabel : ''
        ]);
      }
    }
    const wsD = XLSX.utils.aoa_to_sheet(filasDet);
    wsD['!cols'] = [{wch:10},{wch:32},{wch:20},{wch:14},{wch:20},{wch:20},{wch:12},{wch:16},{wch:12},{wch:14},{wch:6},{wch:14},{wch:24}];
    XLSX.utils.book_append_sheet(wb, wsD, 'Familiares');

    // Hoja 2: resumen por empleado
    const filasRes = [['LEGAJO','EMPLEADO','EMPRESA','TOTAL_FAMILIARES','PADRES','CONYUGE_CONCUBINO','HIJOS','HIJASTROS']];
    for(const e of nomina){
      const fams = all[e.leg] || [];
      const c = { padre:0, madre:0, conyuge:0, concubino:0, hijo:0, hija:0, hijastro:0, hijastra:0 };
      for(const f of fams){ if(c[f.tipo]!==undefined) c[f.tipo]++; }
      filasRes.push([
        e.leg, e.nom, e.emp,
        fams.length,
        c.padre + c.madre,
        c.conyuge + c.concubino,
        c.hijo + c.hija,
        c.hijastro + c.hijastra
      ]);
    }
    const wsR = XLSX.utils.aoa_to_sheet(filasRes);
    wsR['!cols'] = [{wch:10},{wch:32},{wch:20},...Array(5).fill({wch:14})];
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumen por empleado');

    XLSX.writeFile(wb, `familiares_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast('✓ Excel descargado','var(--green)');
  };

  if(window.XLSX){ cargarYExportar(); return; }
  // Cargar SheetJS dinámicamente (mismo CDN que HyS)
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = cargarYExportar;
  s.onerror = () => showAlert('No se pudo cargar la librería de Excel.', 'warning');
  document.head.appendChild(s);
}


// ═══════════════════════════════════════════════════════════════
// MÓDULO SANCIONES DISCIPLINARIAS
// Flujo: Gerente solicita → RR.HH. evalúa y aplica → Gerente recibe notificación
// Storage: localStorage 'lsg_sanciones' = [sanciones...]
