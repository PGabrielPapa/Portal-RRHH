import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

interface Lic { id: number; tipo: string; desde: string; hasta: string; dias: number; motivo?: string; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; resuelto_por?: string; }

const TIPOS = ['Vacaciones', 'Enfermedad', 'Examen', 'Matrimonio', 'Fallecimiento familiar', 'Nacimiento', 'Mudanza', 'Donación de sangre', 'Otra'];
const colorEstado = (e: string) => e === 'aprobada' ? 'var(--green)' : e === 'rechazada' ? 'var(--red)' : 'var(--yellow)';
const fmt = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '—';

export default function Licencias() {
  const { key } = useParams();
  const modoMias = key === 'mis-licencias';   // personal vs gestión
  const [items, setItems] = useState<Lic[]>([]);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'Vacaciones' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setItems(await api.get<Lic[]>(modoMias ? '/licencias/mias' : '/licencias')); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key]);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/licencias', { tipo: f.tipo, desde: f.desde, hasta: f.hasta, motivo: f.motivo }); setF({ tipo: 'Vacaciones' }); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function resolver(l: Lic, estado: string) { try { await api.patch(`/licencias/${l.id}`, { estado }); load(); } catch (e: any) { setErr(e.message); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{modoMias ? 'Mis licencias' : 'Licencias — gestión'}</h2>

      {modoMias && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={solicitar}>
          <h3 style={{ marginTop: 0 }}>Solicitar licencia</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Tipo</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"></div>
            <div className="field"><label>Desde *</label><input className="input" type="date" value={f.desde || ''} onChange={set('desde')} /></div>
            <div className="field"><label>Hasta *</label><input className="input" type="date" value={f.hasta || ''} onChange={set('hasta')} /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Motivo</label><textarea className="input" rows={2} value={f.motivo || ''} onChange={set('motivo')} /></div>
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          <button className="btn" disabled={busy || !f.desde || !f.hasta}>{busy ? 'Enviando…' : 'Solicitar'}</button>
        </form>
      )}
      {!modoMias && err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>
            {!modoMias && <th>Empleado</th>}
            <th>Tipo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Estado</th>{!modoMias && <th></th>}
          </tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                {!modoMias && <td>{l.nom} <span className="muted">({l.leg_num})</span></td>}
                <td>{l.tipo}</td><td>{fmt(l.desde)}</td><td>{fmt(l.hasta)}</td><td>{l.dias}</td>
                <td><span className="badge" style={{ color: colorEstado(l.estado) }}>{l.estado}</span></td>
                {!modoMias && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {l.estado === 'pendiente' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(l, 'aprobada')}>Aprobar</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(l, 'rechazada')}>Rechazar</button>
                  </> : <span className="muted" style={{ fontSize: 12 }}>{l.resuelto_por ? `por ${l.resuelto_por}` : ''}</span>}
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={modoMias ? 5 : 7} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin licencias.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
