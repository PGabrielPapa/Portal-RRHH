import type { Recibo } from '../components/ReciboView';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const money = (n: number) => '$ ' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);

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
    <div class="firmas">
      <div class="firma">Firma del empleador</div>
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
    .firmas { display: flex; justify-content: space-between; margin-top: 30px; }
    .firma { width: 45%; border-top: 1px solid #333; padding-top: 4px; font-size: 9px; text-align: center; }
  </style></head><body>
  ${copia(r, 'ORIGINAL')}
  ${copia(r, 'DUPLICADO')}
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch { /* */ } }, 300);
}
