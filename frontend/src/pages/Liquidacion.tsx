import { useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import ReciboView, { Recibo } from '../components/ReciboView';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Liquidacion() {
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<Empleado[]>([]);
  const [sel, setSel] = useState<Empleado | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  async function buscar(v: string) {
    setQ(v); setSel(null);
    if (v.trim().length < 2) { setMatches([]); return; }
    try { setMatches((await api.get<Empleado[]>(`/empleados?q=${encodeURIComponent(v)}`)).slice(0, 8)); } catch { /* noop */ }
  }
  function elegir(e: Empleado) { setSel(e); setQ(`${e.nom} (${e.legNum})`); setMatches([]); setRecibo(null); setSaveMsg(''); }

  async function calcular() {
    if (!sel) return;
    setErr(''); setSaveMsg(''); setBusy(true); setRecibo(null);
    try { setRecibo(await api.post<Recibo>('/liquidacion/calcular', { empleadoId: sel.id, anio, mes })); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function guardar() {
    if (!sel) return;
    setErr(''); setBusy(true);
    try { await api.post('/liquidacion/guardar', { empleadoId: sel.id, anio, mes }); setSaveMsg('Recibo guardado ✓ (visible para el empleado en “Mis recibos”)'); }
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
          <button className="btn" onClick={calcular} disabled={!sel || busy}>{busy ? 'Procesando…' : 'Calcular recibo'}</button>
          {recibo && <button className="btn ghost" onClick={guardar} disabled={busy}>Guardar recibo</button>}
        </div>
        {err && <div className="err" style={{ marginTop: 10 }}>⚠ {err}</div>}
        {saveMsg && <div className="ok" style={{ marginTop: 10 }}>✓ {saveMsg}</div>}
      </div>

      {recibo && <div className="card"><ReciboView recibo={recibo} /></div>}
    </>
  );
}
