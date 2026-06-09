// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTOS OFICIALES — Notificaciones / Comprobantes / Certificados
// ───────────────────────────────────────────────────────────────────────────
// Genera documentos imprimibles (notificación de sanción, comprobante de
// licencia, certificado laboral) con la firma del Gte. de RR.HH. incrustada.
//
// Cada función abre una ventana nueva con CSS @media print listo para
// imprimir o guardar como PDF.
//
// IMPORTANTE: la firma incrustada es una imagen escaneada, NO constituye
// firma digital con validez legal según Ley 25.506. Sirve como representación
// visual de autoría. Para uso vinculante usar firma digital certificada.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helper común: pie de documento con firma del RR.HH. ─────────────
function _docPieFirma(empresa){
  const info = (typeof getFirmaRRHH === 'function') ? getFirmaRRHH(empresa) : null;
  if(!info || !info.imagen){
    return `<div style="margin-top:60px;display:flex;justify-content:flex-end">
      <div style="text-align:center;border-top:1px solid #333;padding-top:6px;min-width:240px">
        <div style="font-size:11px;color:#333">________________________________</div>
        <div style="font-size:10px;color:#666;margin-top:3px">Firma del responsable de RR.HH.</div>
      </div>
    </div>`;
  }
  return `<div style="margin-top:50px;display:flex;justify-content:flex-end">
    <div style="text-align:center;min-width:280px">
      <img src="${info.imagen}" alt="Firma ${info.nombre}" style="width:180px;height:auto;max-height:90px;object-fit:contain;display:block;margin:0 auto">
      <div style="border-top:1px solid #333;padding-top:4px;font-size:11px;font-weight:600;color:#222">${info.nombre}</div>
      <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.04em">${info.cargo}</div>
    </div>
  </div>`;
}

// ─── Helper común: encabezado con logo de empresa ────────────────────
function _docEncabezadoEmpresa(empresa){
  const logoHtml = (typeof LOGOS !== 'undefined' && LOGOS[empresa]) ? LOGOS[empresa] : '';
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:2px solid #333;margin-bottom:24px">
    <div>${logoHtml.replace('max-height:48px', 'max-height:60px').replace('max-width:140px', 'max-width:200px')}</div>
    <div style="text-align:right;font-size:10px;color:#555;font-family:Arial,sans-serif">
      <div style="font-weight:600;color:#222">${empresa}</div>
      <div style="margin-top:3px">Departamento de RR.HH.</div>
    </div>
  </div>`;
}

// ─── Wrapper: abrir ventana imprimible con HTML armado ──────────────
function _docAbrirImprimible(titulo, contenido){
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${titulo}</title>
    <style>
      @page { size: A4; margin: 20mm 18mm; }
      body { margin:0; padding:20px 24px; font-family:Arial,sans-serif; color:#222; max-width:780px; margin:auto; background:white }
      .no-print { margin-bottom:20px; padding:12px 16px; background:#f0f4ff; border:1px solid #d0d8ee; border-radius:6px }
      .no-print button { padding:8px 18px; background:#1E6B3A; color:white; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:600; margin-right:8px }
      .no-print button:hover { background:#175028 }
      h1 { font-size:18px; margin:0 0 6px; color:#222 }
      h2 { font-size:14px; margin:18px 0 8px; color:#333 }
      p { line-height:1.6; font-size:12px }
      .label { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.05em; font-weight:600 }
      .valor { color:#222; font-size:12px }
      table { border-collapse:collapse; width:100%; margin:8px 0 }
      th, td { border:1px solid #ccc; padding:6px 9px; font-size:11px; text-align:left }
      th { background:#f5f5f5; font-weight:600 }
      @media print { .no-print { display:none } body { padding:0 } }
    </style></head><body>
    <div class="no-print">
      <button onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
      <span style="font-size:11px;color:#555">Documento listo para impresión — cerrá esta ventana cuando termines</span>
    </div>
    ${contenido}
    </body></html>`;
  const w = window.open('', '_blank');
  if(!w){
    toast('⚠ El navegador bloqueó la ventana. Permitir popups e intentar de nuevo.', 'var(--red)');
    return;
  }
  w.document.write(html);
  w.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1) NOTIFICACIÓN DE SANCIÓN DISCIPLINARIA — Flujo en 3 pasos
//    Paso 1: modal con campos editables (datos formales precargados)
//    Paso 2: preview HTML con contenteditable para ajustes finos
//    Paso 3: imprimir / guardar PDF
// ═══════════════════════════════════════════════════════════════════════════

// Defaults de plantilla — son las "fórmulas" que se interpolan con los datos
// formales de la sanción. RRHH puede editar cualquiera de estos textos.
const _NOTIF_SANCION_DEFAULTS = {
  encabezado_cuerpo: `Por la presente se le notifica que, en uso de las facultades disciplinarias previstas en el Art. 67 de la Ley de Contrato de Trabajo (Ley 20.744 y modificatorias) y conforme al Reglamento Interno de la empresa, se ha resuelto aplicarle la siguiente sanción:`,
  clausula_impugnacion: `Se le hace saber que, conforme al Art. 67 LCT, dispone de un plazo de 30 (treinta) días corridos para impugnar esta sanción ante la empresa. Vencido dicho plazo sin impugnación, la sanción se considerará consentida.`,
  cierre: `Por tomarse conocimiento se firma al pie en señal de notificación.`
};

// Construye el "modelo" completo de la notificación (datos formales + textos
// editables) listo para pasar a renderNotifSancionHTML() y renderEditorModal().
function _construirModeloNotifSancion(s, emp){
  const motivo = _sancMotivoInfo(s.motivo);
  const tipoApl = _sancTipoInfo(s.tipo_aplicado || s.tipo_solicitado);
  const fechaNotif = s.fecha_notificacion || new Date().toISOString().slice(0, 10);
  // Si la sanción YA tiene un texto editado guardado, lo usamos como base
  const guardado = s.notif_texto_editado || {};
  return {
    // Datos formales — el editor los puede modificar
    empresa: emp.emp,
    empleadoNom: emp.nom,
    empleadoDni: emp.dni || '—',
    empleadoLeg: emp.leg,
    fecha: fechaNotif,
    nroActuacion: s.id,
    tipoSancion: guardado.tipoSancion || tipoApl.label,
    motivo: guardado.motivo || motivo.label,
    descripcion: guardado.descripcion || (s.descripcion || ''),
    fechaCumplimiento: guardado.fechaCumplimiento !== undefined ? guardado.fechaCumplimiento : (s.fecha_cumplimiento || ''),
    fechaAplicacion: guardado.fechaAplicacion || (s.fecha_aplicacion || fechaNotif),
    comentarioRRHH: guardado.comentarioRRHH !== undefined ? guardado.comentarioRRHH : (s.comentario_rrhh || ''),
    // Textos de plantilla — pueden personalizarse para cada notificación
    encabezadoCuerpo: guardado.encabezadoCuerpo || _NOTIF_SANCION_DEFAULTS.encabezado_cuerpo,
    clausulaImpugnacion: guardado.clausulaImpugnacion || _NOTIF_SANCION_DEFAULTS.clausula_impugnacion,
    cierre: guardado.cierre || _NOTIF_SANCION_DEFAULTS.cierre,
    incluirConsideraciones: guardado.incluirConsideraciones !== false
  };
}

// Renderiza el HTML completo del documento a partir del modelo.
// Si esContenteditable=true, se agregan atributos para que los bloques de
// texto sean editables in-place en la preview.
function _renderNotifSancionHTML(m, opts){
  opts = opts || {};
  const editable = opts.contenteditable === true;
  const fmtDate = iso => { if(!iso) return '—'; const [y,m,d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  const ce = editable ? ' contenteditable="true"' : '';
  const editStyle = editable ? 'outline:1px dashed transparent;transition:outline-color .2s;padding:2px 4px;border-radius:3px;' : '';
  const editFocus = editable ? `onfocus="this.style.outlineColor='#3D7FFF';this.style.background='#f8faff'" onblur="this.style.outlineColor='transparent';this.style.background='transparent'"` : '';

  return `
    ${_docEncabezadoEmpresa(m.empresa)}

    <h1 style="text-align:center;margin-bottom:14px" data-field="titulo"${ce} ${editFocus}>NOTIFICACIÓN DE SANCIÓN DISCIPLINARIA</h1>
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:18px">
      ${m.empresa}, <span data-field="fecha"${ce} ${editFocus} style="${editStyle}">${fmtDate(m.fecha)}</span><br>
      <span style="font-size:10px">N° de actuación: ${m.nroActuacion}</span>
    </div>

    <p>Sr./Sra. <strong>${m.empleadoNom}</strong> (DNI ${m.empleadoDni}, Legajo ${m.empleadoLeg}):</p>

    <p data-field="encabezadoCuerpo"${ce} ${editFocus} style="${editStyle}">${m.encabezadoCuerpo}</p>

    <table>
      <tr><th style="width:35%">Tipo de sanción</th><td><strong data-field="tipoSancion"${ce} ${editFocus} style="${editStyle}">${m.tipoSancion}</strong></td></tr>
      <tr><th>Motivo</th><td data-field="motivo"${ce} ${editFocus} style="${editStyle}">${m.motivo}</td></tr>
      <tr><th>Descripción de los hechos</th><td data-field="descripcion"${ce} ${editFocus} style="white-space:pre-wrap;${editStyle}">${(m.descripcion || '').replace(/</g,'&lt;')}</td></tr>
      ${m.fechaCumplimiento ? `<tr><th>Cumplimiento desde</th><td data-field="fechaCumplimiento"${ce} ${editFocus} style="${editStyle}">${fmtDate(m.fechaCumplimiento)}</td></tr>` : ''}
      <tr><th>Fecha de aplicación</th><td data-field="fechaAplicacion"${ce} ${editFocus} style="${editStyle}">${fmtDate(m.fechaAplicacion)}</td></tr>
    </table>

    ${m.incluirConsideraciones && m.comentarioRRHH ? `
      <h2>Consideraciones de RR.HH.</h2>
      <p data-field="comentarioRRHH"${ce} ${editFocus} style="white-space:pre-wrap;padding:10px 14px;background:#f8f8f8;border-left:3px solid #999;${editStyle}">${m.comentarioRRHH.replace(/</g,'&lt;')}</p>
    ` : ''}

    <p data-field="clausulaImpugnacion"${ce} ${editFocus} style="margin-top:18px;font-size:11px;color:#555;${editStyle}">${m.clausulaImpugnacion}</p>

    <p data-field="cierre"${ce} ${editFocus} style="${editStyle}">${m.cierre}</p>

    <!-- BLOQUE DE FIRMAS LADO A LADO -->
    <div style="display:flex;gap:40px;margin-top:50px">
      <div style="flex:1;text-align:center">
        <div style="border-top:1px solid #333;padding-top:4px;font-size:10px;color:#555">Notificado · Firma del empleado</div>
        <div style="font-size:11px;color:#222;margin-top:18px">${m.empleadoNom}</div>
        <div style="font-size:10px;color:#666">DNI ${m.empleadoDni}</div>
      </div>
      <div style="flex:1">
        ${_docPieFirma(m.empresa).replace('margin-top:50px', 'margin-top:0').replace('justify-content:flex-end', 'justify-content:center')}
      </div>
    </div>

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#999;text-align:center">
      Documento generado el ${new Date().toLocaleString('es-AR')} desde el Portal RR.HH. LEITEN S.A.<br>
      Actuación N° ${m.nroActuacion}
    </div>
  `;
}

// Punto de entrada del flujo: abre el modal de edición (paso 1).
// Si se llama con opts.skipEdit=true, salta directo a imprimir con los
// datos formales originales (modo legacy / rápido).
function imprimirNotifSancion(idSancion, opts){
  opts = opts || {};
  const s = (typeof getSanciones === 'function') ? getSanciones().find(x => x.id === idSancion) : null;
  if(!s){ toast('⚠ Sanción no encontrada', 'var(--red)'); return; }
  if(s.estado === 'solicitada'){
    toast('⚠ Solo se imprimen notificaciones de sanciones resueltas por RR.HH.', 'var(--yellow)');
    return;
  }
  const emp = (typeof empByLeg === 'function') ? empByLeg(s.leg) : null;
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  if(opts.skipEdit){
    const modelo = _construirModeloNotifSancion(s, emp);
    const contenido = _renderNotifSancionHTML(modelo, { contenteditable: false });
    _docAbrirImprimible(`Notificación sanción ${legD(emp.leg)}`, contenido);
    if(typeof logAuditX === 'function'){
      logAuditX('sanciones', 'imprimir_notif', { id: s.id, leg: s.leg, por: currentUser?.emp?.nom, modo: 'directo' });
    }
    return;
  }

  // Paso 1: editor con campos
  _abrirEditorNotifSancion(s, emp);
}

// ─── PASO 1: Modal editor con campos específicos ────────────────────────────
function _abrirEditorNotifSancion(s, emp){
  const m = _construirModeloNotifSancion(s, emp);

  const prev = document.getElementById('modal-editor-notif');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-editor-notif';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:760px;width:100%;max-height:92vh;display:flex;flex-direction:column;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📝 Editar notificación de sanción</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${emp.nom} · ${legD(emp.leg)} · Actuación N° ${s.id}</div>
        </div>
        <button onclick="document.getElementById('modal-editor-notif').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1">
        <div style="padding:10px 12px;background:rgba(61,127,255,.06);border:1px solid rgba(61,127,255,.25);border-radius:6px;font-size:11px;color:var(--t2)">
          💡 Editá los campos que necesites. Después podrás previsualizar el documento completo y seguir ajustando antes de imprimir.
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Fecha de notificación</label>
            <input type="date" id="edn-fecha" value="${m.fecha}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 9px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Cumplimiento desde</label>
            <input type="date" id="edn-cumplimiento" value="${m.fechaCumplimiento || ''}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 9px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Tipo de sanción</label>
            <input type="text" id="edn-tipo" value="${(m.tipoSancion||'').replace(/"/g,'&quot;')}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 9px;color:var(--t1);font-size:13px;outline:none">
          </div>
          <div>
            <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Motivo</label>
            <input type="text" id="edn-motivo" value="${(m.motivo||'').replace(/"/g,'&quot;')}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 9px;color:var(--t1);font-size:13px;outline:none">
          </div>
        </div>

        <div>
          <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Encabezado / fundamento legal</label>
          <textarea id="edn-encabezado" rows="3"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;line-height:1.5;resize:vertical">${m.encabezadoCuerpo}</textarea>
        </div>

        <div>
          <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Descripción de los hechos</label>
          <textarea id="edn-descripcion" rows="5"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;line-height:1.5;resize:vertical">${m.descripcion}</textarea>
        </div>

        <div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--t2);margin-bottom:6px">
            <input type="checkbox" id="edn-incl-cons" ${m.incluirConsideraciones?'checked':''} style="cursor:pointer">
            Incluir bloque "Consideraciones de RR.HH."
          </label>
          <textarea id="edn-comentario" rows="4"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;line-height:1.5;resize:vertical">${m.comentarioRRHH}</textarea>
        </div>

        <div>
          <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Cláusula de impugnación</label>
          <textarea id="edn-impugnacion" rows="3"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;line-height:1.5;resize:vertical">${m.clausulaImpugnacion}</textarea>
        </div>

        <div>
          <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Cierre / pie de notificación</label>
          <input type="text" id="edn-cierre" value="${(m.cierre||'').replace(/"/g,'&quot;')}"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 9px;color:var(--t1);font-size:12px;outline:none">
        </div>

        <div style="padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong style="color:var(--t2)">Datos automáticos (no editables aquí):</strong>
          empresa <b>${m.empresa}</b> · empleado <b>${m.empleadoNom}</b> (DNI ${m.empleadoDni}, Legajo ${m.empleadoLeg}) · firma del Gte. RRHH. Estos campos siempre se toman de la sanción y la nómina.
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:space-between;align-items:center">
        <button class="btn btn-ghost" onclick="_restaurarPlantillaNotif()" style="font-size:12px;padding:7px 12px;color:var(--t3)" title="Vuelve los textos de plantilla a los valores por defecto">↺ Restaurar plantilla</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="document.getElementById('modal-editor-notif').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
          <button class="btn btn-primary" onclick="_previewNotifSancion('${s.id}')" style="font-size:13px;padding:8px 18px">👁 Previsualizar →</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// Restaura los textos de plantilla a los defaults (en el modal abierto)
function _restaurarPlantillaNotif(){
  const enc = document.getElementById('edn-encabezado');
  const imp = document.getElementById('edn-impugnacion');
  const cie = document.getElementById('edn-cierre');
  if(enc) enc.value = _NOTIF_SANCION_DEFAULTS.encabezado_cuerpo;
  if(imp) imp.value = _NOTIF_SANCION_DEFAULTS.clausula_impugnacion;
  if(cie) cie.value = _NOTIF_SANCION_DEFAULTS.cierre;
  toast('Plantilla restaurada — los demás campos quedaron como estaban', 'var(--accent2)');
}

// Lee los campos del editor y construye el modelo final
function _leerModeloDesdeEditor(s, emp){
  const base = _construirModeloNotifSancion(s, emp);
  const get = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  const getCheck = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : true;
  };
  return {
    ...base,
    fecha: get('edn-fecha', base.fecha),
    fechaCumplimiento: get('edn-cumplimiento', base.fechaCumplimiento),
    tipoSancion: get('edn-tipo', base.tipoSancion),
    motivo: get('edn-motivo', base.motivo),
    encabezadoCuerpo: get('edn-encabezado', base.encabezadoCuerpo),
    descripcion: get('edn-descripcion', base.descripcion),
    comentarioRRHH: get('edn-comentario', base.comentarioRRHH),
    clausulaImpugnacion: get('edn-impugnacion', base.clausulaImpugnacion),
    cierre: get('edn-cierre', base.cierre),
    incluirConsideraciones: getCheck('edn-incl-cons')
  };
}

// ─── PASO 2: Preview HTML con contenteditable ───────────────────────────────
function _previewNotifSancion(idSancion){
  const s = getSanciones().find(x => x.id === idSancion);
  if(!s){ toast('⚠ Sanción no encontrada', 'var(--red)'); return; }
  const emp = empByLeg(s.leg);
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const modelo = _leerModeloDesdeEditor(s, emp);
  // Guardamos el modelo en una variable global accesible para el paso 3
  window._notifModeloActivo = { idSancion, modelo };

  // Cerramos el editor anterior
  const editor = document.getElementById('modal-editor-notif');
  if(editor) editor.remove();

  const prev = document.getElementById('modal-preview-notif');
  if(prev) prev.remove();

  const previewModal = document.createElement('div');
  previewModal.id = 'modal-preview-notif';
  previewModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  const html = _renderNotifSancionHTML(modelo, { contenteditable: true });
  previewModal.innerHTML = `
    <div class="card" style="padding:0;max-width:900px;width:100%;max-height:94vh;display:flex;flex-direction:column;border:1px solid var(--border);background:#1a1a1a">
      <div style="padding:14px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">👁 Vista previa de la notificación</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Click sobre cualquier texto para editarlo · ${emp.nom} · Actuación N° ${s.id}</div>
        </div>
        <button onclick="document.getElementById('modal-preview-notif').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:14px 18px;background:rgba(234,179,8,.06);border-bottom:1px solid rgba(234,179,8,.2);font-size:11px;color:var(--t2);flex-shrink:0">
        💡 <strong>Tip:</strong> Hacé click sobre cualquier párrafo o campo del documento para editarlo directamente. Los cambios quedan sólo en este documento y se aplican al imprimir.
      </div>

      <div id="preview-notif-canvas" style="overflow-y:auto;flex:1;padding:30px 40px;background:white;color:#222;font-family:Arial,sans-serif">
        <style>
          #preview-notif-canvas h1 { font-size:18px; margin:0 0 6px; color:#222 }
          #preview-notif-canvas h2 { font-size:14px; margin:18px 0 8px; color:#333 }
          #preview-notif-canvas p { line-height:1.6; font-size:12px }
          #preview-notif-canvas table { border-collapse:collapse; width:100%; margin:8px 0 }
          #preview-notif-canvas th, #preview-notif-canvas td { border:1px solid #ccc; padding:6px 9px; font-size:11px; text-align:left }
          #preview-notif-canvas th { background:#f5f5f5; font-weight:600 }
          #preview-notif-canvas [contenteditable="true"]:hover { background:#fffce8 !important; cursor:text }
        </style>
        ${html}
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:space-between;align-items:center;flex-shrink:0">
        <button class="btn btn-ghost" onclick="_volverAEditorNotif('${s.id}')" style="font-size:13px;padding:8px 14px;color:var(--t3)">← Volver a campos</button>
        <div style="display:flex;gap:8px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:var(--t3);margin-right:10px">
            <input type="checkbox" id="notif-persistir" style="cursor:pointer">
            Guardar esta versión en la sanción
          </label>
          <button class="btn btn-ghost" onclick="document.getElementById('modal-preview-notif').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
          <button class="btn btn-primary" onclick="_imprimirNotifFinal()" style="font-size:13px;padding:8px 18px">🖨 Imprimir / Guardar PDF</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(previewModal);
}

// Volver del preview al editor (paso 1) — preserva los cambios del editor original
function _volverAEditorNotif(idSancion){
  const s = getSanciones().find(x => x.id === idSancion);
  const emp = empByLeg(s.leg);
  // Antes de cerrar preview, capturamos los textos editados in-place y los
  // pasamos como base al editor para no perder cambios.
  const modelo = _capturarModeloDePreview();
  // Guardamos temporalmente en la sanción (sin persistir en localStorage) para
  // que _construirModeloNotifSancion lo recupere
  s._tempModelo = modelo;
  const sBkp = { ...s, notif_texto_editado: { ...modelo, _temp: true } };
  document.getElementById('modal-preview-notif')?.remove();
  _abrirEditorNotifSancion(sBkp, emp);
}

// Lee los nodos contenteditable del preview y reconstruye el modelo
function _capturarModeloDePreview(){
  const base = (window._notifModeloActivo && window._notifModeloActivo.modelo) || {};
  const canvas = document.getElementById('preview-notif-canvas');
  if(!canvas) return base;
  const get = (field, transform) => {
    const el = canvas.querySelector(`[data-field="${field}"]`);
    if(!el) return base[field];
    const txt = el.innerText.trim();
    return transform ? transform(txt) : txt;
  };
  // Reconvertir fechas en formato d/m/y → ISO
  const fechaToIso = txt => {
    if(!txt || txt === '—') return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;
    const m = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return txt;
  };
  return {
    ...base,
    fecha: get('fecha', fechaToIso) || base.fecha,
    tipoSancion: get('tipoSancion') || base.tipoSancion,
    motivo: get('motivo') || base.motivo,
    descripcion: get('descripcion') || base.descripcion,
    fechaCumplimiento: get('fechaCumplimiento', fechaToIso),
    fechaAplicacion: get('fechaAplicacion', fechaToIso) || base.fechaAplicacion,
    encabezadoCuerpo: get('encabezadoCuerpo') || base.encabezadoCuerpo,
    comentarioRRHH: get('comentarioRRHH') || base.comentarioRRHH,
    clausulaImpugnacion: get('clausulaImpugnacion') || base.clausulaImpugnacion,
    cierre: get('cierre') || base.cierre
  };
}

// ─── PASO 3: Imprimir definitivo ────────────────────────────────────────────
function _imprimirNotifFinal(){
  const activo = window._notifModeloActivo;
  if(!activo){ toast('⚠ No hay notificación activa', 'var(--red)'); return; }
  const { idSancion } = activo;
  const s = getSanciones().find(x => x.id === idSancion);
  const emp = empByLeg(s.leg);

  // Capturar última versión (incluyendo ediciones in-place)
  const modeloFinal = _capturarModeloDePreview();
  const persistir = document.getElementById('notif-persistir')?.checked;

  // Generar HTML final SIN contenteditable
  const contenido = _renderNotifSancionHTML(modeloFinal, { contenteditable: false });
  _docAbrirImprimible(`Notificación sanción ${legD(emp.leg)}`, contenido);

  // Persistir si fue marcado
  if(persistir){
    const all = getSanciones();
    const idx = all.findIndex(x => x.id === idSancion);
    if(idx >= 0){
      all[idx].notif_texto_editado = {
        tipoSancion: modeloFinal.tipoSancion,
        motivo: modeloFinal.motivo,
        descripcion: modeloFinal.descripcion,
        fechaCumplimiento: modeloFinal.fechaCumplimiento,
        fechaAplicacion: modeloFinal.fechaAplicacion,
        comentarioRRHH: modeloFinal.comentarioRRHH,
        encabezadoCuerpo: modeloFinal.encabezadoCuerpo,
        clausulaImpugnacion: modeloFinal.clausulaImpugnacion,
        cierre: modeloFinal.cierre,
        incluirConsideraciones: modeloFinal.incluirConsideraciones,
        editadoPor: currentUser?.emp?.nom,
        editadoEl: new Date().toISOString()
      };
      setSanciones(all);
      toast('✓ Versión editada guardada en la sanción', 'var(--green)');
    }
  }

  document.getElementById('modal-preview-notif')?.remove();
  window._notifModeloActivo = null;

  if(typeof logAuditX === 'function'){
    logAuditX('sanciones', 'imprimir_notif', {
      id: s.id, leg: s.leg, por: currentUser?.emp?.nom,
      modo: 'editado', persistido: !!persistir
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) COMPROBANTE DE LICENCIA
// ═══════════════════════════════════════════════════════════════════════════
async function imprimirComprobanteLicencia(idLic, origen){
  // origen: 'anual' | 'especial' | 'medica'
  let lic = null;
  if(origen === 'anual' && typeof getLicAnuales === 'function'){
    lic = (await getLicAnuales() || []).find(x => x.id === idLic);
  } else if(origen === 'especial' && typeof getLicenciasEspeciales === 'function'){
    lic = (await getLicenciasEspeciales() || []).find(x => x.id === idLic);
  } else if(typeof getLicencias === 'function'){
    lic = (await getLicencias() || []).find(x => x.id === idLic);
  }
  if(!lic){ toast('⚠ Licencia no encontrada', 'var(--red)'); return; }

  const emp = (typeof empByLeg === 'function') ? empByLeg(lic.leg) : null;
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const fmtDate = iso => { if(!iso) return '—'; const [y,m,d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  const titulo = origen === 'anual' ? 'COMPROBANTE DE LICENCIA ANUAL ORDINARIA (Vacaciones)' :
                 origen === 'especial' ? 'COMPROBANTE DE LICENCIA ESPECIAL' :
                                         'COMPROBANTE DE LICENCIA';

  const articulo = origen === 'anual' ? 'Art. 150 LCT (Ley 20.744)' :
                   origen === 'especial' ? 'Art. 158 LCT (Licencias Especiales)' :
                   'Art. 208 LCT (Enfermedad inculpable)';

  const contenido = `
    ${_docEncabezadoEmpresa(emp.emp)}

    <h1 style="text-align:center;margin-bottom:14px">${titulo}</h1>
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:18px">
      ${emp.emp}, ${new Date().toLocaleDateString('es-AR')}<br>
      <span style="font-size:10px">Comprobante N° ${lic.id || '—'}</span>
    </div>

    <p>Se deja constancia de que el/la empleado/a <strong>${emp.nom}</strong> (DNI ${emp.dni || '—'},
    Legajo ${legD(emp.leg)}) ha solicitado licencia conforme a lo establecido en ${articulo}.</p>

    <table>
      <tr><th style="width:35%">Empleado</th><td>${emp.nom}</td></tr>
      <tr><th>Legajo / DNI</th><td>${legD(emp.leg)} / ${emp.dni || '—'}</td></tr>
      <tr><th>Empresa</th><td>${emp.emp}</td></tr>
      <tr><th>Lugar de trabajo</th><td>${emp.lugar || '—'}</td></tr>
      <tr><th>Categoría / Cargo</th><td>${emp.cat || '—'} ${emp.tramo || ''} · ${emp.tarea || ''}</td></tr>
      <tr><th>Tipo de licencia</th><td><strong>${lic.tipo || titulo}</strong></td></tr>
      <tr><th>Desde</th><td>${fmtDate(lic.desde)}</td></tr>
      <tr><th>Hasta</th><td>${fmtDate(lic.hasta)}</td></tr>
      <tr><th>Días totales</th><td><strong>${lic.dias || '—'}</strong> día${lic.dias!==1?'s':''}</td></tr>
      ${lic.obs || lic.motivo ? `<tr><th>Observaciones</th><td>${(lic.obs || lic.motivo).replace(/</g,'&lt;')}</td></tr>` : ''}
      <tr><th>Estado</th><td><strong style="color:${lic.estado === 'aprobada' ? '#1E6B3A' : '#999'}">${(lic.estado || 'aprobada').toUpperCase()}</strong></td></tr>
      <tr><th>Solicitada el</th><td>${lic.solicitadoEl || lic.presentadoEl || '—'}</td></tr>
    </table>

    <p style="margin-top:18px">El presente comprobante acredita que la licencia ha sido <strong>${
      lic.estado === 'aprobada' || lic.estado === 'aprobada_gerente' ? 'autorizada' : 'registrada'
    }</strong> en los términos solicitados, debiendo el empleado reincorporarse a sus tareas habituales a partir del día
    siguiente al de la fecha hasta indicada (${fmtDate(lic.hasta)}).</p>

    ${_docPieFirma(emp.emp)}

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#999;text-align:center">
      Documento generado el ${new Date().toLocaleString('es-AR')} desde el Portal RR.HH. LEITEN S.A.
    </div>
  `;
  _docAbrirImprimible(`Comprobante licencia ${legD(emp.leg)}`, contenido);

  if(typeof logAuditX === 'function'){
    logAuditX('licencias', 'imprimir_comprobante', { id: lic.id, leg: lic.leg, origen, por: currentUser?.emp?.nom });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) CERTIFICADO LABORAL (uso bancario / migratorio)
// ═══════════════════════════════════════════════════════════════════════════
function imprimirCertificadoLaboral(leg, opts){
  opts = opts || {};
  const emp = (typeof empByLeg === 'function') ? empByLeg(leg) :
              (typeof getNomina === 'function') ? getNomina().find(e => e.leg === leg) : null;
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const fmtDate = iso => {
    if(!iso) return '—';
    if(iso instanceof Date) iso = iso.toISOString().slice(0,10);
    const s = String(iso);
    if(s.includes('/')) return s; // ya formateada
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  };
  const proposito = opts.proposito || 'ante quien corresponda';
  const incluirSueldo = opts.incluirSueldo !== false;
  const sueldo = $m_safe(emp.bruto) || $m_safe(emp.basico) || 0;
  const sueldoTxt = sueldo > 0 ? '$ ' + sueldo.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '(no informado)';

  // Calcular antigüedad
  const ingDate = (() => {
    const s = emp.ing;
    if(!s) return null;
    if(s.includes('/')){ const [d,m,y] = s.split('/'); return new Date(+y, +m-1, +d); }
    if(s.includes('-')){ const [y,m,d] = s.split('-'); return new Date(+y, +m-1, +d); }
    return null;
  })();
  const hoy = new Date();
  const antigAnios = ingDate ? Math.floor((hoy - ingDate) / (365.25 * 86400000)) : null;

  const contenido = `
    ${_docEncabezadoEmpresa(emp.emp)}

    <h1 style="text-align:center;margin-bottom:14px">CERTIFICADO LABORAL</h1>
    <div style="text-align:right;font-size:11px;color:#555;margin-bottom:24px">
      ${emp.emp}, ${new Date().toLocaleDateString('es-AR')}
    </div>

    <p>Por la presente, <strong>${emp.emp}</strong>, certifica que el/la Sr./Sra.
    <strong>${emp.nom}</strong>, DNI N° <strong>${emp.dni || '—'}</strong>,
    CUIL <strong>${emp.cuil || '—'}</strong>, se desempeña en relación de dependencia
    laboral con esta empresa desde el día <strong>${fmtDate(emp.ing)}</strong>${antigAnios !== null ? ` (antigüedad ${antigAnios} año${antigAnios!==1?'s':''})` : ''}, cumpliendo
    las siguientes condiciones:</p>

    <table>
      <tr><th style="width:35%">Apellido y Nombre</th><td>${emp.nom}</td></tr>
      <tr><th>DNI / CUIL</th><td>${emp.dni || '—'} / ${emp.cuil || '—'}</td></tr>
      <tr><th>Legajo</th><td>${legD(emp.leg)}</td></tr>
      <tr><th>Cargo / Tarea</th><td>${emp.tarea || '—'}</td></tr>
      <tr><th>Categoría</th><td>${emp.cat || '—'} ${emp.tramo || ''} · ${emp.desc_categoria || ''}</td></tr>
      <tr><th>Condición</th><td>${emp.condicion || 'Mensualizado'} · ${emp.cod_convenio ? 'CCT '+emp.cod_convenio : 'Fuera de convenio'}</td></tr>
      <tr><th>Lugar de trabajo</th><td>${emp.lugar || '—'}</td></tr>
      <tr><th>Fecha de ingreso</th><td><strong>${fmtDate(emp.ing)}</strong></td></tr>
      ${antigAnios !== null ? `<tr><th>Antigüedad</th><td>${antigAnios} año${antigAnios!==1?'s':''}</td></tr>` : ''}
      ${incluirSueldo ? `<tr><th>Remuneración bruta mensual</th><td><strong>${sueldoTxt}</strong></td></tr>` : ''}
      <tr><th>Estado</th><td><strong style="color:#1E6B3A">ACTIVO</strong></td></tr>
    </table>

    <p style="margin-top:18px">El presente certificado se extiende a solicitud del/de la interesado/a
    para ser presentado <strong>${proposito}</strong>, a los fines que estime corresponder.</p>

    ${_docPieFirma(emp.emp)}

    <div style="margin-top:30px;padding-top:10px;border-top:1px dashed #ccc;font-size:9px;color:#999;text-align:center">
      Documento generado el ${new Date().toLocaleString('es-AR')} desde el Portal RR.HH. LEITEN S.A.<br>
      Para verificación contactar al Dpto. de RR.HH. de ${emp.emp}.
    </div>
  `;
  _docAbrirImprimible(`Certificado laboral ${legD(emp.leg)}`, contenido);

  if(typeof logAuditX === 'function'){
    logAuditX('certificados', 'imprimir_laboral', { leg: emp.leg, por: currentUser?.emp?.nom, proposito });
  }
}

// Helper: $m_safe ya existe en el generador de reportes; lo redefino acá por seguridad
if(typeof $m_safe !== 'function'){
  window.$m_safe = function(v){ return Number(v) || 0; };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: solicitar certificado laboral (panel empleado)
// ═══════════════════════════════════════════════════════════════════════════
function abrirSolicitarCertificadoLaboral(){
  const emp = currentUser?.emp;
  if(!emp){ toast('⚠ No hay sesión activa', 'var(--red)'); return; }

  const prev = document.getElementById('modal-cert-laboral');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-cert-laboral';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:500px;width:100%;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📄 Certificado laboral</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Genera tu certificado oficial firmado</div>
        </div>
        <button onclick="document.getElementById('modal-cert-laboral').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Destino / propósito (opcional)</label>
          <input type="text" id="cert-prop" placeholder="Ej: Banco Galicia, embajada, ANSES..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none">
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Si lo dejás vacío, dice "ante quien corresponda".</div>
        </div>

        <div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--t2)">
            <input type="checkbox" id="cert-sueldo" checked style="cursor:pointer">
            Incluir remuneración bruta mensual
          </label>
          <div style="font-size:10px;color:var(--t3);margin-top:4px;margin-left:24px">Algunos bancos lo requieren para préstamos o tarjetas.</div>
        </div>

        <div style="font-size:11px;color:var(--t3);padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);line-height:1.5">
          <strong style="color:var(--t2)">Datos que figurarán:</strong><br>
          Apellido y nombre · DNI · CUIL · Legajo · Cargo · Fecha de ingreso · Antigüedad · Lugar de trabajo · Estado actual
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cert-laboral').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_confirmarCertLaboral()" style="font-size:13px;padding:8px 18px">📄 Generar certificado</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _confirmarCertLaboral(){
  const emp = currentUser?.emp;
  if(!emp) return;
  const proposito = document.getElementById('cert-prop')?.value?.trim() || 'ante quien corresponda';
  const incluirSueldo = document.getElementById('cert-sueldo')?.checked !== false;
  document.getElementById('modal-cert-laboral')?.remove();
  imprimirCertificadoLaboral(emp.leg, { proposito, incluirSueldo });
}

