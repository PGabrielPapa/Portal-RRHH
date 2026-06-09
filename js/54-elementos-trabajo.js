// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO 54 — ELEMENTOS DE TRABAJO
// ───────────────────────────────────────────────────────────────────────────
// Registro de activos entregados a empleados: celulares, notebooks, autos,
// herramientas, ropa de trabajo, etc.
//
// Storage: localStorage key 'leiten_elementos_trabajo'
// Acceso:  desde ficha del empleado en ABM (sección colapsable)
//          desde panel RRHH (vista global por tipo / empresa)
// ═══════════════════════════════════════════════════════════════════════════

const LS_ET = 'leiten_elementos_trabajo';

// ─── Tipos de elementos con iconos y campos específicos ──────────────────
const ET_TIPOS = [
  { key:'celular',    label:'Celular / Smartphone',  icon:'📱', campos:['imei','nro_linea','operadora','plan','chip_nro'] },
  { key:'notebook',   label:'Notebook / Laptop',     icon:'💻', campos:['nro_serie','sistema_operativo','specs'] },
  { key:'tablet',     label:'Tablet',                icon:'📟', campos:['imei','nro_serie','sistema_operativo'] },
  { key:'auto',       label:'Vehículo / Auto',       icon:'🚗', campos:['patente','km_entrega','km_devolucion','seguro_vencimiento','vtv_vencimiento'] },
  { key:'herramienta',label:'Herramienta',            icon:'🔧', campos:['nro_serie','descripcion_extra'] },
  { key:'ropa',       label:'Ropa / EPP',             icon:'👕', campos:['talle','descripcion_extra'] },
  { key:'llave',      label:'Llave / Tarjeta de acceso', icon:'🔑', campos:['codigo_acceso','descripcion_extra'] },
  { key:'otro',       label:'Otro elemento',          icon:'📦', campos:['nro_serie','descripcion_extra'] },
];

const ET_ESTADOS = {
  entregado:  { label:'En uso',       color:'rgba(34,197,94,.15)',  border:'rgba(34,197,94,.4)',  text:'var(--green)' },
  devuelto:   { label:'Devuelto',     color:'rgba(148,163,184,.12)',border:'rgba(148,163,184,.3)',text:'var(--t3)' },
  perdido:    { label:'Extraviado',   color:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.3)',  text:'var(--red)' },
  roto:       { label:'Dado de baja', color:'rgba(234,179,8,.08)',  border:'rgba(234,179,8,.3)',  text:'var(--yellow)' },
};

// ─── Persistencia ────────────────────────────────────────────────────────
function _etLeer(){ try{ return JSON.parse(localStorage.getItem(LS_ET)||'[]'); }catch{ return []; } }
function _etGuardar(arr){ try{ localStorage.setItem(LS_ET, JSON.stringify(arr)); }catch(e){ console.error('et save',e); } }

function _etPorLeg(leg){ return _etLeer().filter(e => e.leg === leg); }

function _etFmtFecha(iso){
  if(!iso) return '—';
  const [y,m,d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

function _etHoy(){ return new Date().toISOString().slice(0,10); }

// ─── Badge en la ficha del empleado ──────────────────────────────────────
function _etActualizarBadgeFicha(leg){
  const badge = document.getElementById('et-ficha-badge');
  if(!badge) return;
  const activos = _etPorLeg(leg).filter(e => e.estado === 'entregado').length;
  badge.textContent = activos > 0 ? ` (${activos} activo${activos>1?'s':''})` : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL FICHA EMPLEADO — sección colapsable
// ═══════════════════════════════════════════════════════════════════════════

function renderElementosEmpleadoABM(leg){
  const cont = document.getElementById('et-ficha-content');
  if(!cont) return;
  const elementos = _etPorLeg(leg);
  _etActualizarBadgeFicha(leg);

  const activos   = elementos.filter(e => e.estado === 'entregado');
  const inactivos = elementos.filter(e => e.estado !== 'entregado');

  cont.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:12px;color:var(--t3)">
        ${activos.length} elemento${activos.length!==1?'s':''} en uso
        ${inactivos.length ? ` · ${inactivos.length} devuelto/dado de baja` : ''}
      </div>
      <button class="btn btn-primary" onclick="etAbrirFormNuevo('${leg}')"
        style="font-size:11px;padding:5px 14px">➕ Registrar elemento</button>
    </div>

    ${!elementos.length ? `
      <div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">
        Sin elementos registrados para este empleado.
      </div>` : `
      <div style="padding:10px 16px;display:flex;flex-direction:column;gap:8px">
        ${activos.map(e => _etCardElemento(e, leg)).join('')}
        ${inactivos.length ? `
          <details style="margin-top:4px">
            <summary style="font-size:11px;color:var(--t3);cursor:pointer;padding:4px 0">
              📦 ${inactivos.length} elemento${inactivos.length!==1?'s':''} histórico${inactivos.length!==1?'s':''}
            </summary>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
              ${inactivos.map(e => _etCardElemento(e, leg, true)).join('')}
            </div>
          </details>` : ''}
      </div>`}
  `;
}

function _etCardElemento(e, leg, historial=false){
  const tipo = ET_TIPOS.find(t => t.key === e.tipo) || { label: e.tipo, icon:'📦' };
  const est  = ET_ESTADOS[e.estado] || ET_ESTADOS.entregado;

  // Campos de identificación principales
  const tags = [];
  if(e.marca || e.modelo) tags.push(`${[e.marca,e.modelo].filter(Boolean).join(' ')}`);
  if(e.imei)     tags.push(`IMEI: ${e.imei}`);
  if(e.nro_linea)tags.push(`☎ ${e.nro_linea}`);
  if(e.patente)  tags.push(`🚗 ${e.patente}`);
  if(e.nro_serie)tags.push(`S/N: ${e.nro_serie}`);

  const opacity = historial ? 'opacity:.65;' : '';

  return `<div style="${opacity}border:1px solid ${est.border};border-radius:var(--r);background:${est.color};padding:10px 14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${tipo.icon}</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${tipo.label}</div>
          ${tags.length ? `<div style="font-size:11px;color:var(--t2);margin-top:2px">${tags.join(' &nbsp;·&nbsp; ')}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span style="font-size:10px;font-weight:600;color:${est.text};border:1px solid ${est.border};padding:2px 8px;border-radius:10px">${est.label}</span>
        <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">Entrega: ${_etFmtFecha(e.fecha_entrega)}</span>
        ${e.fecha_devolucion ? `<span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">Dev.: ${_etFmtFecha(e.fecha_devolucion)}</span>` : ''}
      </div>
    </div>
    ${e.observaciones ? `<div style="font-size:11px;color:var(--t3);margin-top:6px;font-style:italic">${e.observaciones}</div>` : ''}
    ${_etVencimientosAlerta(e)}
    ${!historial ? `
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="etAbrirFormEditar('${e.id}','${leg}')"
        style="font-size:10px;padding:3px 10px">✎ Editar</button>
      ${e.estado === 'entregado' ? `
      <button class="btn btn-ghost" onclick="etRegistrarDevolucion('${e.id}','${leg}')"
        style="font-size:10px;padding:3px 10px;color:var(--green);border-color:rgba(34,197,94,.3)">↩ Registrar devolución</button>` : ''}
      <button class="btn btn-ghost" onclick="etEliminar('${e.id}','${leg}')"
        style="font-size:10px;padding:3px 10px;color:var(--red);border-color:rgba(239,68,68,.3)">✕</button>
    </div>` : ''}
  </div>`;
}

function _etVencimientosAlerta(e){
  const alertas = [];
  const hoy = new Date();
  const DIAS_AVISO = 30;

  const chk = (fld, label) => {
    if(!e[fld]) return;
    const f = new Date(e[fld]);
    const diff = Math.floor((f - hoy) / 86400000);
    if(diff < 0)        alertas.push(`<span style="color:var(--red)">⚠ ${label} vencida hace ${Math.abs(diff)} días</span>`);
    else if(diff <= DIAS_AVISO) alertas.push(`<span style="color:var(--yellow)">⚠ ${label} vence en ${diff} días</span>`);
  };

  chk('seguro_vencimiento', 'Seguro');
  chk('vtv_vencimiento', 'VTV');

  return alertas.length
    ? `<div style="font-size:11px;margin-top:6px;display:flex;flex-direction:column;gap:2px">${alertas.join('')}</div>`
    : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL ALTA / EDICIÓN
// ═══════════════════════════════════════════════════════════════════════════

function etAbrirFormNuevo(leg){
  const emp = (typeof getNomina==='function' ? getNomina() : []).find(e=>e.leg===leg)
           || { leg, nom: leg };
  _etMostrarModal({ leg, nom: emp.nom }, null);
}

function etAbrirFormEditar(id, leg){
  const elem = _etLeer().find(e => e.id === id);
  if(!elem){ toast('⚠ Elemento no encontrado', 'var(--red)'); return; }
  const emp = (typeof getNomina==='function' ? getNomina() : []).find(e=>e.leg===leg)
           || { leg, nom: leg };
  _etMostrarModal({ leg, nom: emp.nom }, elem);
}

function _etMostrarModal(empInfo, elem){
  const edicion = !!elem;
  const prev = document.getElementById('modal-et');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-et';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;backdrop-filter:blur(4px);overflow-y:auto';

  const tipoActual = elem?.tipo || 'celular';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:580px;width:100%;border:1px solid var(--border);margin-top:16px">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${edicion?'Editar elemento':'Registrar elemento de trabajo'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${empInfo.nom} — Leg. ${legD(empInfo.leg)}</div>
        </div>
        <button onclick="document.getElementById('modal-et').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow-y:auto">

        <!-- Tipo -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Tipo de elemento *</label>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
            ${ET_TIPOS.map(t => `
              <label style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:8px 6px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:11px;color:var(--t2);text-align:center;transition:all .15s"
                id="et-tipo-lbl-${t.key}" onclick="_etSeleccionarTipo('${t.key}')">
                <input type="radio" name="et-tipo" value="${t.key}" ${tipoActual===t.key?'checked':''}
                  style="display:none">
                <span style="font-size:20px">${t.icon}</span>
                <span style="line-height:1.2">${t.label.split('/')[0].trim()}</span>
              </label>`).join('')}
          </div>
        </div>

        <!-- Marca / Modelo / Estado -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_etField('et-marca','Marca',elem?.marca||'','Ej: Apple, Samsung, Lenovo...')}
          ${_etField('et-modelo','Modelo',elem?.modelo||'','Ej: iPhone 14, ThinkPad X1...')}
        </div>

        <!-- Campos dinámicos según tipo -->
        <div id="et-campos-dinamicos">
          ${_etCamposDinamicosHtml(tipoActual, elem)}
        </div>

        <!-- Fechas + Estado -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Fecha de entrega *</label>
            <input type="date" id="et-fecha-entrega" value="${elem?.fecha_entrega||_etHoy()}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Estado</label>
            <select id="et-estado" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
              ${Object.entries(ET_ESTADOS).map(([k,v])=>`<option value="${k}" ${(elem?.estado||'entregado')===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Fecha devolución (se muestra si estado != entregado) -->
        <div id="et-dev-row" style="${(elem?.estado||'entregado')==='entregado'?'display:none':''}">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Fecha de devolución / baja</label>
          <input type="date" id="et-fecha-devolucion" value="${elem?.fecha_devolucion||''}"
            style="width:220px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>

        <!-- Entregado por / Recibido por -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_etField('et-entregado-por','Entregado por',elem?.entregado_por||currentUser?.emp?.nom||'','')}
          ${_etField('et-recibido-por','Recibido / firmado por',elem?.recibido_por||'','')}
        </div>

        <!-- Número de inventario / activo fijo -->
        ${_etField('et-nro-inventario','N° inventario / activo fijo',elem?.nro_inventario||'','Ej: AF-00342')}

        <!-- Observaciones -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Observaciones</label>
          <textarea id="et-obs" rows="2" placeholder="Estado físico al momento de la entrega, aclaraciones..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:var(--font-sans);box-sizing:border-box">${elem?.observaciones||''}</textarea>
        </div>

      </div>

      <div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-et').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_etGuardarModal('${empInfo.leg}','${edicion?elem.id:''}')" style="font-size:13px;padding:8px 20px">
          ${edicion?'✓ Guardar cambios':'➕ Registrar elemento'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  _etResaltarTipoSeleccionado(tipoActual);

  // Mostrar/ocultar fecha devolución según estado
  document.getElementById('et-estado')?.addEventListener('change', function(){
    const devRow = document.getElementById('et-dev-row');
    if(devRow) devRow.style.display = this.value === 'entregado' ? 'none' : 'block';
  });
}

function _etField(id, label, value, placeholder){
  return `<div>
    <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">${label}</label>
    <input id="${id}" value="${(value||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}"
      style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
  </div>`;
}

function _etSeleccionarTipo(tipo){
  document.querySelectorAll('input[name="et-tipo"]').forEach(r => r.checked = r.value === tipo);
  _etResaltarTipoSeleccionado(tipo);
  const elem = null; // al cambiar tipo, limpiar campos dinámicos
  const _etCampDiv = document.getElementById('et-campos-dinamicos'); if(_etCampDiv) _etCampDiv.innerHTML = _etCamposDinamicosHtml(tipo, null);
}

function _etResaltarTipoSeleccionado(tipo){
  ET_TIPOS.forEach(t => {
    const lbl = document.getElementById(`et-tipo-lbl-${t.key}`);
    if(!lbl) return;
    if(t.key === tipo){
      lbl.style.borderColor = 'var(--accent)';
      lbl.style.background  = 'rgba(61,127,255,.08)';
      lbl.style.color       = 'var(--accent2)';
      lbl.style.fontWeight  = '600';
    } else {
      lbl.style.borderColor = 'var(--border)';
      lbl.style.background  = 'var(--bg2)';
      lbl.style.color       = 'var(--t2)';
      lbl.style.fontWeight  = '400';
    }
  });
}

function _etCamposDinamicosHtml(tipo, elem){
  const cfg = ET_TIPOS.find(t => t.key === tipo);
  if(!cfg || !cfg.campos.length) return '';

  const LABELS = {
    imei:                 ['IMEI',              'Ex: 356938035643809'],
    nro_linea:            ['Número de línea',   'Ej: 11-2345-6789'],
    operadora:            ['Operadora',         'Ej: Personal, Claro, Movistar'],
    plan:                 ['Plan',              'Ej: Plan Empresas Plus'],
    chip_nro:             ['N° de SIM/chip',    ''],
    nro_serie:            ['N° de serie',       ''],
    sistema_operativo:    ['Sistema operativo', 'Ej: Windows 11, macOS 14'],
    specs:                ['Especificaciones',  'Ej: i7, 16GB RAM, 512GB SSD'],
    patente:              ['Patente',           'Ej: ABC 123 / AB123CD'],
    km_entrega:           ['KM al entregar',    ''],
    km_devolucion:        ['KM al devolver',    ''],
    seguro_vencimiento:   ['Venc. seguro',      ''],
    vtv_vencimiento:      ['Venc. VTV',         ''],
    talle:                ['Talle',             'Ej: M, L, XL / 42'],
    codigo_acceso:        ['Código / N° tarjeta',''],
    descripcion_extra:    ['Descripción',        ''],
  };

  const campos = cfg.campos;
  const es_fecha = (k) => k === 'seguro_vencimiento' || k === 'vtv_vencimiento';
  const es_numero = (k) => k === 'km_entrega' || k === 'km_devolucion';

  const html = campos.map(k => {
    const [lbl, ph] = LABELS[k] || [k, ''];
    const val = (elem?.[k] || '').toString().replace(/"/g,'&quot;');
    const type = es_fecha(k) ? 'date' : es_numero(k) ? 'number' : 'text';
    return `<div>
      <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">${lbl}</label>
      <input type="${type}" id="et-c-${k}" value="${val}" placeholder="${ph}"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box;font-family:${type==='date'||type==='number'?'var(--font-mono)':'inherit'}">
    </div>`;
  });

  const cols = campos.length === 1 ? '1fr' : '1fr 1fr';
  return `<div style="display:grid;grid-template-columns:${cols};gap:12px">${html.join('')}</div>`;
}

function _etGuardarModal(leg, idExistente){
  const tipo = document.querySelector('input[name="et-tipo"]:checked')?.value;
  if(!tipo){ toast('⚠ Elegí un tipo de elemento', 'var(--yellow)'); return; }

  const fechaEntrega = document.getElementById('et-fecha-entrega')?.value;
  if(!fechaEntrega){ toast('⚠ Ingresá la fecha de entrega', 'var(--yellow)'); return; }

  const estado = document.getElementById('et-estado')?.value || 'entregado';

  // Campos comunes
  const base = {
    id:              idExistente || ('et_' + Date.now()),
    leg,
    tipo,
    marca:           document.getElementById('et-marca')?.value?.trim() || '',
    modelo:          document.getElementById('et-modelo')?.value?.trim() || '',
    fecha_entrega:   fechaEntrega,
    fecha_devolucion:estado !== 'entregado' ? (document.getElementById('et-fecha-devolucion')?.value || '') : '',
    estado,
    entregado_por:   document.getElementById('et-entregado-por')?.value?.trim() || '',
    recibido_por:    document.getElementById('et-recibido-por')?.value?.trim() || '',
    nro_inventario:  document.getElementById('et-nro-inventario')?.value?.trim() || '',
    observaciones:   document.getElementById('et-obs')?.value?.trim() || '',
    fecha_registro:  _etHoy(),
    registrado_por:  currentUser?.emp?.nom || 'RR.HH.',
  };

  // Campos dinámicos del tipo
  const cfg = ET_TIPOS.find(t => t.key === tipo);
  if(cfg) cfg.campos.forEach(k => {
    const el = document.getElementById(`et-c-${k}`);
    base[k] = el?.value?.trim() || '';
  });

  const arr = _etLeer();
  if(idExistente){
    const idx = arr.findIndex(e => e.id === idExistente);
    if(idx !== -1) arr[idx] = { ...arr[idx], ...base };
    else arr.unshift(base);
  } else {
    arr.unshift(base);
  }
  _etGuardar(arr);

  if(typeof logAuditX === 'function'){
    logAuditX('elementos_trabajo', idExistente ? 'editar' : 'registrar', { id: base.id, leg, tipo, marca: base.marca, modelo: base.modelo });
  }

  document.getElementById('modal-et')?.remove();
  renderElementosEmpleadoABM(leg);
  renderEtGlobalIfVisible();
  toast(`✅ Elemento ${idExistente?'actualizado':'registrado'}`, 'var(--green)', 3000);
}

// ─── Devolución rápida ────────────────────────────────────────────────────
function etRegistrarDevolucion(id, leg){
  const arr = _etLeer();
  const elem = arr.find(e => e.id === id);
  if(!elem){ toast('⚠ Elemento no encontrado', 'var(--red)'); return; }

  const tipo = ET_TIPOS.find(t => t.key === elem.tipo) || { label: elem.tipo, icon: '📦' };
  const desc = [elem.marca, elem.modelo].filter(Boolean).join(' ') || tipo.label;

  if(typeof showConfirm === 'function'){
    showConfirm({
      titulo: 'Registrar devolución',
      mensaje: `¿Confirmar devolución de "${desc}"? Se registrará con fecha de hoy.`,
      labelOk: '↩ Confirmar devolución',
      labelCancel: 'Cancelar'
    }).then(ok => {
      if(!ok) return;
      _etEjecutarDevolucion(arr, elem, leg);
    });
  } else {
    _etEjecutarDevolucion(arr, elem, leg);
  }
}

function _etEjecutarDevolucion(arr, elem, leg){
  elem.estado = 'devuelto';
  elem.fecha_devolucion = _etHoy();
  _etGuardar(arr);
  renderElementosEmpleadoABM(leg);
  renderEtGlobalIfVisible();
  if(typeof logAuditX === 'function'){
    logAuditX('elementos_trabajo', 'devolucion', { id: elem.id, leg, tipo: elem.tipo });
  }
  toast('↩ Devolución registrada', 'var(--green)', 3000);
}

// ─── Eliminar ─────────────────────────────────────────────────────────────
function etEliminar(id, leg){
  if(typeof showConfirm === 'function'){
    showConfirm({
      titulo: 'Eliminar registro',
      mensaje: '¿Eliminar este elemento del historial? Esta acción no se puede deshacer.',
      labelOk: '✕ Eliminar',
      labelCancel: 'Cancelar'
    }).then(ok => {
      if(!ok) return;
      _etGuardar(_etLeer().filter(e => e.id !== id));
      renderElementosEmpleadoABM(leg);
      renderEtGlobalIfVisible();
      toast('Elemento eliminado', 'var(--t2)');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL GLOBAL RRHH — vista completa de todos los elementos
// ═══════════════════════════════════════════════════════════════════════════


// ── Selector de empleado — delega al helper genérico de 00-constants.js ──
function _etAbrirSelectorEmpleado(){
  _abrirSelectorEmpleado(
    '¿A qué empleado le asignás el elemento?',
    'modal-et-sel-emp',
    etAbrirFormNuevo
  );
}



function renderEtGlobal(){
  const cont = document.getElementById('et-global-sec-contenido');
  if(!cont) return;

  const todos   = _etLeer();
  const nomina  = typeof getNomina === 'function' ? getNomina() : [];
  const empMap  = Object.fromEntries(nomina.map(e=>[e.leg, e]));

  // Filtros
  const fTipo   = document.getElementById('et-g-filtro-tipo')?.value   || '';
  const fEst    = document.getElementById('et-g-filtro-estado')?.value || 'entregado';
  const fEmp    = document.getElementById('et-g-filtro-empresa')?.value || '';
  const fBusq   = (document.getElementById('et-g-busq')?.value || '').toLowerCase();

  let lista = todos;
  if(fTipo)  lista = lista.filter(e => e.tipo === fTipo);
  if(fEst)   lista = lista.filter(e => e.estado === fEst);
  if(fEmp){
    const legsEmp = nomina.filter(e=>e.emp===fEmp).map(e=>e.leg);
    lista = lista.filter(e => legsEmp.includes(e.leg));
  }
  if(fBusq)  lista = lista.filter(e => {
    const emp = empMap[e.leg];
    const txt = [emp?.nom, e.leg, e.marca, e.modelo, e.imei, e.nro_linea, e.patente, e.nro_serie]
      .filter(Boolean).join(' ').toLowerCase();
    return txt.includes(fBusq);
  });

  // Stats rápidas
  const activos = todos.filter(e=>e.estado==='entregado').length;
  const devueltos = todos.filter(e=>e.estado==='devuelto').length;
  const venc30 = todos.filter(e=>{
    const chk = (f) => { if(!e[f]) return false; const d=(new Date(e[f])-new Date())/86400000; return d>=0&&d<=30; };
    return chk('seguro_vencimiento')||chk('vtv_vencimiento');
  }).length;

  cont.innerHTML = `
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      ${_etStat('📦', 'Total registrados', todos.length, 'var(--t2)')}
      ${_etStat('✅', 'En uso', activos, 'var(--green)')}
      ${_etStat('↩', 'Devueltos', devueltos, 'var(--t3)')}
      ${venc30>0 ? _etStat('⚠', 'Vtos. en 30d', venc30, 'var(--yellow)') : _etStat('🔵', 'Sin vencimientos próximos', 0, 'var(--t3)')}
    </div>

    <!-- Filtros -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
      <input id="et-g-busq" placeholder="🔍 Buscar empleado, IMEI, patente..."
        oninput="renderEtGlobal()"
        value="${document.getElementById('et-g-busq')?.value||''}"
        style="flex:1;min-width:200px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:13px;outline:none">

      <select id="et-g-filtro-tipo" onchange="renderEtGlobal()"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
        <option value="">Todos los tipos</option>
        ${ET_TIPOS.map(t=>`<option value="${t.key}" ${fTipo===t.key?'selected':''}>${t.icon} ${t.label}</option>`).join('')}
      </select>

      <select id="et-g-filtro-estado" onchange="renderEtGlobal()"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
        <option value="">Todos los estados</option>
        ${Object.entries(ET_ESTADOS).map(([k,v])=>`<option value="${k}" ${fEst===k?'selected':''}>${v.label}</option>`).join('')}
      </select>

      <select id="et-g-filtro-empresa" onchange="renderEtGlobal()"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none">
        <option value="">Todas las empresas</option>
        ${[...new Set(nomina.map(e=>e.emp).filter(Boolean))].sort().map(emp=>`<option value="${emp}" ${fEmp===emp?'selected':''}>${emp}</option>`).join('')}
      </select>

      <button class="btn btn-primary" onclick="_etAbrirSelectorEmpleado()"
        style="font-size:12px;padding:7px 14px">➕ Agregar elemento</button>
      <button class="btn btn-ghost" onclick="_etExportarCsv()"
        style="font-size:12px;padding:7px 12px">📥 Exportar CSV</button>
    </div>

    <!-- Tabla -->
    ${!lista.length ? `<div style="text-align:center;padding:40px;color:var(--t3);font-size:13px">Sin resultados para los filtros seleccionados.</div>` : `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:2px solid var(--border)">
            ${['Empleado','Empresa','Tipo','Marca / Modelo','Identificación','Fecha entrega','Estado','Entregado por','Acciones'].map(h=>
              `<th style="padding:8px 10px;text-align:left;font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap">${h}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${lista.map(e => {
            const emp   = empMap[e.leg] || { nom: e.leg, emp: '—' };
            const tipo  = ET_TIPOS.find(t=>t.key===e.tipo) || { icon:'📦', label:e.tipo };
            const est   = ET_ESTADOS[e.estado] || ET_ESTADOS.entregado;
            const ident = [e.imei&&`IMEI:${e.imei}`, e.nro_linea&&`☎${e.nro_linea}`, e.patente, e.nro_serie&&`S/N:${e.nro_serie}`].filter(Boolean).join(' ');
            return `<tr style="border-bottom:1px solid var(--border);transition:background .1s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
              <td style="padding:8px 10px;font-weight:600;color:var(--t1)">${emp.nom}</td>
              <td style="padding:8px 10px;color:var(--t3);font-size:11px">${emp.emp||'—'}</td>
              <td style="padding:8px 10px">${tipo.icon} ${tipo.label.split('/')[0].trim()}</td>
              <td style="padding:8px 10px;color:var(--t2)">${[e.marca,e.modelo].filter(Boolean).join(' ')||'—'}</td>
              <td style="padding:8px 10px;font-family:var(--font-mono);font-size:11px;color:var(--t3)">${ident||'—'}</td>
              <td style="padding:8px 10px;font-family:var(--font-mono);color:var(--t3)">${_etFmtFecha(e.fecha_entrega)}</td>
              <td style="padding:8px 10px">
                <span style="font-size:10px;font-weight:600;color:${est.text};border:1px solid ${est.border};padding:2px 8px;border-radius:10px;white-space:nowrap">${est.label}</span>
              </td>
              <td style="padding:8px 10px;color:var(--t3);font-size:11px">${e.entregado_por||'—'}</td>
              <td style="padding:8px 10px">
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost" onclick="etAbrirFormEditar('${e.id}','${e.leg}')"
                    style="font-size:10px;padding:3px 8px" title="Editar">✎</button>
                  ${e.estado==='entregado'?`
                  <button class="btn btn-ghost" onclick="etRegistrarDevolucion('${e.id}','${e.leg}')"
                    style="font-size:10px;padding:3px 8px;color:var(--green);border-color:rgba(34,197,94,.3)" title="Registrar devolución">↩</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--t3);margin-top:8px;font-family:var(--font-mono)">${lista.length} resultado${lista.length!==1?'s':''}</div>`}
  `;
}

function _etStat(icon, label, valor, color){
  return `<div style="border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);padding:12px 14px;display:flex;flex-direction:column;gap:4px">
    <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em">${icon} ${label}</div>
    <div style="font-size:22px;font-weight:700;color:${color};font-family:var(--font-mono)">${valor||'—'}</div>
  </div>`;
}

function renderEtGlobalIfVisible(){
  const cont = document.getElementById('et-global-sec-contenido');
  if(cont && cont.innerHTML.length > 10) renderEtGlobal();
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────
function _etExportarCsv(){
  const todos  = _etLeer();
  const nomina = typeof getNomina === 'function' ? getNomina() : [];
  const empMap = Object.fromEntries(nomina.map(e=>[e.leg,e]));

  const cols = ['Legajo','Empleado','Empresa','Tipo','Marca','Modelo','IMEI','N° Línea','Patente','N° Serie',
                'Fecha Entrega','Fecha Devolución','Estado','Entregado Por','Recibido Por','N° Inventario','Observaciones'];

  const rows = todos.map(e => {
    const emp = empMap[e.leg] || {};
    const tipo = ET_TIPOS.find(t=>t.key===e.tipo)?.label || e.tipo;
    const est  = ET_ESTADOS[e.estado]?.label || e.estado;
    return [e.leg, emp.nom||'', emp.emp||'', tipo, e.marca||'', e.modelo||'',
            e.imei||'', e.nro_linea||'', e.patente||'', e.nro_serie||'',
            _etFmtFecha(e.fecha_entrega), _etFmtFecha(e.fecha_devolucion), est,
            e.entregado_por||'', e.recibido_por||'', e.nro_inventario||'', e.observaciones||'']
      .map(v => `"${String(v).replace(/"/g,'""')}"`)
      .join(',');
  });

  const csv = [cols.map(c=>`"${c}"`).join(','), ...rows].join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download= `elementos_trabajo_${_etHoy()}.csv`;
  a.click();
  toast('📥 CSV exportado', 'var(--green)', 2500);
}
