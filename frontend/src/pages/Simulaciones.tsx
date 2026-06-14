import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Item { legNum: string; nom: string; empresa: string; netoActual: number; netoSim: number; costoActual: number; costoSim: number; }
interface Resp { incrementoPct: number; cant: number; items: Item[]; totales: { netoActual: number; netoSim: number; costoActual: number; costoSim: number; deltaCosto: number; deltaNeto: number }; }

export default function Simulaciones() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [pct, setPct] = useState('10');
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function simular() {
    setErr(''); setBusy(true); setData(null);
    try { setData(await api.post<Resp>('/liquidacion/simular', { anio, mes, empresa: empresa || undefined, incrementoPct: Number(pct) })); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  const t = data?.totales;
  const pctCosto = t && t.costoActual ? (t.deltaCosto / t.costoActual * 100) : 0;

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Simulaciones</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Simulá el impacto de un incremento salarial en el costo laboral, sin afectar la liquidación oficial.</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
          <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
          <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
          <div className="field"><label>Incremento %</label><input className="input" type="number" step="0.01" style={{ width: 100 }} value={pct} onChange={(e) => setPct(e.target.value)} /></div>
          <button className="btn" onClick={simular} disabled={busy}>{busy ? 'Calculando…' : '🧮 Simular'}</button>
        </div>
        {err && <div className="err" style={{ marginTop: 10 }}>⚠ {err}</div>}
      </div>

      {t && (
        <>
          <div className="grid2" style={{ marginBottom: 16 }}>
            <div className="card"><div className="muted" style={{ fontSize: 12 }}>Costo laboral actual ({data!.cant} empl.)</div><div style={{ fontSize: 20, fontFamily: 'monospace' }}>$ {$(t.costoActual)}</div></div>
            <div className="card"><div className="muted" style={{ fontSize: 12 }}>Costo laboral simulado (+{data!.incrementoPct}%)</div><div style={{ fontSize: 20, fontFamily: 'monospace', color: 'var(--accent2)' }}>$ {$(t.costoSim)}</div>
              <div style={{ fontSize: 13, color: 'var(--yellow)' }}>Δ $ {$(t.deltaCosto)} ({pctCosto.toFixed(2)}%)</div></div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table>
              <thead><tr><th>Legajo</th><th>Empleado</th><th>Empresa</th><th style={{ textAlign: 'right' }}>Neto actual</th><th style={{ textAlign: 'right' }}>Neto sim.</th><th style={{ textAlign: 'right' }}>Costo actual</th><th style={{ textAlign: 'right' }}>Costo sim.</th></tr></thead>
              <tbody>
                {data!.items.map((it, i) => (
                  <tr key={i}><td>{it.legNum}</td><td>{it.nom}</td><td>{it.empresa}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(it.netoActual)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(it.netoSim)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(it.costoActual)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent2)' }}>{$(it.costoSim)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
