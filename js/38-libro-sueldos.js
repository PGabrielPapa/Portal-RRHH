// ═══════════════════════════════════════════════════════════════════════════
// LIBRO DE SUELDOS — DOS FORMATOS
// ───────────────────────────────────────────────────────────────────────────
// 1. Libro Sueldo Digital (LSD) — RG (AFIP) 3781/2015 + Resol. ARCA
//    Sistema obligatorio de rúbrica electrónica que reemplaza el Libro Art.
//    52 LCT en papel para empleadores adheridos. Genera tres archivos TXT
//    posicionales que se cargan en el aplicativo "Libro de Sueldos Digital":
//
//      • F.901 (Conceptos)  — qué se liquidó por empleado y código de concepto
//      • F.902 (Empleados)  — cabecera por empleado en el período
//      • F.903 (Períodos)   — cabecera del período liquidado
//
//    Cada línea es un registro posicional con campos de longitud fija.
//    AFIP publica el manual técnico (~50pp) con los códigos.
//
// 2. Libro Art. 52 LCT (papel/PDF) — el que históricamente se rubricaba en
//    autoridad administrativa. Sigue siendo válido para empleadores no
//    adheridos al LSD. Lo emitimos como Excel para impresión + firma.
//
// ESTRATEGIA DE CÓDIGOS DE CONCEPTO LSD:
//   AFIP usa una tabla maestra de códigos. Los más frecuentes están mapeados
//   abajo (LSD_CODIGOS). El operador puede ajustar manualmente desde el
//   archivo generado si AFIP rechaza algún código por desactualización de
//   tabla. Este módulo no cubre el 100% de casos especiales (zonas, viáticos
//   con código específico, etc.) — siempre se recomienda revisar con el
//   contador antes de presentar.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helpers compartidos ───────────────────────────────────────────────
function _lsdPad(val, len, char, alignRight){
  let s = String(val ?? '');
  if(s.length > len) s = s.slice(0, len);
  if(alignRight) return s.padStart(len, char || '0');
  return s.padEnd(len, char || ' ');
}
function _lsdSinAcentos(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').toUpperCase();
}
function _lsdLimpiarCUIL(c){ return String(c||'').replace(/[^\d]/g,''); }
function _lsdImporteCentavos(monto, len){
  const cents = Math.round(Number(monto||0) * 100);
  const sgn = cents < 0 ? '-' : '';
  const s = String(Math.abs(cents));
  return sgn + (len ? _lsdPad(s, len - sgn.length, '0', true) : s);
}
function _lsdYYYYMM(periodo){
  // periodo formato "YYYY-MM" → "YYYYMM"
  return String(periodo||'').replace(/[^\d]/g,'').slice(0, 6);
}
function _lsdFechaToYYYYMMDD(d){
  if(!d) return '00000000';
  const dt = d instanceof Date ? d : new Date(d);
  if(isNaN(dt.getTime())) return '00000000';
  return dt.getFullYear() + String(dt.getMonth()+1).padStart(2,'0') + String(dt.getDate()).padStart(2,'0');
}

// ─── Catálogo de códigos LSD (subconjunto frecuente) ──────────────────
// Tabla simplificada — los códigos exactos los publica AFIP en su manual.
// Cuando un concepto no tiene código mapeado, se usa el genérico
// "OTROS_REM" (110) o "OTROS_NO_REM" (210) según aplique.
const LSD_CODIGOS_CONCEPTO = {
  // Remunerativos (1xx)
  sueldoBasico:      { cod:'100', desc:'Sueldo Básico',                    rem:true,  unidad:'D' },
  antiguedad:        { cod:'101', desc:'Adicional por Antigüedad',         rem:true,  unidad:'%' },
  presentismo:       { cod:'102', desc:'Premio por Asistencia/Presentismo',rem:true,  unidad:'%' },
  hsExtra50:         { cod:'103', desc:'Horas Extras al 50%',              rem:true,  unidad:'H' },
  hsExtra100:        { cod:'104', desc:'Horas Extras al 100%',             rem:true,  unidad:'H' },
  sac:               { cod:'105', desc:'Sueldo Anual Complementario (SAC)',rem:true,  unidad:'M' },
  vacaciones:        { cod:'106', desc:'Vacaciones',                       rem:true,  unidad:'D' },
  ajuste:            { cod:'107', desc:'Ajuste de Haberes',                rem:true,  unidad:'M' },
  cumplObjetivos:    { cod:'108', desc:'Cumplimiento de Objetivos',        rem:true,  unidad:'M' },
  preaviso:          { cod:'109', desc:'Preaviso (Art. 232 LCT)',          rem:true,  unidad:'M' },
  sacProporcional:   { cod:'120', desc:'SAC Proporcional al Cese',         rem:true,  unidad:'M' },
  licEspeciales:     { cod:'121', desc:'Licencias Especiales',             rem:true,  unidad:'D' },
  otroRem:           { cod:'110', desc:'Otros Conceptos Remunerativos',    rem:true,  unidad:'M' },
  // No remunerativos (2xx)
  hsExtrasExentas:   { cod:'201', desc:'Horas Extras Exentas Ganancias',   rem:false, unidad:'H' },
  bonoExento:        { cod:'202', desc:'Bono Productivo Exento',           rem:false, unidad:'M' },
  vacNoGozadas:      { cod:'203', desc:'Vacaciones No Gozadas (Art. 156)', rem:false, unidad:'D' },
  integrMesDespido:  { cod:'204', desc:'Integración Mes Despido (Art. 233)',rem:false, unidad:'M' },
  indemAntig:        { cod:'205', desc:'Indemnización Antigüedad (Art. 245)',rem:false,unidad:'M' },
  indemniz:          { cod:'206', desc:'Indemnizaciones',                  rem:false, unidad:'M' },
  asignNoRem:        { cod:'207', desc:'Asignación No Remunerativa',       rem:false, unidad:'M' },
  otroNoRem:         { cod:'210', desc:'Otros Conceptos No Remunerativos', rem:false, unidad:'M' },
  // Descuentos (3xx)
  jubilacion:        { cod:'301', desc:'Aporte Jubilatorio (11%)',         rem:true,  unidad:'%', desc_aporte:true },
  obraSocial:        { cod:'302', desc:'Aporte Obra Social (3%)',          rem:true,  unidad:'%', desc_aporte:true },
  pamiEmp:           { cod:'303', desc:'Aporte Ley 19032 / PAMI (3%)',     rem:true,  unidad:'%', desc_aporte:true },
  anssal:            { cod:'304', desc:'Aporte ANSSAL',                    rem:true,  unidad:'%', desc_aporte:true },
  sindicato:         { cod:'305', desc:'Cuota Sindical',                   rem:true,  unidad:'%', desc_aporte:true },
  ganancias:         { cod:'306', desc:'Retención Impuesto a las Ganancias',rem:false,unidad:'M' },
  embargo:           { cod:'307', desc:'Embargo Judicial',                 rem:false, unidad:'M' },
  anticipos:         { cod:'308', desc:'Anticipos de Sueldo',              rem:false, unidad:'M' },
  mDescSuspension:   { cod:'309', desc:'Descuento por Suspensión',         rem:false, unidad:'D' },
  otrosDesc:         { cod:'310', desc:'Otros Descuentos',                 rem:false, unidad:'M' }
};

// ─── F.903 Períodos ────────────────────────────────────────────────────
function _lsdGenerarF903(liq, empresaCUIT){
  // Una línea por liquidación. Estructura aproximada:
  //   - CUIT empleador (11)
  //   - Período (YYYYMM, 6)
  //   - Tipo liquidación (2): 01=mensual, 11=quinc1, 12=quinc2, 02=SAC, 03=vac, 04=final
  //   - Fecha desde (YYYYMMDD, 8)
  //   - Fecha hasta (YYYYMMDD, 8)
  //   - Fecha pago (YYYYMMDD, 8)
  //   - Cantidad empleados (5)
  //   - Total haberes (15: 13 enteros + 2 decimales como centavos)
  //   - Total descuentos (15)
  //   - Total neto (15)
  const tipoMap = {
    mensual:'01', quincenal_1:'11', quincenal_2:'12',
    sac1:'02', sac2:'02', vacaciones:'03', final:'04', complementaria:'05'
  };
  const tipo = tipoMap[liq.tipo] || '99';
  const cuit = _lsdLimpiarCUIL(empresaCUIT);
  const periodo = _lsdYYYYMM(liq.periodo);

  // Fechas del período según tipo
  let desde, hasta;
  if(liq.tipo === 'quincenal_1'){
    desde = new Date(liq.anio, liq.mes-1, 1);
    hasta = new Date(liq.anio, liq.mes-1, 15);
  } else if(liq.tipo === 'quincenal_2'){
    desde = new Date(liq.anio, liq.mes-1, 16);
    hasta = new Date(liq.anio, liq.mes, 0);
  } else {
    desde = new Date(liq.anio, liq.mes-1, 1);
    hasta = new Date(liq.anio, liq.mes, 0);
  }
  const fechaPago = liq.fechaPago ? new Date(liq.fechaPago) : hasta;

  const totH = liq.items.reduce((s,i)=>s+$m(i.totalHaberes), 0);
  const totD = liq.items.reduce((s,i)=>s+$m(i.totalDescuentos), 0);
  const totN = liq.items.reduce((s,i)=>s+$m(i.netoAPagar), 0);
  const cantEmp = liq.items.length;

  const linea =
    _lsdPad(cuit, 11, '0', true) +
    periodo +
    tipo +
    _lsdFechaToYYYYMMDD(desde) +
    _lsdFechaToYYYYMMDD(hasta) +
    _lsdFechaToYYYYMMDD(fechaPago) +
    _lsdPad(String(cantEmp), 5, '0', true) +
    _lsdImporteCentavos(totH, 15) +
    _lsdImporteCentavos(totD, 15) +
    _lsdImporteCentavos(totN, 15);
  return linea;
}

// ─── F.902 Empleados ───────────────────────────────────────────────────
function _lsdGenerarF902(liq, items, empresaCUIT){
  // Una línea por empleado en el período. Estructura aproximada:
  //   - CUIT empleador (11)
  //   - Período (6)
  //   - CUIL empleado (11)
  //   - Apellido y Nombre (40)
  //   - Categoría (15)
  //   - Fecha ingreso (8)
  //   - Días trabajados (3)
  //   - Total bruto remunerativo (15 centavos)
  //   - Total no remunerativo (15)
  //   - Total descuentos (15)
  //   - Neto a pagar (15)
  //   - CBU (22)
  //   - Forma de pago (1): 1=transferencia, 2=cheque, 3=efectivo
  //   - Cód. obra social (6)
  //   - Cód. sindicato (8)
  const cuit = _lsdLimpiarCUIL(empresaCUIT);
  const periodo = _lsdYYYYMM(liq.periodo);
  const lineas = [];
  items.forEach(item => {
    const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === item.leg) || {};
    const cbu = (() => {
      // Buscar CBU activo
      if(typeof getCBUsActivos === 'function'){
        const list = getCBUsActivos(item.leg);
        if(list?.length) return String(list[0].cbu||'').replace(/[^\d]/g,'');
      }
      return String(emp.cbu||'').replace(/[^\d]/g,'');
    })();
    const linea =
      _lsdPad(cuit, 11, '0', true) +
      periodo +
      _lsdPad(_lsdLimpiarCUIL(item.cuil), 11, '0', true) +
      _lsdPad(_lsdSinAcentos((item.nom||'').replace(/,/g,'')), 40, ' ') +
      _lsdPad(_lsdSinAcentos(emp.cat || emp.desc_categoria || ''), 15, ' ') +
      _lsdFechaToYYYYMMDD((typeof parseFechaIng==='function') ? parseFechaIng(emp.ing) : null) +
      _lsdPad(String(Math.min(99, $m(item.diasTrab))), 3, '0', true) +
      _lsdImporteCentavos(item.totalHaberesRem, 15) +
      _lsdImporteCentavos(item.totalExentos, 15) +
      _lsdImporteCentavos(item.totalDescuentos, 15) +
      _lsdImporteCentavos(item.netoAPagar, 15) +
      _lsdPad(cbu, 22, '0', true) +
      (cbu ? '1' : '2') +
      _lsdPad(emp.cod_os || '', 6, ' ') +
      _lsdPad(emp.cod_sindicato || '', 8, ' ');
    lineas.push(linea);
  });
  return lineas.join('\r\n');
}

// ─── F.901 Conceptos ───────────────────────────────────────────────────
// Por cada empleado emite N líneas: una por concepto liquidado distinto de 0.
// Estructura aproximada por línea:
//   - CUIT empleador (11)
//   - Período (6)
//   - CUIL empleado (11)
//   - Código de concepto LSD (3)
//   - Descripción (50)
//   - Tipo (1): R=Remunerativo, N=No Rem., D=Descuento
//   - Cantidad (8): días/horas/% según unidad
//   - Importe (15 centavos, signed)
function _lsdGenerarF901(liq, items, empresaCUIT){
  const cuit = _lsdLimpiarCUIL(empresaCUIT);
  const periodo = _lsdYYYYMM(liq.periodo);
  const lineas = [];

  items.forEach(item => {
    const cuil = _lsdPad(_lsdLimpiarCUIL(item.cuil), 11, '0', true);
    const filaConcepto = (key, monto, qty) => {
      const def = LSD_CODIGOS_CONCEPTO[key];
      if(!def) return;
      if(!monto) return;  // No emitir conceptos en cero
      const tipo = def.desc_aporte ? 'D' : (def.rem ? 'R' : 'N');
      // NaN-safe: si qty es null/undefined/NaN, emitir 0.00 sin romper el padding.
      const qtyNum = (qty == null) ? 0 : Number(qty);
      const qtyStr = (isNaN(qtyNum) ? 0 : qtyNum).toFixed(2);
      const linea =
        _lsdPad(cuit, 11, '0', true) +
        periodo +
        cuil +
        _lsdPad(def.cod, 3, '0', true) +
        _lsdPad(_lsdSinAcentos(def.desc), 50, ' ') +
        tipo +
        _lsdPad(qtyStr, 8, ' ', true) +
        _lsdImporteCentavos(monto, 15);
      lineas.push(linea);
    };

    // ── Remunerativos ──
    filaConcepto('sueldoBasico',    item.sueldoBasico,    item.diasTrab);
    filaConcepto('antiguedad',      item.mAntig,          item.pctAntig);
    filaConcepto('presentismo',     item.mPres,           null);
    filaConcepto('hsExtra50',       item.mHsE50,          item.hsE50 || item.nov?.hsExtra50);
    filaConcepto('hsExtra100',      item.mHsE100,         item.hsE100 || item.nov?.hsExtra100);
    filaConcepto('sac',             item.mSac,            null);
    filaConcepto('vacaciones',      item.mVac,            null);
    filaConcepto('licEspeciales',   item.mLicEspeciales,  null);
    filaConcepto('ajuste',          item.mAjuste,         null);
    filaConcepto('cumplObjetivos',  item.mCumpObj,        null);
    filaConcepto('preaviso',        item.mPreaviso,       null);
    filaConcepto('sacProporcional', item.mSacProporcional,null);
    // Otros remunerativos (sumarizados, sin abrir item por item para no
    // explotar la cantidad de líneas)
    if($m(item.mOtrosHRem) > 0){
      filaConcepto('otroRem', item.mOtrosHRem, null);
    }

    // ── No remunerativos ──
    filaConcepto('hsExtrasExentas',  item.mHsExtrasExentas, null);
    filaConcepto('bonoExento',       item.mBonoExento,      null);
    filaConcepto('vacNoGozadas',     item.mVacNoGozadas,    null);
    filaConcepto('integrMesDespido', item.mIntegrMesDesp,   null);
    filaConcepto('indemAntig',       item.mIndemAntig,      null);
    filaConcepto('indemniz',         item.mIndemniz,        null);
    if($m(item.mOtrosHNoRem) > 0){
      filaConcepto('otroNoRem', item.mOtrosHNoRem, null);
    }

    // ── Descuentos ── (negativos por convención de LSD)
    filaConcepto('jubilacion', -$m(item.jubilacion), null);
    filaConcepto('obraSocial', -$m(item.obraSocial), null);
    filaConcepto('pamiEmp',    -$m(item.pamiEmp),    null);
    filaConcepto('anssal',     -$m(item.anssal),     null);
    filaConcepto('sindicato',  -$m(item.sindicato),  null);
    // NOTA: si item.ganancias < 0 es una DEVOLUCIÓN; aquí se emite con signo
    // invertido (el neto resulta correcto). Una devolución bajo el código 306
    // de retención puede requerir tratamiento/concepto específico según la
    // versión vigente del Libro de Sueldos Digital (ARCA) — verificar al cierre anual.
    filaConcepto('ganancias',  -$m(item.ganancias) - $m(item.ajusteGananciasAnual),  null); // incluye ajuste liq. anual (abril)
    filaConcepto('embargo',    -$m(item.embargo),    null);
    filaConcepto('anticipos',  -$m(item.anticiposDesc), null);
    filaConcepto('mDescSuspension', -$m(item.mDescSuspension), item.diasSuspension);
    if($m(item.mOtrosD) > 0){
      filaConcepto('otrosDesc', -$m(item.mOtrosD), null);
    }

    // ── Conceptos custom (definidos por RRHH/Admin) ──
    // Cada concepto custom emite una línea propia con su lsdCodigo configurado.
    // Si el código está vacío, se usa el genérico (110 rem / 210 no rem / 310 desc).
    (item.conceptosCustom || []).forEach(cc => {
      if(!cc || !cc.monto) return;
      const codAFIP = (cc.concepto?.lsdCodigo || '').trim() || (
        cc.tipo === 'REM' ? '110' :
        cc.tipo === 'NO_REM' ? '210' : '310'
      );
      const tipoLetra = (cc.tipo === 'REM') ? 'R' :
                        (cc.tipo === 'NO_REM') ? 'N' :
                        (cc.tipo === 'CONTRIBUCION_PATRONAL') ? 'C' : 'D';
      // Para descuentos/aportes el monto va negativo
      const signo = (cc.tipo === 'DESCUENTO' || cc.tipo === 'APORTE') ? -1 : 1;
      const monto = signo * cc.monto;
      const linea =
        _lsdPad(cuit, 11, '0', true) +
        periodo +
        cuil +
        _lsdPad(codAFIP, 3, '0', true) +
        _lsdPad(_lsdSinAcentos(cc.nombre || cc.codigo), 50, ' ') +
        tipoLetra +
        _lsdPad('0.00', 8, ' ', true) +
        _lsdImporteCentavos(monto, 15);
      lineas.push(linea);
    });
  });

  return lineas.join('\r\n');
}

// ─── Agrupar items por CUIT empleador ──────────────────────────────────
function _lsdAgruparPorCUIT(liq){
  const grupos = {};
  liq.items.forEach(it => {
    let cuit = '';
    if(typeof getEmpresaByNom === 'function'){
      const e = getEmpresaByNom(it.empresa);
      cuit = String(e?.cuit || '').replace(/[^\d]/g,'');
    }
    cuit = cuit || 'SIN_CUIT';
    if(!grupos[cuit]) grupos[cuit] = { cuit, empresa: it.empresa, items: [] };
    grupos[cuit].items.push(it);
  });
  return grupos;
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal LSD
// ═══════════════════════════════════════════════════════════════════════════
function abrirModalLSD(){
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación calculada','var(--yellow)'); return; }
  if(!liq.items?.length){ toast('⚠ Sin items','var(--yellow)'); return; }

  // Asegurar que el cache de empresas ABM esté cargado para resolver CUITs.
  if(typeof _refreshEmpresasABMCache === 'function'){
    _refreshEmpresasABMCache().then(() => _lsdContinuarApertura(liq))
                              .catch(() => _lsdContinuarApertura(liq));
  } else {
    _lsdContinuarApertura(liq);
  }
}

function _lsdContinuarApertura(liq){
  const grupos = _lsdAgruparPorCUIT(liq);
  const cuitsCount = Object.keys(grupos).length;
  const sinCUIT = grupos['SIN_CUIT']?.items?.length || 0;

  const empresasHtml = Object.values(grupos).map(g => `
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;align-items:center">
      <div style="font-family:var(--font-mono);font-size:11px;color:${g.cuit==='SIN_CUIT'?'var(--red)':'var(--t1)'}">${g.cuit==='SIN_CUIT' ? '⚠ SIN CUIT' : 'CUIT '+g.cuit}</div>
      <div style="font-size:12px;color:var(--t1)">${g.empresa}</div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${g.items.length} CUILs</div>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = 'modal-lsd';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:660px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📚 Libro Sueldo Digital (LSD)</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">RG (AFIP) 3781 · Período ${liq.periodo} · ${liq.items.length} empleados · ${cuitsCount} CUIT${cuitsCount!==1?'s':''}</div>
        </div>
        <button onclick="document.getElementById('modal-lsd').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <div style="background:rgba(94,194,255,.05);border:1px solid rgba(94,194,255,.2);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--t2);line-height:1.6">
          El LSD reemplaza al libro de sueldos en papel para empleadores adheridos al sistema.
          Genera <strong>3 archivos TXT posicionales</strong> que se cargan en el aplicativo
          AFIP "Libro de Sueldos Digital":
          <ul style="margin:6px 0 0 18px;padding:0;font-size:11px">
            <li><strong>F.903</strong> — Períodos (1 línea por período)</li>
            <li><strong>F.902</strong> — Empleados (1 línea por CUIL)</li>
            <li><strong>F.901</strong> — Conceptos (varias líneas por CUIL — cada concepto liquidado)</li>
          </ul>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Empleadores (1 set de archivos por CUIT)</label>
          <div style="display:flex;flex-direction:column;gap:6px">${empresasHtml}</div>
          ${sinCUIT > 0 ? `
            <div style="margin-top:10px;font-size:11px;color:var(--red);background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.3);border-radius:4px;padding:8px 12px;line-height:1.5">
              ⚠ Hay ${sinCUIT} empleados con empresa sin CUIT cargado. Configurá el CUIT en
              <strong>Empresas (ABM)</strong> antes de presentar el LSD.
            </div>` : ''}
        </div>

        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong>Importante:</strong> los códigos de concepto AFIP son aproximaciones a la tabla
          oficial vigente. El operador debe contrastar con el manual de LSD vigente y, si AFIP
          rechaza algún concepto, ajustarlo manualmente en los TXT antes de subir.
          Los conceptos no mapeados se emiten como "OTROS REM" (110) o "OTROS NO REM" (210).
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-lsd').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="generarLibroSueldoDigital()" style="font-size:13px;padding:8px 18px" ${sinCUIT > 0 ? 'disabled style="opacity:.5;cursor:not-allowed" title="Configurá CUITs antes"' : ''}>📥 Generar archivos LSD</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function generarLibroSueldoDigital(){
  const liq = _liqActiva;
  if(!liq){ toast('⚠ Sin liquidación','var(--red)'); return; }
  const grupos = _lsdAgruparPorCUIT(liq);
  if(grupos['SIN_CUIT']){ toast('⚠ Configurá los CUITs primero','var(--red)'); return; }

  // Por cada CUIT, generar 3 archivos
  let totalArchivos = 0;
  for(const grupo of Object.values(grupos)){
    const periodoTxt = liq.periodo.replace(/-/g, '');
    const baseFname = `LSD_${grupo.cuit}_${periodoTxt}`;

    const f903 = _lsdGenerarF903(liq, grupo.cuit) + '\r\n';
    const f902 = _lsdGenerarF902(liq, grupo.items, grupo.cuit) + '\r\n';
    const f901 = _lsdGenerarF901(liq, grupo.items, grupo.cuit) + '\r\n';

    [
      { name: `${baseFname}_F903_Periodos.txt`,  content: f903 },
      { name: `${baseFname}_F902_Empleados.txt`, content: f902 },
      { name: `${baseFname}_F901_Conceptos.txt`, content: f901 }
    ].forEach(f => {
      const blob = new Blob([f.content], { type:'text/plain;charset=ascii' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(a.href);
      totalArchivos++;
    });
  }

  toast(`✓ ${totalArchivos} archivos LSD descargados (${Object.keys(grupos).length} CUIT${Object.keys(grupos).length!==1?'s':''})`, 'var(--green)');
  document.getElementById('modal-lsd')?.remove();

  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'lsd_generado', {
      liqId: liq.id, periodo: liq.periodo, cuits: Object.keys(grupos),
      por: currentUser?.emp?.nom
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Libro Art. 52 LCT (Excel) — versión mejorada
// ───────────────────────────────────────────────────────────────────────────
// Sustituye al CSV plano por un Excel con todos los conceptos del LCT y zona
// para firma del trabajador. Imprimible y rubricable en autoridad
// administrativa para empleadores no adheridos a LSD.
// ═══════════════════════════════════════════════════════════════════════════
async function exportarLibroArt52Excel(){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq) return;
  const nomina = (typeof getNomina==='function' ? getNomina() : []);

  const headers = [
    `LIBRO DE SUELDOS Y JORNALES — ART. 52 LCT`,
    `Período: ${liq.periodo} · Tipo: ${liq.tipo}`,
    '',
    [
      'Legajo','CUIL','Apellido y Nombre','Empresa','Categoría','Ingreso','Días Trab.',
      'Sueldo Básico','Antig.','Presentismo','HE 50%','HE 100%','SAC','Vac.','Otros Rem.','Total Rem.',
      'No Rem.','Total Haberes',
      'Jub.','OS','PAMI','ANSSAL','Sind.','Gan.','Embargo','Anticipos','Otros Desc.','Total Desc.',
      'NETO','Firma del Trabajador'
    ]
  ];
  const rows = [];
  rows.push([headers[0]]);
  rows.push([headers[1]]);
  rows.push([]);
  rows.push(headers[3]);

  liq.items.forEach(i => {
    const emp = nomina.find(e => e.leg === i.leg) || {};
    rows.push([
      i.leg, i.cuil || '', i.nom || '', i.empresa || '',
      emp.cat || emp.desc_categoria || '', emp.ing || '', $m(i.diasTrab),
      +$m(i.sueldoBasico).toFixed(2), +$m(i.mAntig).toFixed(2), +$m(i.mPres).toFixed(2),
      +$m(i.mHsE50).toFixed(2), +$m(i.mHsE100).toFixed(2), +$m(i.mSac).toFixed(2),
      +$m(i.mVac).toFixed(2), +$m(i.mOtrosHRem).toFixed(2), +$m(i.totalHaberesRem).toFixed(2),
      +$m(i.totalExentos).toFixed(2), +$m(i.totalHaberes).toFixed(2),
      +$m(i.jubilacion).toFixed(2), +$m(i.obraSocial).toFixed(2), +$m(i.pamiEmp).toFixed(2),
      +$m(i.anssal).toFixed(2), +$m(i.sindicato).toFixed(2), +$m(i.ganancias).toFixed(2),
      +$m(i.embargo).toFixed(2), +$m(i.anticiposDesc).toFixed(2), +$m(i.mOtrosD).toFixed(2),
      +$m(i.totalDescuentos).toFixed(2),
      +$m(i.netoAPagar).toFixed(2),
      ''  // Firma vacía
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    {wch:8},{wch:13},{wch:30},{wch:18},{wch:12},{wch:11},{wch:8},
    ...Array(9).fill({wch:11}),
    {wch:11},{wch:12},
    ...Array(10).fill({wch:10}),
    {wch:12}, {wch:25}
  ];
  // Merge primera línea (título)
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:14} },
    { s:{r:1,c:0}, e:{r:1,c:14} }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Libro Sueldos');
  const fname = `Libro_Sueldos_Art52_${liq.periodo}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ Libro Art. 52 LCT descargado (${liq.items.length} empleados)`, 'var(--green)');
}

// Reemplazo del exportarLibroLey viejo (CSV) por la versión Excel.
async function exportarLibroLey(){
  await exportarLibroArt52Excel();
}
