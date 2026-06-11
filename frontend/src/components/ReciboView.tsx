const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export interface Recibo {
  empleado: { legNum: string; nom: string; empresa: string; cuil?: string; cat?: string };
  periodo: { anio: number; mes: number };
  haberes: { concepto: string; tipo: string; monto: number }[];
  descuentos: { concepto: string; monto: number }[];
  totales: { totalRemun: number; totalNoRem: number; totalHaberes: number; totalDescuentos: number; neto: number };
  costoEmpleador?: { contribuciones: { concepto: string; monto: number }[]; totalContrib: number; costoTotal: number };
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
        <div className="muted">{MESES[recibo.periodo.mes - 1]} {recibo.periodo.anio}</div>
      </div>

      <div className="grid2" style={{ marginTop: 14, alignItems: 'start' }}>
        <div>
          <h4 style={{ margin: '0 0 6px' }}>Haberes</h4>
          <table><tbody>
            {recibo.haberes.map((h, i) => (
              <tr key={i}><td>{h.concepto} {h.tipo === 'norem' && <span className="badge">No rem.</span>}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(h.monto)}</td></tr>
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

      {recibo.nota && <p className="muted" style={{ marginTop: 10 }}>⚠ {recibo.nota}</p>}
    </div>
  );
}
