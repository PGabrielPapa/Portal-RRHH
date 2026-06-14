import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import EmpleadoPicker from '../components/EmpleadoPicker';
import type { Empleado } from '../lib/types';

const hoy = () => new Date().toISOString().slice(0, 10);
const fmt = (d?: string) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR') : '—';
function vence(fecha: string, meses?: number | null) {
  if (!meses) return null;
  const d = new Date(String(fecha).slice(0, 10) + 'T12:00:00'); d.setMonth(d.getMonth() + meses);
  return d;
}

interface CapTipo { codigo: string; nombre: string; obligatorio: boolean; vigencia_meses: number | null; }
interface EppTipo { codigo: string; nombre: string; categoria: string; }

export default function Hys() {
  const [tab, setTab] = useState<'cap' | 'epp'>('cap');
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [caps, setCaps] = useState<CapTipo[]>([]);
  const [epps, setEpps] = useState<EppTipo[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<Record<string, string>>({ fecha: hoy() });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  useEffect(() => { api.get<{ capacitaciones: CapTipo[]; epp: EppTipo[] }>('/hys/catalogos').then((c) => { setCaps(c.capacitaciones); setEpps(c.epp); }).catch(() => {}); }, []);
  async function load() {
    if (!emp) { setRows([]); return; }
    try { setRows(await api.get<any[]>(`/hys/${tab === 'cap' ? 'capacitaciones' : 'epp'}?empleadoId=${emp.id}`)); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { setF({ fecha: hoy() }); setOk(''); load(); /* eslint-disable-next-line */ }, [emp, tab]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk('');
    if (!emp) { setErr('Elegí un empleado.'); return; }
    try {
      if (tab === 'cap') {
        const tipo = caps.find((c) => c.codigo === f.codigo);
        await api.post('/hys/capacitaciones', { empleadoId: emp.id, codigo: f.codigo, nombre: tipo?.nombre || f.codigo, fecha: f.fecha, vigenciaMeses: tipo?.vigencia_meses, dictadaPor: f.dictadaPor, observaciones: f.observaciones });
      } else {
        const tipo = epps.find((x) => x.codigo === f.codigo);
        await api.post('/hys/epp', { empleadoId: emp.id, codigo: f.codigo, nombre: tipo?.nombre || f.codigo, cantidad: Number(f.cantidad) || 1, talle: f.talle, fecha: f.fecha, observaciones: f.observaciones });
      }
      setOk('Registrado.'); setF({ fecha: hoy() }); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function borrar(id: number) { try { await api.del(`/hys/${tab === 'cap' ? 'capacitaciones' : 'epp'}/${id}`); load(); } catch (e: any) { setErr(e.message); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Higiene y Seguridad</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Capacitaciones obligatorias (Res. SRT 905/2015) y entrega de EPP (Res. SRT 299/2011) por empleado.</p>
      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        <button className={`btn ${tab === 'cap' ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setTab('cap')}>Capacitaciones</button>
        <button className={`btn ${tab === 'epp' ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setTab('epp')}>Entrega de EPP</button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="field" style={{ maxWidth: 360, marginBottom: 10 }}><label>Empleado</label><EmpleadoPicker onSelect={setEmp} /></div>
        {emp && (
          <form className="grid2" onSubmit={agregar} style={{ gap: 10 }}>
            <div className="field"><label>{tab === 'cap' ? 'Capacitación' : 'Elemento'} *</label>
              <select className="input" value={f.codigo || ''} onChange={set('codigo')} required>
                <option value="">—</option>
                {tab === 'cap' ? caps.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}{c.obligatorio ? ' (oblig.)' : ''}</option>)
                              : epps.map((x) => <option key={x.codigo} value={x.codigo}>{x.nombre} · {x.categoria}</option>)}
              </select>
            </div>
            <div className="field"><label>Fecha *</label><input className="input" type="date" value={f.fecha || ''} onChange={set('fecha')} /></div>
            {tab === 'epp' && <><div className="field"><label>Cantidad</label><input className="input" type="number" value={f.cantidad || '1'} onChange={set('cantidad')} /></div>
              <div className="field"><label>Talle</label><input className="input" value={f.talle || ''} onChange={set('talle')} /></div></>}
            {tab === 'cap' && <div className="field"><label>Dictada por</label><input className="input" value={f.dictadaPor || ''} onChange={set('dictadaPor')} /></div>}
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Observaciones</label><input className="input" value={f.observaciones || ''} onChange={set('observaciones')} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
              {ok && <div className="ok" style={{ marginBottom: 8 }}>✓ {ok}</div>}
              <button className="btn" disabled={!f.codigo}>+ Registrar</button>
            </div>
          </form>
        )}
      </div>

      {emp && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            {tab === 'cap'
              ? <><thead><tr><th>Capacitación</th><th>Fecha</th><th>Vence</th><th>Dictada por</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => { const v = vence(r.fecha, r.vigencia_meses); const venc = v && v < new Date(); return (
                    <tr key={r.id}><td>{r.nombre}</td><td>{fmt(r.fecha)}</td>
                      <td style={{ color: venc ? 'var(--red)' : undefined }}>{v ? fmt(v.toISOString()) + (venc ? ' ⚠' : '') : 'Sin vencimiento'}</td>
                      <td className="muted">{r.dictada_por || '—'}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrar(r.id)}>✕</button></td></tr>
                  ); })}
                  {!rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 18 }}>Sin capacitaciones registradas.</td></tr>}
                </tbody></>
              : <><thead><tr><th>Elemento</th><th>Cant.</th><th>Talle</th><th>Fecha</th><th>Observaciones</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}><td>{r.nombre}</td><td>{r.cantidad}</td><td>{r.talle || '—'}</td><td>{fmt(r.fecha)}</td><td className="muted">{r.observaciones || '—'}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrar(r.id)}>✕</button></td></tr>
                  ))}
                  {!rows.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 18 }}>Sin entregas registradas.</td></tr>}
                </tbody></>}
          </table>
        </div>
      )}
    </>
  );
}
