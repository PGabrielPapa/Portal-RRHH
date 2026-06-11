import { useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

interface Recibo {
  empleado: { legNum: string; nom: string; empresa: string; cuil?: string; cat?: string };
  periodo: { anio: number; mes: number };
  haberes: { concepto: string; tipo: string; monto: number }[];
  descuentos: { concepto: string; monto: number }[];
  totales: { totalRemun: number; totalNoRem: number; totalHaberes: number; totalDescuentos: number; neto: number };
  nota?: string;
}

export default function Liquidacion() {
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<Empleado[]>([]);
  const [sel, setSel] = useState<Empleado | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function buscar(v: string) {
    setQ(v); setSel(null);
    if (v.trim().length < 2) { setMatches([]); return; }
    try { setMatches((await api.get<Empleado[]>(`/empleados?q=${encodeURIComponent(v)}`)).slice(0, 8)); } catch { /* noop */ }
  }
  function elegir(e: Empleado) { setSel(e); setQ(`${e.nom} (${e.legNum})`); setMatches([]); setRecibo(null); }

  async function calcular() {
    if (!sel) return;
    setErr(''); setBusy(true); setRecibo(null);
    try { setRecibo(await api.post<Recibo>('/liquidacion/calcular', { empleadoId: sel.id, anio, mes })); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Liquidación</h2>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field" style={{ position: 'relative', marginBottom: 12 }}>
          <label>Empleado</label>
          <input className="input" placeholder="Buscar por nombre, legajo o DNI…" value={q} onChange={(e) => buscar(e.target.value)} />
          {matches.length > 0 && (
            <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 240, overflow: 'auto' }}>
              {matches.map((e) => (
                <div key={e.id} onClick={() => elegir(e)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  {e.nom} <span className="muted">· {e.legNum} · {e.empresa}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field"><label>Mes</label>
            <select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Año</label><input className="input" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ width: 110 }} /></div>
          <button className="btn" onClick={calcular} disabled={!sel || busy}>{busy ? 'Calculando…' : 'Calcular recibo'}</button>
        </div>
        {err && <div className="err" style={{ marginTop: 10 }}>⚠ {err}</div>}
      </div>

      {recibo && (
        <div className="card">
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
              <table>
                <tbody>
                  {recibo.haberes.map((h, i) => (
                    <tr key={i}><td>{h.concepto} {h.tipo === 'norem' && <span className="badge">No rem.</span>}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(h.monto)}</td></tr>
                  ))}
                  <tr><td style={{ fontWeight: 600 }}>Total haberes</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.totales.totalHaberes)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px' }}>Descuentos</h4>
              <table>
                <tbody>
                  {recibo.descuentos.map((h, i) => (
                    <tr key={i}><td>{h.concepto}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{money(h.monto)}</td></tr>
                  ))}
                  <tr><td style={{ fontWeight: 600 }}>Total descuentos</td><td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{money(recibo.totales.totalDescuentos)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Neto a cobrar</strong>
            <strong style={{ fontSize: 20, fontFamily: 'monospace', color: 'var(--green)' }}>{money(recibo.totales.neto)}</strong>
          </div>
          {recibo.nota && <p className="muted" style={{ marginTop: 10 }}>⚠ {recibo.nota}</p>}
        </div>
      )}
    </>
  );
}
