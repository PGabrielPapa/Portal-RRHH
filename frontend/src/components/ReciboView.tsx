const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export interface Recibo {
  empleado: { legNum: string; nom: string; empresa: string; cuil?: string; cat?: string };
  periodo: { anio: number; mes: number; tipoLabel?: string; fechaPago?: string; ganPeriodo?: string };
  haberes: { concepto: string; tipo: string; monto: number }[];
  descuentos: { concepto: string; monto: number }[];
  totales: { totalRemun: number; totalNoRem: number; totalExento?: number; totalHaberes: number; totalDescuentos: number; neto: number };
  costoEmpleador?: { contribuciones: { concepto: string; monto: number }[]; totalContrib: number; costoTotal: number };
  composicion?: {
    remun: number; noRem: number; exento: number; descuentos: number; neto: number; costoTotal: number;
    cargas: Record<string, { empleador: number; trabajador: number }>;
  };
  ganancias?: {
    remGravAcum: number; aportesAcum: number; mesesTranscurridos: number; anualizada: boolean;
    mni: number; dedEspecial: number; dedEspecial2: number; cargasFamilia: number; dedVoluntarias: number;
    remSujeta: number; impuestoDeterminado: number; retenidoAnterior: number; retencionPeriodo: number; periodo?: string;
  } | null;
  nota?: string;
}

export default function ReciboView({ recibo }: { recibo: Recibo }) {
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <strong>{recibo.empleado.nom}</strong>
          <div className="muted">Legajo {recibo.empleado.legNum} · {recibo.empleado.empresa} · {recibo.empleado.cat || ''}</div>
        </div>
        <div className="muted" style={{ textAlign: 'right' }}>{MESES[recibo.periodo.mes - 1]} {recibo.periodo.anio}{recibo.periodo.tipoLabel ? ` · ${recibo.periodo.tipoLabel}` : ''}{recibo.periodo.fechaPago ? <><br/>Pago: {recibo.periodo.fechaPago}{recibo.periodo.ganPeriodo ? ` · Ganancias ${recibo.periodo.ganPeriodo}` : ''}</> : ''}</div>
      </div>

      <div className="grid2" style={{ marginTop: 14, alignItems: 'start' }}>
        <div>
          <h4 style={{ margin: '0 0 6px' }}>Haberes</h4>
          <table><tbody>
            {recibo.haberes.map((h, i) => (
              <tr key={i}><td>{h.concepto} {h.tipo === 'norem' && <span className="badge">No rem.</span>}{h.tipo === 'exento' && <span className="badge">Exento</span>}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(h.monto)}</td></tr>
            ))}
            <tr><td style={{ fontWeight: 600 }}>Total haberes</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.totales.totalHaberes)}</td></tr>
          </tbody></table>
        </div>
        <div>
          <h4 style={{ margin: '0 0 6px' }}>Descuentos</h4>
          <table><tbody>
            {recibo.descuentos.map((h, i) => (
              <tr key={i}><td>{h.concepto}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(h.monto)}</td></tr>
            ))}
            <tr><td style={{ fontWeight: 600 }}>Total descuentos</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.totales.totalDescuentos)}</td></tr>
          </tbody></table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Neto a cobrar</strong>
        <strong style={{ fontSize: 20, fontFamily: 'monospace', color: 'var(--green)' }}>{money(recibo.totales.neto)}</strong>
      </div>
      {recibo.costoEmpleador && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 6px' }}>Costo del empleador <span className="muted" style={{ fontWeight: 400 }}>(no afecta el neto)</span></h4>
          <table><tbody>
            {recibo.costoEmpleador.contribuciones.map((c, i) => (
              <tr key={i}><td>{c.concepto}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(c.monto)}</td></tr>
            ))}
            <tr><td style={{ fontWeight: 600 }}>Total contribuciones</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.costoEmpleador.totalContrib)}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Costo laboral total</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.costoEmpleador.costoTotal)}</td></tr>
          </tbody></table>
        </div>
      )}

      {recibo.ganancias && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 6px' }}>Impuesto a las Ganancias — {recibo.ganancias.anualizada ? 'liquidación anualizada' : `acumulado a ${recibo.ganancias.mesesTranscurridos} mes(es)`}{recibo.ganancias.periodo ? ` · tabla ${recibo.ganancias.periodo}` : ''}</h4>
          <table style={{ width: '100%', fontSize: 13 }}><tbody>
            <tr><td>Remuneración gravada acumulada</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.remGravAcum)}</td></tr>
            <tr><td>(−) Aportes acumulados</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.aportesAcum)}</td></tr>
            <tr><td>(−) Ganancia no imponible</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.mni)}</td></tr>
            <tr><td>(−) Deducción especial</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.dedEspecial + recibo.ganancias.dedEspecial2)}</td></tr>
            {recibo.ganancias.cargasFamilia > 0 && <tr><td>(−) Cargas de familia</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.cargasFamilia)}</td></tr>}
            {recibo.ganancias.dedVoluntarias > 0 && <tr><td>(−) Deducciones SIRADIG</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.dedVoluntarias)}</td></tr>}
            <tr><td style={{ fontWeight: 600 }}>Ganancia sujeta a impuesto</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.ganancias.remSujeta)}</td></tr>
            <tr><td>Impuesto determinado (acumulado)</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.impuestoDeterminado)}</td></tr>
            <tr><td>(−) Retenido en meses anteriores</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(recibo.ganancias.retenidoAnterior)}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Retención del período</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: recibo.ganancias.retencionPeriodo < 0 ? 'var(--green)' : undefined }}>{money(recibo.ganancias.retencionPeriodo)}</td></tr>
          </tbody></table>
        </div>
      )}

      <CostoLaboralChart recibo={recibo} />

      {recibo.nota && <p className="muted" style={{ marginTop: 10 }}>⚠ {recibo.nota}</p>}
    </div>
  );
}


// Detalle de cargas (Decreto 407/2026) + composición salarial + torta del costo total.
function CostoLaboralChart({ recibo }: { recibo: Recibo }) {
  const comp = recibo.composicion;
  if (!comp) return null;
  const cg = comp.cargas || {};
  const filas: [string, { empleador: number; trabajador: number }][] = [
    ['Seguridad Social (SIPA + FNE)', cg.seguridadSocial],
    ['Obra Social', cg.obraSocial],
    ['INSSJP (PAMI)', cg.inssjp],
    ['Sindical', cg.sindical],
    ['ART', cg.art],
    ['SCVO', cg.scvo],
  ].filter((row) => { const v: any = row[1]; return v && (v.empleador > 0 || v.trabajador > 0); }) as [string, { empleador: number; trabajador: number }][];

  const segs = [
    { label: 'Sueldo Neto', valor: comp.neto, color: '#2563eb' },
    { label: 'Seguridad Social', valor: (cg.seguridadSocial?.empleador || 0) + (cg.seguridadSocial?.trabajador || 0), color: '#dc2626' },
    { label: 'Obra Social', valor: (cg.obraSocial?.empleador || 0) + (cg.obraSocial?.trabajador || 0), color: '#9333ea' },
    { label: 'INSSJP (PAMI)', valor: (cg.inssjp?.empleador || 0) + (cg.inssjp?.trabajador || 0), color: '#ea580c' },
    { label: 'Sindical', valor: (cg.sindical?.empleador || 0) + (cg.sindical?.trabajador || 0), color: '#16a34a' },
    { label: 'ART', valor: cg.art?.empleador || 0, color: '#0891b2' },
    { label: 'SCVO', valor: cg.scvo?.empleador || 0, color: '#65a30d' },
  ].filter((x) => x.valor > 0.005);
  const total = segs.reduce((s, x) => s + x.valor, 0) || 1;
  const R = 60, C = 80, sw = 28, circ = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ margin: '0 0 6px' }}>Composición del costo laboral total <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(Decreto 407/2026)</span></h4>
      <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          {segs.map((p, i) => {
            const frac = p.valor / total, dash = frac * circ;
            const el = <circle key={i} cx={C} cy={C} r={R} fill="none" stroke={p.color} strokeWidth={sw} strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc * circ} transform={`rotate(-90 ${C} ${C})`} />;
            acc += frac; return el;
          })}
          <text x={C} y={C - 4} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--t3)' }}>Costo total</text>
          <text x={C} y={C + 12} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: 'var(--t1)' }}>{money(comp.costoTotal)}</text>
        </svg>
        <div style={{ flex: 1, minWidth: 240 }}>
          {segs.map((p, i) => (
            <div key={i} className="row" style={{ gap: 8, marginBottom: 3, fontSize: 13 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: p.color, display: 'inline-block' }} />
              <span style={{ flex: 1 }}>{p.label}</span>
              <span style={{ fontFamily: 'monospace' }}>{money(p.valor)} <span className="muted">({Math.round(p.valor / total * 100)}%)</span></span>
            </div>
          ))}
        </div>
      </div>

      <h4 style={{ margin: '14px 0 6px' }}>Detalle de cargas (empleador / trabajador)</h4>
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Concepto</th><th style={{ textAlign: 'right' }}>Empleador</th><th style={{ textAlign: 'right' }}>Trabajador</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
        <tbody>
          {filas.map(([label, v]: [string, { empleador: number; trabajador: number }], i) => (
            <tr key={i}><td>{label}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(v.empleador)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(v.trabajador)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{money(v.empleador + v.trabajador)}</td></tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ margin: '14px 0 6px' }}>Composición salarial</h4>
      <div className="muted" style={{ fontSize: 13 }}>
        Remunerativo {money(comp.remun)} · No remunerativo {money(comp.noRem)}{comp.exento > 0 ? ` · Exento ${money(comp.exento)}` : ''} · Descuentos {money(comp.descuentos)} · <strong style={{ color: 'var(--green)' }}>Neto {money(comp.neto)}</strong>
      </div>
    </div>
  );
}
