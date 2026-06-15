import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Item { id: number; legNum: string; apellido: string; nombre: string; empresa: string; tarea?: string; ingreso?: string; antiguedad: number; remun: number; contrib: number; costo: number; neto: number; }
interface Resp { periodo: { anio: number; mes: number }; items: Item[]; totales: { cant: number; remun: number; contrib: number; costo: number; neto: number }; }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const money = (n: number) => '$ ' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (s?: string) => s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—';
const legD = (l?: string) => String(l || '').replace(/\D/g, '').padStart(6, '0');

export default function CostoEquipo() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(''); setBusy(true);
    try { setData(await api.get<Resp>(`/liquidacion/costo-equipo?anio=${anio}&mes=${mes}`)); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mes, anio]);

  const items = data?.items || [];
  const t = data?.totales;

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
        <span className="muted" style={{ fontSize: 12 }}>Estimación con la liquidación mensual del período. {busy ? 'Calculando…' : `${items.length} empleados a cargo.`}</span>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {t && (
        <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: 150 }}><div className="muted" style={{ fontSize: 11 }}>Remuneración total</div><div style={{ fontSize: 18, fontFamily: 'var(--font-mono)' }}>{money(t.remun)}</div></div>
          <div className="card" style={{ flex: 1, minWidth: 150 }}><div className="muted" style={{ fontSize: 11 }}>Contribuciones patronales</div><div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>{money(t.contrib)}</div></div>
          <div className="card" style={{ flex: 1, minWidth: 150 }}><div className="muted" style={{ fontSize: 11 }}>Costo laboral total</div><div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{money(t.costo)}</div></div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>
            <th>Legajo</th><th>Apellido</th><th>Nombre</th><th>Empresa</th><th>Tarea</th><th>Ingreso</th><th style={{ textAlign: 'right' }}>Antig.</th>
            <th style={{ textAlign: 'right' }}>Remuneración</th><th style={{ textAlign: 'right' }}>Contrib. patronales</th><th style={{ textAlign: 'right' }}>Costo total</th>
          </tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{legD(it.legNum)}</td>
                <td>{it.apellido}</td><td>{it.nombre}</td><td>{it.empresa}</td>
                <td className="muted">{it.tarea || '—'}</td>
                <td className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtFecha(it.ingreso)}</td>
                <td style={{ textAlign: 'right' }}>{it.antiguedad}a</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{money(it.remun)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>{money(it.contrib)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{money(it.costo)}</td>
              </tr>
            ))}
            {!items.length && !busy && <tr><td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 20 }}>No tenés empleados a cargo en el organigrama.</td></tr>}
          </tbody>
          {t && items.length > 0 && (
            <tfoot><tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td colSpan={7}>Totales ({t.cant})</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{money(t.remun)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>{money(t.contrib)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{money(t.costo)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </>
  );
}
