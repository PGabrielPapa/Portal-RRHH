import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Linea { cuenta: string; debe: number; haber: number; }
interface Asiento { empresa: string; lineas: Linea[]; totalDebe: number; totalHaber: number; balanceado: boolean; }

export default function Asiento() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function cargar() { setErr(''); try { const p = new URLSearchParams({ anio: String(anio), mes: String(mes) }); if (empresa) p.set('empresa', empresa); const r = await api.get<{ asientos: Asiento[] }>(`/reportes/asiento?${p}`); setAsientos(r.asientos); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [anio, mes, empresa]);

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
        <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {!asientos.length && <div className="muted">Sin recibos liquidados para ese período.</div>}
      {asientos.map((a, i) => (
        <div key={i} className="card" style={{ marginBottom: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{a.empresa}</strong>
            <span className="badge" style={{ color: a.balanceado ? 'var(--green)' : 'var(--red)' }}>{a.balanceado ? '✓ Balanceado' : '⚠ No balancea'}</span>
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Cuenta</th><th style={{ textAlign: 'right' }}>Debe</th><th style={{ textAlign: 'right' }}>Haber</th></tr></thead>
            <tbody>
              {a.lineas.map((l, j) => (
                <tr key={j}><td>{l.cuenta}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{l.debe ? $(l.debe) : ''}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{l.haber ? $(l.haber) : ''}</td></tr>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop: '2px solid var(--border)' }}><td style={{ fontWeight: 700 }}>Totales</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(a.totalDebe)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(a.totalHaber)}</td></tr></tfoot>
          </table>
        </div>
      ))}
    </>
  );
}
