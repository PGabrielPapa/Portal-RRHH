import type { Recibo } from '../components/ReciboView';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const money = (n: number) => '$ ' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);


function pieDonut(r: Recibo): string {
  let c: any = r.composicion;
  // Fallback para recibos sin composición detallada: torta simple (neto / aportes / contribuciones).
  if (!c) {
    const t: any = r.totales || {}; const ce: any = r.costoEmpleador || {};
    const neto = Number(t.neto || 0), desc = Number(t.totalDescuentos || 0), contrib = Number(ce.totalContrib || 0);
    if (neto + desc + contrib <= 0) return '';
    c = { neto, costoTotal: ce.costoTotal || (neto + desc + contrib), cargas: {}, _simple: [
      { l: 'Sueldo Neto', v: neto, col: '#2563eb' },
      { l: 'Aportes del trabajador', v: desc, col: '#dc2626' },
      { l: 'Contribuciones patronales', v: contrib, col: '#16a34a' },
    ] };
  }
  const cg = c.cargas || {};
  const sum = (x: any) => x ? (Number(x.empleador || 0) + Number(x.trabajador || 0)) : 0;
  const segs = [
    { l: 'Sueldo Neto', v: Number(c.neto || 0), col: '#2563eb' },
    { l: 'Seguridad Social', v: sum(cg.seguridadSocial), col: '#dc2626' },
    { l: 'Obra Social', v: sum(cg.obraSocial), col: '#9333ea' },
    { l: 'INSSJP (PAMI)', v: sum(cg.inssjp), col: '#ea580c' },
    { l: 'Sindical', v: sum(cg.sindical), col: '#16a34a' },
    { l: 'ART', v: Number(cg.art?.empleador || 0), col: '#0891b2' },
    { l: 'SCVO', v: Number(cg.scvo?.empleador || 0), col: '#65a30d' },
  ].filter((x) => x.v > 0.005);
  const segsFinal = c._simple ? c._simple.filter((x: any) => x.v > 0.005) : segs;
  const total = segsFinal.reduce((a: number, x: any) => a + x.v, 0) || 1;
  const R = 52, C = 60;
  let ang = -Math.PI / 2;
  const pt = (a: number) => `${(C + R * Math.cos(a)).toFixed(2)} ${(C + R * Math.sin(a)).toFixed(2)}`;
  const paths = segsFinal.map((sgm: any) => {
    const frac = sgm.v / total; if (frac <= 0) return '';
    const a2 = ang + frac * 2 * Math.PI; const large = (a2 - ang) > Math.PI ? 1 : 0;
    const d = frac >= 0.9999
      ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${(C - 0.01).toFixed(2)} ${C - R} Z`
      : `M ${C} ${C} L ${pt(ang)} A ${R} ${R} 0 ${large} 1 ${pt(a2)} Z`;
    ang = a2; return `<path d="${d}" fill="${sgm.col}" stroke="#fff" stroke-width="0.7"/>`;
  }).join('');
  const leyenda = segsFinal.map((sgm: any) => `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><span style="display:inline-block;width:8px;height:8px;background:${sgm.col}"></span><span style="flex:1">${sgm.l}</span><span style="font-family:'Courier New',monospace">${money(sgm.v)} (${Math.round(sgm.v / total * 100)}%)</span></div>`).join('');
  const filaDet = (lbl: string, x: any) => x && (x.empleador > 0 || x.trabajador > 0)
    ? `<tr><td>${lbl}</td><td class="n">${money(x.empleador)}</td><td class="n">${money(x.trabajador)}</td><td class="n">${money(x.empleador + x.trabajador)}</td></tr>` : '';
  return `
  <div class="costo">
    <div class="costo-t">Composición del costo laboral total (Decreto 407/2026)</div>
    <div class="costo-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">${paths}</svg>
      <div class="leyenda">${leyenda}<div style="margin-top:4px;font-weight:bold">Costo total: ${money(c.costoTotal || 0)}</div></div>
    </div>
    <table class="det"><thead><tr><th>Concepto</th><th class="n">Empleador</th><th class="n">Trabajador</th><th class="n">Total</th></tr></thead><tbody>
      ${filaDet('Seguridad Social (SIPA + FNE)', cg.seguridadSocial)}${filaDet('Obra Social', cg.obraSocial)}${filaDet('INSSJP (PAMI)', cg.inssjp)}${filaDet('Sindical', cg.sindical)}${filaDet('ART', cg.art)}${filaDet('SCVO', cg.scvo)}
    </tbody></table>
  </div>`;
}

function copia(r: Recibo, marca: string): string {
  const filasH = r.haberes.map((h) => `<tr><td>${esc(h.concepto)}${h.tipo === 'norem' ? ' <i>(no rem.)</i>' : h.tipo === 'exento' ? ' <i>(exento)</i>' : ''}</td><td class="n">${money(h.monto)}</td></tr>`).join('');
  const filasD = r.descuentos.map((d) => `<tr><td>${esc(d.concepto)}</td><td class="n">${money(d.monto)}</td></tr>`).join('');
  const contrib = (r.costoEmpleador?.contribuciones || []).map((c) => `<tr><td>${esc(c.concepto)}</td><td class="n">${money(c.monto)}</td></tr>`).join('');
  return `
  <div class="copia">
    <div class="marca">${marca}</div>
    <div class="head">
      <div><b>${esc(r.empleado.empresa)}</b><br/>Recibo de Haberes</div>
      <div class="right">${MESES[r.periodo.mes - 1]} ${r.periodo.anio}${r.periodo.tipoLabel ? ' · ' + esc(r.periodo.tipoLabel) : ''}${r.periodo.fechaPago ? '<br/>Pago: ' + esc(r.periodo.fechaPago) : ''}</div>
    </div>
    <table class="datos"><tr>
      <td><b>Empleado:</b> ${esc(r.empleado.nom)}</td>
      <td><b>Legajo:</b> ${esc(r.empleado.legNum)}</td>
      <td><b>CUIL:</b> ${esc(r.empleado.cuil || '')}</td>
      <td><b>Categoría:</b> ${esc(r.empleado.cat || '')}</td>
    </tr></table>
    <div class="cols">
      <table><thead><tr><th>Haberes</th><th class="n">Importe</th></tr></thead><tbody>${filasH}
        <tr class="tot"><td>Total haberes</td><td class="n">${money(r.totales.totalHaberes)}</td></tr></tbody></table>
      <table><thead><tr><th>Descuentos</th><th class="n">Importe</th></tr></thead><tbody>${filasD}
        <tr class="tot"><td>Total descuentos</td><td class="n">${money(r.totales.totalDescuentos)}</td></tr></tbody></table>
    </div>
    <div class="neto"><b>NETO A COBRAR</b><b>${money(r.totales.neto)}</b></div>
    ${contrib ? `<table class="contrib"><thead><tr><th>Costo del empleador (no afecta el neto)</th><th class="n"></th></tr></thead><tbody>${contrib}<tr class="tot"><td>Costo laboral total</td><td class="n">${money(r.costoEmpleador?.costoTotal || 0)}</td></tr></tbody></table>` : ''}
    ${pieDonut(r)}
    <div class="firmas">
      <div class="firma">
        ${r.firmaEmpleador ? `<img src="${r.firmaEmpleador}" style="max-height:54px;max-width:160px;display:block;margin:0 auto 2px"/>` : ''}
        ${r.firmante?.nombre ? `<div style="font-weight:bold">${esc(r.firmante.nombre)}</div>${r.firmante?.cargo ? `<div style="font-size:8px;text-transform:uppercase">${esc(r.firmante.cargo)}</div>` : ''}` : 'Firma del empleador'}
      </div>
      <div class="firma">Recibí conforme — firma del empleado</div>
    </div>
  </div>`;
}

export function imprimirRecibo(r: Recibo) {
  const w = window.open('', '_blank'); if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo ${esc(r.empleado.legNum)} ${r.periodo.mes}/${r.periodo.anio}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
    .copia { border: 1.5px solid #333; padding: 10px 12px; margin-bottom: 14px; position: relative; }
    .marca { position: absolute; top: 6px; right: 10px; font-size: 9px; color: #888; letter-spacing: 1px; }
    .head { display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 6px; }
    .right { text-align: right; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .datos td { font-size: 10px; padding: 2px 4px; border: 1px solid #ccc; }
    .cols { display: flex; gap: 10px; margin-top: 8px; }
    .cols table { flex: 1; }
    th, td { border: 1px solid #ccc; padding: 3px 6px; font-size: 10px; text-align: left; }
    th { background: #f3f3f3; }
    .n { text-align: right; font-family: 'Courier New', monospace; white-space: nowrap; }
    .tot td { font-weight: bold; background: #fafafa; }
    .neto { display: flex; justify-content: space-between; background: #eef6ff; border: 1px solid #99c; padding: 8px 12px; margin-top: 8px; font-size: 13px; }
    .contrib { margin-top: 8px; }
    .costo { margin-top: 10px; border-top: 1px solid #999; padding-top: 6px; }
    .costo-t { font-weight: bold; font-size: 10px; margin-bottom: 4px; }
    .costo-wrap { display: flex; gap: 14px; align-items: center; }
    .leyenda { flex: 1; font-size: 9px; }
    .det { margin-top: 6px; }
    .det th, .det td { font-size: 9px; padding: 2px 6px; }
    .firmas { display: flex; justify-content: space-between; margin-top: 24px; }
    .firma { width: 45%; border-top: 1px solid #333; padding-top: 4px; font-size: 9px; text-align: center; }
  </style></head><body>
  ${copia(r, 'ORIGINAL')}
  ${copia(r, 'DUPLICADO')}
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch { /* */ } }, 300);
}
