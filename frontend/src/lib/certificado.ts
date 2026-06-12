const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fmtFecha = (iso?: string) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const money = (n: number) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
function aniosAntig(ingreso?: string) { if (!ingreso) return 0; const i = new Date(ingreso); const h = new Date(); let a = h.getFullYear() - i.getFullYear(); if (h.getMonth() < i.getMonth()) a--; return Math.max(0, a); }

export interface CertData {
  destinatario?: string;
  campos: Record<string, boolean>;
  empleado: { nom: string; dni: string; cuil?: string; legNum: string; empresa: string; cuit?: string; logo?: string; ingreso?: string; cat?: string; bruto?: number; condicion?: string; lugar?: string };
}

export function imprimirCertificado(d: CertData) {
  const e = d.empleado; const c = d.campos || {};
  const partes: string[] = [];
  partes.push(`presta servicios en relación de dependencia en esta empresa`);
  if (c.fecha_ingreso && e.ingreso) partes.push(`desde el ${fmtFecha(e.ingreso)}`);
  if (c.antiguedad && e.ingreso) partes.push(`con una antigüedad de ${aniosAntig(e.ingreso)} año(s)`);
  if ((c.cargo || c.categoria) && e.cat) partes.push(`desempeñándose en la categoría "${e.cat}"`);
  if (c.condicion && e.condicion) partes.push(`bajo la condición de ${e.condicion}`);
  if (c.lugar_trabajo && e.lugar) partes.push(`en ${e.lugar}`);
  if (c.remuneracion) partes.push(`percibiendo una remuneración bruta mensual de ${money(e.bruto || 0)}`);
  const cuerpo = `Se certifica que ${e.nom}, DNI ${e.dni}, CUIL ${e.cuil || '—'}, legajo ${e.legNum}, ${partes.join(', ')}.`;
  const dest = d.destinatario ? `Se extiende el presente a pedido del/de la interesado/a para ser presentado ante ${d.destinatario}.` : `Se extiende el presente a pedido del/de la interesado/a a los efectos que estime corresponder.`;
  const hoy = fmtFecha(new Date().toISOString().slice(0, 10));

  const w = window.open('', '_blank', 'width=820,height=950'); if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Certificado de trabajo - ${e.legNum}</title>
  <style>body{font-family:'Times New Roman',serif;color:#000;padding:60px;max-width:720px;margin:0 auto;font-size:14px;line-height:1.9}
  h1{font-size:20px;text-align:center;letter-spacing:2px;margin-bottom:40px}p{text-align:justify;margin:16px 0}
  .empresa{text-align:center;font-weight:bold;margin-bottom:30px}.firma{margin-top:90px;text-align:center}
  .firma .l{width:280px;border-top:1px solid #000;margin:0 auto;padding-top:6px}</style></head><body>
  ${e.logo ? `<div style="text-align:center;margin-bottom:10px"><img src="${e.logo}" style="max-height:70px;max-width:240px"></div>` : ''}
  <div class="empresa">${e.empresa}${e.cuit ? ` — CUIT ${e.cuit}` : ''}</div>
  <h1>CERTIFICADO DE TRABAJO</h1>
  <p>${cuerpo}</p>
  <p>${dest}</p>
  <p>Ciudad Autónoma de Buenos Aires, ${hoy}.</p>
  <div class="firma"><div class="l">Firma y sello — RR.HH.</div></div>
  <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}
