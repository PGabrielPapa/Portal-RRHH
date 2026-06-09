// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 55 — BENEFICIOS GERENCIALES / ESTRATÉGICOS
// ───────────────────────────────────────────────────────────────────────────
// Gestión del paquete de beneficios por empleado:
//   - Combustible, gastos de vehículo, medicina prepaga, adicionales fuera
//     de recibo, tarjeta corporativa, estacionamiento, vivienda, y más.
//   - Cada beneficio tiene: elegible (s/n), vigencia desde/hasta, monto,
//     modalidad (fijo / reintegro), proveedor y campos específicos.
//   - Desde la ficha ABM del empleado (sección colapsable)
//   - Panel global RRHH con reportes por empleado y por tipo/empresa.
// Storage: localStorage 'leiten_beneficios'
// ═══════════════════════════════════════════════════════════════════════════

const LS_BEN = 'leiten_beneficios';

// ─── Catálogo de beneficios ───────────────────────────────────────────────
const BEN_CATALOGO = [
  {
    key: 'combustible',
    label: 'Combustible',
    icon: '⛽',
    grupo: 'Vehículo',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'limite_litros',  label:'Límite (litros/mes)',    tipo:'number' },
      { id:'tipo_nafta',     label:'Tipo de combustible',    tipo:'text',  ph:'Ej: Super, Premium, Gasoil' },
      { id:'tarjeta_nro',    label:'N° tarjeta combustible', tipo:'text' },
    ],
  },
  {
    key: 'gastos_vehiculo',
    label: 'Gastos de vehículo',
    icon: '🚗',
    grupo: 'Vehículo',
    modalidades: ['reintegro'],
    campos: [
      { id:'cubre_vtv',      label:'Cubre VTV',              tipo:'check' },
      { id:'cubre_seguro',   label:'Cubre seguro',           tipo:'check' },
      { id:'cubre_patente',  label:'Cubre patente',          tipo:'check' },
      { id:'cubre_mecanica', label:'Cubre mecánica',         tipo:'check' },
      { id:'cubre_lavado',   label:'Cubre lavado / detailing',tipo:'check' },
      { id:'limite_anual',   label:'Tope anual ($)',         tipo:'number' },
    ],
  },
  {
    key: 'prepaga',
    label: 'Medicina prepaga',
    icon: '🏥',
    grupo: 'Salud',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'empresa_med',    label:'Empresa de medicina',    tipo:'text',  ph:'Ej: OSDE, Swiss Medical, Galeno' },
      { id:'plan',           label:'Plan',                   tipo:'text',  ph:'Ej: 310, 410, Gold Plus' },
      { id:'nro_afiliado',   label:'N° afiliado',            tipo:'text' },
      { id:'cubre_grupo',    label:'Cubre grupo familiar',   tipo:'check' },
      { id:'cant_adherentes',label:'Cantidad de adherentes', tipo:'number' },
    ],
  },
  {
    key: 'adicional_recibo',
    label: 'Adicional fuera de recibo',
    icon: '💵',
    grupo: 'Remuneración',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'concepto',       label:'Concepto / descripción', tipo:'text',  ph:'Ej: Plus gerencial, Bono de retención' },
      { id:'forma_pago',     label:'Forma de pago',          tipo:'select', ops:['Transferencia bancaria','Efectivo','Cheque'] },
      { id:'periodicidad',   label:'Periodicidad',           tipo:'select', ops:['Mensual','Trimestral','Semestral','Anual','Por evento'] },
    ],
  },
  {
    key: 'tarjeta_corp',
    label: 'Tarjeta corporativa',
    icon: '💳',
    grupo: 'Gastos',
    modalidades: ['fijo'],
    campos: [
      { id:'banco',          label:'Banco / emisor',         tipo:'text',  ph:'Ej: HSBC, Galicia, Santander' },
      { id:'red',            label:'Red',                    tipo:'select', ops:['Visa','Mastercard','American Express','Cabal'] },
      { id:'nro_tarjeta',    label:'Últimos 4 dígitos',      tipo:'text',  ph:'XXXX', maxlen:4 },
      { id:'limite_mensual', label:'Límite mensual ($)',     tipo:'number' },
      { id:'rubros_autorizados', label:'Rubros autorizados', tipo:'text',  ph:'Ej: Viáticos, Comidas, Hotel' },
    ],
  },


  {
    key: 'estacionamiento',
    label: 'Estacionamiento',
    icon: '🅿️',
    grupo: 'Vehículo',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'cochera_dir',    label:'Dirección / parking',    tipo:'text' },
      { id:'cochera_nro',    label:'Número de cochera',      tipo:'text' },
    ],
  },
  {
    key: 'vivienda',
    label: 'Vivienda / alojamiento',
    icon: '🏠',
    grupo: 'Vivienda',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'tipo_viv',       label:'Tipo',                   tipo:'select', ops:['Alquiler a cargo','Subsidio alquiler','Casa corporativa','Hotel long-stay'] },
      { id:'direccion_viv',  label:'Dirección',              tipo:'text' },
    ],
  },
  {
    key: 'educacion',
    label: 'Educación / capacitación',
    icon: '🎓',
    grupo: 'Desarrollo',
    modalidades: ['reintegro','fijo'],
    campos: [
      { id:'tipo_edu',       label:'Tipo',                   tipo:'select', ops:['Posgrado / MBA','Idiomas','Cursos técnicos','Licencias de software','Suscripciones'] },
      { id:'institucion',    label:'Institución',            tipo:'text' },
      { id:'limite_anual_edu', label:'Tope anual ($)',       tipo:'number' },
    ],
  },
  {
    key: 'seguro_vida',
    label: 'Seguro de vida adicional',
    icon: '🛡',
    grupo: 'Salud',
    modalidades: ['fijo'],
    campos: [
      { id:'aseguradora',    label:'Aseguradora',            tipo:'text' },
      { id:'capital_aseg',   label:'Capital asegurado ($)',  tipo:'number' },
      { id:'beneficiarios',  label:'Beneficiarios',          tipo:'text',  ph:'Nombre(s) según póliza' },
    ],
  },
  {
    key: 'club_gimnasio',
    label: 'Club / Gimnasio',
    icon: '🏋️',
    grupo: 'Bienestar',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'nombre_club',    label:'Club / Gimnasio',        tipo:'text' },
      { id:'cubre_familia',  label:'Cubre grupo familiar',   tipo:'check' },
    ],
  },
  {
    key: 'otro',
    label: 'Otro beneficio',
    icon: '🎁',
    grupo: 'Otros',
    modalidades: ['fijo','reintegro'],
    campos: [
      { id:'descripcion_otro', label:'Descripción',          tipo:'text' },
    ],
  },
];

// ─── Grupos del catálogo ─────────────────────────────────────────────────
const BEN_GRUPOS = [...new Set(BEN_CATALOGO.map(b => b.grupo))];

// ─── Persistencia ────────────────────────────────────────────────────────
function _benLeer(){ try{ return JSON.parse(localStorage.getItem(LS_BEN)||'[]'); }catch{ return []; } }
function _benGuardar(arr){ try{ localStorage.setItem(LS_BEN, JSON.stringify(arr)); }catch(e){ console.error('ben save',e); } }
function _benDeLeg(leg){ return _benLeer().filter(b => b.leg === leg); }

function _benHoy(){ return new Date().toISOString().slice(0,10); }
function _benFmt(iso){ if(!iso) return '—'; const [y,m,d]=String(iso).split('-'); return `${d}/${m}/${y}`; }

function _benEsVigente(b){
  if(!b.elegible) return false;
  const hoy = _benHoy();
  if(b.fecha_desde && b.fecha_desde > hoy) return false;
  if(b.fecha_hasta && b.fecha_hasta < hoy) return false;
  return true;
}

// ─── Badge en ficha empleado ─────────────────────────────────────────────
function _benActualizarBadgeFicha(leg){
  const badge = document.getElementById('ben-ficha-badge');
  if(!badge) return;
  const vigentes = _benDeLeg(leg).filter(_benEsVigente).length;
  badge.textContent = vigentes > 0 ? ` (${vigentes} activo${vigentes>1?'s':''})` : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL FICHA EMPLEADO
// ═══════════════════════════════════════════════════════════════════════════

function renderBeneficiosFichaABM(leg){
  const cont = document.getElementById('ben-ficha-content');
  if(!cont) return;

  const bens = _benDeLeg(leg);
  _benActualizarBadgeFicha(leg);

  const vigentes  = bens.filter(_benEsVigente);
  const inactivos = bens.filter(b => !_benEsVigente(b));
  const costoTotal = vigentes.reduce((s,b) => s + (Number(b.monto_mensual)||0), 0);

  cont.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="display:flex;gap:16px;align-items:center">
        <div style="font-size:12px;color:var(--t3)">
          ${vigentes.length} beneficio${vigentes.length!==1?'s':''} activo${vigentes.length!==1?'s':''}
          ${inactivos.length ? ` · ${inactivos.length} inactivo${inactivos.length!==1?'s':''}` : ''}
        </div>
        ${costoTotal>0 ? `<div style="font-size:12px;font-family:var(--font-mono);color:var(--accent2);font-weight:600">
          Costo mensual estimado: <strong>$&nbsp;${costoTotal.toLocaleString('es-AR',{minimumFractionDigits:2})}</strong>
        </div>` : ''}
      </div>
      <button class="btn btn-primary" onclick="benAbrirForm('${leg}',null)"
        style="font-size:11px;padding:5px 14px">➕ Agregar beneficio</button>
    </div>

    ${!bens.length ? `
      <div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Sin beneficios registrados.</div>` : `
      <div style="padding:10px 16px;display:flex;flex-direction:column;gap:8px">
        ${vigentes.map(b => _benCard(b, leg)).join('')}
        ${inactivos.length ? `
          <details style="margin-top:4px">
            <summary style="font-size:11px;color:var(--t3);cursor:pointer;padding:4px 0">
              📦 ${inactivos.length} beneficio${inactivos.length!==1?'s':''} inactivo${inactivos.length!==1?'s':''}
            </summary>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
              ${inactivos.map(b => _benCard(b, leg, true)).join('')}
            </div>
          </details>` : ''}
      </div>`}
  `;
}

function _benCard(b, leg, historial=false){
  const cat = BEN_CATALOGO.find(c => c.key === b.tipo) || { icon:'🎁', label: b.tipo };
  const vigente = _benEsVigente(b);
  const color   = vigente ? 'rgba(99,102,241,.08)'  : 'rgba(148,163,184,.06)';
  const border  = vigente ? 'rgba(99,102,241,.25)'  : 'rgba(148,163,184,.2)';
  const textColor= vigente? 'var(--accent2)'        : 'var(--t3)';
  const opacity = historial ? 'opacity:.65;' : '';

  const modalLabel = b.modalidad === 'reintegro' ? '↩ Reintegro' : '$ Fijo mensual';

  // Campos extra destacados
  const highlights = [];
  if(b.empresa_med) highlights.push(`${b.empresa_med}${b.plan ? ' — ' + b.plan : ''}`);
  if(b.tarjeta_nro) highlights.push(`···· ${b.tarjeta_nro}`);
  if(b.nro_linea)   highlights.push(`☎ ${b.nro_linea}`);
  if(b.concepto)    highlights.push(b.concepto);

  return `<div style="${opacity}border:1px solid ${border};border-radius:var(--r);background:${color};padding:10px 14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${cat.icon}</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${cat.label}</div>
          ${highlights.length ? `<div style="font-size:11px;color:var(--t2);margin-top:1px">${highlights.join(' · ')}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">
        ${b.monto_mensual ? `<span style="font-size:12px;font-weight:700;color:${textColor};font-family:var(--font-mono)">$&nbsp;${Number(b.monto_mensual).toLocaleString('es-AR',{minimumFractionDigits:2})}<span style="font-size:9px;font-weight:400">/mes</span></span>` : ''}
        <span style="font-size:10px;color:var(--t3)">${modalLabel}</span>
        <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">Desde: ${_benFmt(b.fecha_desde)}</span>
        ${b.fecha_hasta ? `<span style="font-size:10px;font-family:var(--font-mono);color:var(--red)">Hasta: ${_benFmt(b.fecha_hasta)}</span>` : ''}
      </div>
    </div>
    ${b.observaciones ? `<div style="font-size:11px;color:var(--t3);margin-top:6px;font-style:italic">${b.observaciones}</div>` : ''}
    ${!historial ? `
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="benAbrirForm('${leg}','${b.id}')"
        style="font-size:10px;padding:3px 10px">✎ Editar</button>
      ${vigente ? `<button class="btn btn-ghost" onclick="benDesactivar('${b.id}','${leg}')"
        style="font-size:10px;padding:3px 10px;color:var(--yellow);border-color:rgba(234,179,8,.3)">⏸ Dar de baja</button>` : ''}
      <button class="btn btn-ghost" onclick="benEliminar('${b.id}','${leg}')"
        style="font-size:10px;padding:3px 10px;color:var(--red);border-color:rgba(239,68,68,.3)">✕</button>
    </div>` : ''}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL ALTA / EDICIÓN
// ═══════════════════════════════════════════════════════════════════════════

function benAbrirForm(leg, id){
  const elem = id ? _benLeer().find(b => b.id === id) : null;
  const emp  = (typeof getNomina==='function' ? getNomina() : []).find(e=>e.leg===leg)
             || { leg, nom:leg };
  _benMostrarModal(emp, elem);
}

function _benMostrarModal(emp, b){
  const edicion = !!b;
  const prev = document.getElementById('modal-ben');
  if(prev) prev.remove();

  const tipoActual = b?.tipo || 'combustible';

  const modal = document.createElement('div');
  modal.id = 'modal-ben';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;backdrop-filter:blur(4px);overflow-y:auto';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:640px;width:100%;border:1px solid var(--border);margin-top:16px">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${edicion?'Editar beneficio':'Agregar beneficio'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${emp.nom} — Leg. ${legD(emp.leg)}</div>
        </div>
        <button onclick="document.getElementById('modal-ben').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px;max-height:72vh;overflow-y:auto">

        <!-- Tipo de beneficio por grupo -->
        ${BEN_GRUPOS.map(g => {
          const items = BEN_CATALOGO.filter(c => c.grupo === g);
          return `
          <div>
            <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${g}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${items.map(c => `
                <button id="ben-tipo-btn-${c.key}" onclick="_benSelTipo('${c.key}')"
                  style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg2);cursor:pointer;font-size:12px;color:var(--t2);transition:all .15s">
                  <span>${c.icon}</span><span>${c.label}</span>
                </button>`).join('')}
            </div>
          </div>`;
        }).join('')}

        <div style="border-top:1px solid var(--border);margin:2px 0"></div>

        <!-- Elegible + Modalidad -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Elegible</label>
            <div style="display:flex;gap:8px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 14px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:13px;color:var(--t2)">
                <input type="radio" name="ben-elegible" value="1" ${(b?.elegible!==false)?'checked':''} style="cursor:pointer;accent-color:var(--green)"> ✅ Sí
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 14px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:13px;color:var(--t2)">
                <input type="radio" name="ben-elegible" value="0" ${b?.elegible===false?'checked':''} style="cursor:pointer;accent-color:var(--red)"> ✕ No
              </label>
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Modalidad</label>
            <select id="ben-modalidad" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
              <option value="fijo" ${(b?.modalidad||'fijo')==='fijo'?'selected':''}>$ Monto fijo mensual</option>
              <option value="reintegro" ${b?.modalidad==='reintegro'?'selected':''}>↩ Reintegro contra comprobante</option>
            </select>
          </div>
        </div>

        <!-- Monto + Moneda -->
        <div style="display:grid;grid-template-columns:1fr 120px;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Monto mensual estimado ($)</label>
            <input type="number" id="ben-monto" value="${b?.monto_mensual||''}" placeholder="0.00" step="0.01"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Moneda</label>
            <select id="ben-moneda" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
              <option value="ARS" ${(b?.moneda||'ARS')==='ARS'?'selected':''}>ARS $</option>
              <option value="USD" ${b?.moneda==='USD'?'selected':''}>USD u$s</option>
            </select>
          </div>
        </div>

        <!-- Vigencia -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Vigente desde *</label>
            <input type="date" id="ben-desde" value="${b?.fecha_desde||_benHoy()}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Vigente hasta (vacío = indefinido)</label>
            <input type="date" id="ben-hasta" value="${b?.fecha_hasta||''}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
        </div>

        <!-- Proveedor -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Proveedor / empresa</label>
          <input id="ben-proveedor" value="${b?.proveedor||''}" placeholder="Nombre del proveedor, aseguradora, prepaga..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
        </div>

        <!-- Campos dinámicos por tipo -->
        <div id="ben-campos-din"></div>

        <!-- Observaciones -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Observaciones / condiciones</label>
          <textarea id="ben-obs" rows="2" placeholder="Condiciones especiales, aclaraciones..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:var(--font-sans);box-sizing:border-box">${b?.observaciones||''}</textarea>
        </div>
      </div>

      <div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-ben').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_benGuardarModal('${emp.leg}','${b?.id||''}')" style="font-size:13px;padding:8px 20px">
          ${edicion?'✓ Guardar cambios':'➕ Agregar beneficio'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  _benSelTipo(tipoActual, b);
}

function _benSelTipo(tipo, datosExistentes){
  // Resaltar botón seleccionado
  BEN_CATALOGO.forEach(c => {
    const btn = document.getElementById(`ben-tipo-btn-${c.key}`);
    if(!btn) return;
    if(c.key === tipo){
      btn.style.borderColor  = 'var(--accent)';
      btn.style.background   = 'rgba(61,127,255,.1)';
      btn.style.color        = 'var(--accent2)';
      btn.style.fontWeight   = '600';
    } else {
      btn.style.borderColor  = 'var(--border)';
      btn.style.background   = 'var(--bg2)';
      btn.style.color        = 'var(--t2)';
      btn.style.fontWeight   = '400';
    }
  });
  // Guardar tipo en un hidden
  let hid = document.getElementById('ben-tipo-hid');
  if(!hid){ hid = document.createElement('input'); hid.type='hidden'; hid.id='ben-tipo-hid'; document.getElementById('modal-ben')?.appendChild(hid); }
  hid.value = tipo;

  // Renderizar campos dinámicos
  const cat = BEN_CATALOGO.find(c => c.key === tipo);
  const cont = document.getElementById('ben-campos-din');
  if(!cont || !cat?.campos?.length){ if(cont) cont.innerHTML=''; return; }

  const d = datosExistentes || {};
  const campos = cat.campos.map(c => {
    const val = (d[c.id] !== undefined ? d[c.id] : '');
    if(c.tipo === 'check'){
      return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--t2);padding:6px 10px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2)">
        <input type="checkbox" id="ben-c-${c.id}" ${val?'checked':''} style="cursor:pointer;accent-color:var(--accent);width:14px;height:14px">
        ${c.label}
      </label>`;
    }
    if(c.tipo === 'select'){
      return `<div>
        <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">${c.label}</label>
        <select id="ben-c-${c.id}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
          ${(c.ops||[]).map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>`;
    }
    // text / number / date
    return `<div>
      <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">${c.label}</label>
      <input type="${c.tipo}" id="ben-c-${c.id}" value="${String(val).replace(/"/g,'&quot;')}"
        placeholder="${c.ph||''}" ${c.maxlen?`maxlength="${c.maxlen}"`:''} ${c.tipo==='number'?'step="0.01"':''}
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box;font-family:${c.tipo==='number'||c.tipo==='date'?'var(--font-mono)':'inherit'}">
    </div>`;
  });

  // Layout: checks en fila, resto en grid 2 cols
  const checks = cat.campos.filter(c=>c.tipo==='check');
  const otros  = cat.campos.filter(c=>c.tipo!=='check');
  cont.innerHTML = `
    ${otros.length ? `<div style="display:grid;grid-template-columns:${otros.length===1?'1fr':'1fr 1fr'};gap:12px;margin-bottom:${checks.length?'10px':'0'}">
      ${otros.map(c => campos[cat.campos.indexOf(c)]).join('')}
    </div>` : ''}
    ${checks.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
      ${checks.map(c => campos[cat.campos.indexOf(c)]).join('')}
    </div>` : ''}
  `;
}

function _benGuardarModal(leg, idExistente){
  const tipo = document.getElementById('ben-tipo-hid')?.value;
  if(!tipo){ toast('⚠ Seleccioná un tipo de beneficio', 'var(--yellow)'); return; }
  const desde = document.getElementById('ben-desde')?.value;
  if(!desde){ toast('⚠ Ingresá la fecha de vigencia desde', 'var(--yellow)'); return; }

  const elegible = document.querySelector('input[name="ben-elegible"]:checked')?.value !== '0';
  const cat = BEN_CATALOGO.find(c => c.key === tipo);

  const base = {
    id:            idExistente || ('ben_' + Date.now()),
    leg,
    tipo,
    elegible,
    modalidad:     document.getElementById('ben-modalidad')?.value || 'fijo',
    monto_mensual: parseFloat(document.getElementById('ben-monto')?.value || '0') || 0,
    moneda:        document.getElementById('ben-moneda')?.value || 'ARS',
    fecha_desde:   desde,
    fecha_hasta:   document.getElementById('ben-hasta')?.value || '',
    proveedor:     document.getElementById('ben-proveedor')?.value?.trim() || '',
    observaciones: document.getElementById('ben-obs')?.value?.trim() || '',
    fecha_registro: _benHoy(),
    registrado_por: currentUser?.emp?.nom || 'RR.HH.',
  };

  // Campos dinámicos
  if(cat) cat.campos.forEach(c => {
    const el = document.getElementById(`ben-c-${c.id}`);
    if(!el) return;
    base[c.id] = c.tipo === 'check' ? el.checked : (el.value?.trim() || '');
  });

  const arr = _benLeer();
  if(idExistente){
    const idx = arr.findIndex(b => b.id === idExistente);
    if(idx !== -1) arr[idx] = { ...arr[idx], ...base };
    else arr.unshift(base);
  } else {
    arr.unshift(base);
  }
  _benGuardar(arr);

  if(typeof logAuditX === 'function'){
    logAuditX('beneficios', idExistente?'editar':'agregar', { id:base.id, leg, tipo, monto:base.monto_mensual });
  }

  document.getElementById('modal-ben')?.remove();
  renderBeneficiosFichaABM(leg);
  _benRefrescarGlobalSiVisible();
  toast(`✅ Beneficio ${idExistente?'actualizado':'registrado'}`, 'var(--green)', 3000);
}

// ─── Dar de baja y eliminar ───────────────────────────────────────────────
function benDesactivar(id, leg){
  const arr = _benLeer();
  const b = arr.find(x=>x.id===id);
  if(!b) return;
  if(typeof showConfirm === 'function'){
    showConfirm({ titulo:'Dar de baja', mensaje:`¿Dar de baja este beneficio? Se registrará la fecha de hoy como cierre.`, labelOk:'Confirmar baja', labelCancel:'Cancelar' })
      .then(ok => {
        if(!ok) return;
        b.fecha_hasta = _benHoy();
        _benGuardar(arr);
        renderBeneficiosFichaABM(leg);
        _benRefrescarGlobalSiVisible();
        if(typeof logAuditX === 'function') logAuditX('beneficios','baja',{id,leg});
        toast('Beneficio dado de baja', 'var(--t2)');
      });
  }
}

function benEliminar(id, leg){
  if(typeof showConfirm === 'function'){
    showConfirm({ titulo:'Eliminar beneficio', mensaje:'¿Eliminar este registro?', labelOk:'✕ Eliminar', labelCancel:'Cancelar' })
      .then(ok => {
        if(!ok) return;
        _benGuardar(_benLeer().filter(b=>b.id!==id));
        renderBeneficiosFichaABM(leg);
        _benRefrescarGlobalSiVisible();
        toast('Eliminado', 'var(--t2)');
      });
  }
}

function _benRefrescarGlobalSiVisible(){
  const cont = document.getElementById('ben-global-sec-cont');
  if(cont && cont.innerHTML.length > 20) renderBenGlobal();
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL GLOBAL RRHH
// ═══════════════════════════════════════════════════════════════════════════


// ── Selector de empleado — delega al helper genérico de 00-constants.js ──
function _benAbrirSelectorEmpleado(){
  _abrirSelectorEmpleado(
    '¿A qué empleado le agregás el beneficio?',
    'modal-ben-sel-emp',
    function(leg){ benAbrirForm(leg, null); }
  );
}



function renderBenGlobal(){
  const cont = document.getElementById('ben-global-sec-cont');
  if(!cont) return;

  const tabActual = cont.dataset.tab || 'empleados';
  const todos  = _benLeer();
  const nomina = typeof getNomina === 'function' ? getNomina() : [];
  const empMap = Object.fromEntries(nomina.map(e=>[e.leg,e]));

  // Stats globales
  const vigentes = todos.filter(_benEsVigente);
  const costoTotal = vigentes.reduce((s,b)=>s+(Number(b.monto_mensual)||0),0);
  const conBeneficios = new Set(vigentes.map(b=>b.leg)).size;
  const tipoMasFrecuente = (() => {
    const cnt = {};
    vigentes.forEach(b=>{ cnt[b.tipo]=(cnt[b.tipo]||0)+1; });
    const max = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    if(!max) return '—';
    const cat = BEN_CATALOGO.find(c=>c.key===max[0]);
    return `${cat?.icon||''} ${cat?.label||max[0]}`;
  })();

  cont.innerHTML = `
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      ${_benStat('🎁','Beneficios activos',vigentes.length,'var(--accent2)')}
      ${_benStat('👥','Empleados con beneficios',conBeneficios,'var(--green)')}
      ${_benStat('💰','Costo mensual estimado','$\u00a0'+costoTotal.toLocaleString('es-AR',{maximumFractionDigits:0}),'var(--yellow)')}
      ${_benStat('🏆','Más frecuente',tipoMasFrecuente,'var(--t2)')}
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;background:var(--bg2);border-radius:var(--r);padding:4px;width:fit-content;margin-bottom:16px">
      ${['empleados','tipo','empresa'].map(t=>`
        <button onclick="_benGlobalTab('${t}')"
          style="padding:6px 16px;font-size:12px;border-radius:6px;border:none;cursor:pointer;transition:all .15s;
          background:${tabActual===t?'var(--bg1)':'transparent'};
          color:${tabActual===t?'var(--t1)':'var(--t3)'};
          font-weight:${tabActual===t?600:400};
          ${tabActual===t?'border:.5px solid var(--border)':''}">
          ${{ empleados:'Por empleado', tipo:'Por tipo', empresa:'Por empresa' }[t]}
        </button>`).join('')}
    </div>

    <div id="ben-global-tab-body">
      ${tabActual==='empleados' ? _benTabEmpleados(todos, nomina, empMap)
       : tabActual==='tipo'     ? _benTabTipo(todos, nomina, empMap)
       :                          _benTabEmpresa(todos, nomina, empMap)}
    </div>
  `;
  cont.dataset.tab = tabActual;
}

function _benGlobalTab(tab){
  const cont = document.getElementById('ben-global-sec-cont');
  if(!cont) return;
  cont.dataset.tab = tab;
  renderBenGlobal();
}

function _benStat(icon, label, valor, color){
  return `<div style="border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);padding:12px 14px">
    <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${icon} ${label}</div>
    <div style="font-size:18px;font-weight:700;color:${color};font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${valor||'—'}</div>
  </div>`;
}

// ── Tab: por empleado ─────────────────────────────────────────────────────
function _benTabEmpleados(todos, nomina, empMap){
  // Filtros
  const fEmp  = document.getElementById('ben-fe-empresa')?.value || '';
  const fBusq = (document.getElementById('ben-fe-busq')?.value || '').toLowerCase();
  const fSolo = document.getElementById('ben-fe-solo')?.checked ?? true;

  // Agrupar por leg
  const porLeg = {};
  todos.forEach(b => { (porLeg[b.leg]=porLeg[b.leg]||[]).push(b); });

  let legs = Object.keys(porLeg);
  if(fSolo) legs = legs.filter(leg => porLeg[leg].some(_benEsVigente));
  if(fEmp)  legs = legs.filter(leg => empMap[leg]?.emp === fEmp);
  if(fBusq) legs = legs.filter(leg => {
    const e = empMap[leg];
    return (e?.nom||leg).toLowerCase().includes(fBusq);
  });
  legs.sort((a,b)=> (empMap[a]?.nom||a).localeCompare(empMap[b]?.nom||b));

  const empresas = [...new Set(nomina.map(e=>e.emp).filter(Boolean))].sort();

  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <input id="ben-fe-busq" placeholder="🔍 Buscar empleado..." oninput="_benGlobalTab('empleados')"
        value="${document.getElementById('ben-fe-busq')?.value||''}"
        style="flex:1;min-width:180px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:13px;outline:none">
      <select id="ben-fe-empresa" onchange="_benGlobalTab('empleados')"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
        <option value="">Todas las empresas</option>
        ${empresas.map(e=>`<option value="${e}" ${fEmp===e?'selected':''}>${e}</option>`).join('')}
      </select>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);cursor:pointer">
        <input type="checkbox" id="ben-fe-solo" ${fSolo?'checked':''} onchange="_benGlobalTab('empleados')"
          style="cursor:pointer;accent-color:var(--accent)">
        Solo con beneficios activos
      </label>
      <button class="btn btn-primary" onclick="_benAbrirSelectorEmpleado()" style="font-size:12px;padding:7px 14px">➕ Agregar beneficio</button>
      <button class="btn btn-ghost" onclick="_benExportarCsv()" style="font-size:12px;padding:7px 12px">📥 CSV</button>
    </div>

    ${!legs.length ? '<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">Sin resultados.</div>' : `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${legs.map(leg => {
        const emp = empMap[leg] || { nom:leg, emp:'—' };
        const bens = porLeg[leg];
        const vigentes = bens.filter(_benEsVigente);
        const costo = vigentes.reduce((s,b)=>s+(Number(b.monto_mensual)||0),0);
        return `<div style="border:1px solid var(--border);border-radius:var(--r);background:var(--bg1);padding:12px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--t1)">${emp.nom}</div>
              <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Leg ${leg} · ${emp.emp||'—'}</div>
            </div>
            <div style="text-align:right">
              ${costo>0 ? `<div style="font-size:14px;font-weight:700;color:var(--accent2);font-family:var(--font-mono)">$\u00a0${costo.toLocaleString('es-AR',{minimumFractionDigits:2})}<span style="font-size:9px;font-weight:400">/mes</span></div>` : ''}
              <div style="font-size:10px;color:var(--t3)">${vigentes.length} activo${vigentes.length!==1?'s':''} · ${bens.length} total</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${vigentes.map(b => {
              const cat = BEN_CATALOGO.find(c=>c.key===b.tipo)||{icon:'🎁',label:b.tipo};
              return `<span style="font-size:11px;padding:3px 10px;border-radius:10px;border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.06);color:var(--accent2)">
                ${cat.icon} ${cat.label}${b.monto_mensual?` · $${Number(b.monto_mensual).toLocaleString('es-AR',{maximumFractionDigits:0})}`:''}</span>`;
            }).join('')}
            ${!vigentes.length ? '<span style="font-size:11px;color:var(--t3);font-style:italic">Sin beneficios activos</span>' : ''}
          </div>
          <button class="btn btn-ghost" onclick="benAbrirForm('${leg}',null)" style="font-size:10px;padding:3px 10px;margin-top:8px">➕ Agregar</button>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:11px;color:var(--t3);margin-top:8px;font-family:var(--font-mono)">${legs.length} empleado${legs.length!==1?'s':''}</div>`}
  `;
}

// ── Tab: por tipo ────────────────────────────────────────────────────────
function _benTabTipo(todos, nomina, empMap){
  const vigentes = todos.filter(_benEsVigente);
  const porTipo  = {};
  vigentes.forEach(b => { (porTipo[b.tipo]=porTipo[b.tipo]||[]).push(b); });

  return `<div style="display:flex;flex-direction:column;gap:12px">
    ${BEN_CATALOGO.filter(c => porTipo[c.key]?.length).map(c => {
      const bens  = porTipo[c.key] || [];
      const costo = bens.reduce((s,b)=>s+(Number(b.monto_mensual)||0),0);
      const proveeds = [...new Set(bens.map(b=>b.proveedor).filter(Boolean))].slice(0,4);
      return `<div style="border:1px solid var(--border);border-radius:var(--r);background:var(--bg1);padding:14px 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">${c.icon}</span>
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--t1)">${c.label}</div>
              <div style="font-size:11px;color:var(--t3)">${bens.length} empleado${bens.length!==1?'s':''} con este beneficio</div>
            </div>
          </div>
          ${costo>0?`<div style="font-size:15px;font-weight:700;color:var(--accent2);font-family:var(--font-mono)">$\u00a0${costo.toLocaleString('es-AR',{maximumFractionDigits:0})}<span style="font-size:10px;font-weight:400">/mes total</span></div>`:''}
        </div>
        <div style="font-size:11px;color:var(--t2);margin-bottom:6px">
          ${bens.map(b=>{
            const emp=empMap[b.leg]||{nom:b.leg,emp:'—'};
            return `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 4px 2px 0;padding:2px 8px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);cursor:pointer" onclick="benAbrirForm('${b.leg}','${b.id}')" title="Editar">
              ${emp.nom} ${b.monto_mensual?`<span style="font-family:var(--font-mono);color:var(--t3)">$${Number(b.monto_mensual).toLocaleString('es-AR',{maximumFractionDigits:0})}</span>`:''}
            </span>`;
          }).join('')}
        </div>
        ${proveeds.length ? `<div style="font-size:10px;color:var(--t3)">Proveedores: ${proveeds.join(', ')}</div>` : ''}
      </div>`;
    }).join('')}
    ${!Object.keys(porTipo).length ? '<div style="text-align:center;padding:40px;color:var(--t3)">Sin beneficios activos.</div>' : ''}
  </div>`;
}

// ── Tab: por empresa ─────────────────────────────────────────────────────
function _benTabEmpresa(todos, nomina, empMap){
  const vigentes = todos.filter(_benEsVigente);
  const empresas = [...new Set(nomina.map(e=>e.emp).filter(Boolean))].sort();

  return `<div style="display:flex;flex-direction:column;gap:12px">
    ${empresas.map(emp => {
      const legs = nomina.filter(e=>e.emp===emp).map(e=>e.leg);
      const bens = vigentes.filter(b=>legs.includes(b.leg));
      if(!bens.length) return '';
      const costo = bens.reduce((s,b)=>s+(Number(b.monto_mensual)||0),0);
      const conBen = new Set(bens.map(b=>b.leg)).size;
      const porTipoEmp = {};
      bens.forEach(b=>{porTipoEmp[b.tipo]=(porTipoEmp[b.tipo]||0)+1;});
      return `<div style="border:1px solid var(--border);border-radius:var(--r);background:var(--bg1);padding:14px 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${emp}</div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:700;color:var(--accent2);font-family:var(--font-mono)">$\u00a0${costo.toLocaleString('es-AR',{maximumFractionDigits:0})}<span style="font-size:10px;font-weight:400">/mes</span></div>
            <div style="font-size:10px;color:var(--t3)">${conBen} empleado${conBen!==1?'s':''} · ${bens.length} beneficio${bens.length!==1?'s':''}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${Object.entries(porTipoEmp).map(([tipo,n])=>{
            const cat=BEN_CATALOGO.find(c=>c.key===tipo)||{icon:'🎁',label:tipo};
            return `<span style="font-size:11px;padding:3px 10px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);color:var(--t2)">${cat.icon} ${cat.label} (${n})</span>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────
function _benExportarCsv(){
  const todos  = _benLeer();
  const nomina = typeof getNomina === 'function' ? getNomina() : [];
  const empMap = Object.fromEntries(nomina.map(e=>[e.leg,e]));

  const cols = ['Legajo','Empleado','Empresa','Tipo de beneficio','Elegible','Modalidad',
                'Monto mensual','Moneda','Fecha desde','Fecha hasta','Estado',
                'Proveedor','Observaciones'];

  const rows = todos.map(b => {
    const emp  = empMap[b.leg] || {};
    const cat  = BEN_CATALOGO.find(c=>c.key===b.tipo)||{label:b.tipo};
    const est  = _benEsVigente(b) ? 'Activo' : 'Inactivo';
    return [b.leg, emp.nom||'', emp.emp||'', cat.label,
            b.elegible!==false?'Sí':'No', b.modalidad==='reintegro'?'Reintegro':'Fijo',
            b.monto_mensual||0, b.moneda||'ARS',
            _benFmt(b.fecha_desde), _benFmt(b.fecha_hasta), est,
            b.proveedor||'', b.observaciones||'']
      .map(v=>`"${String(v).replace(/"/g,'""')}"`)
      .join(',');
  });

  const csv = [cols.map(c=>`"${c}"`).join(','), ...rows].join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download= `beneficios_${_benHoy()}.csv`;
  a.click();
  toast('📥 CSV exportado', 'var(--green)', 2500);
}
