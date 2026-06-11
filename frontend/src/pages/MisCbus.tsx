import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Cbu { id: number; cbu: string; banco?: string; alias?: string; titular?: string; activo: boolean; }

export default function MisCbus() {
  const [items, setItems] = useState<Cbu[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() { try { setItems(await api.get<Cbu[]>('/cbus')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/cbus', { cbu: f.cbu, banco: f.banco, alias: f.alias, titular: f.titular }); setF({}); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function toggle(c: Cbu) { try { await api.patch(`/cbus/${c.id}/activo`, { activo: !c.activo }); load(); } catch (e: any) { setErr(e.message); } }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mis CBUs</h2>
      <form className="card" style={{ marginBottom: 18 }} onSubmit={add}>
        <h3 style={{ marginTop: 0 }}>Agregar CBU</h3>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>CBU (22 dígitos) *</label><input className="input" value={f.cbu || ''} onChange={set('cbu')} /></div>
          <div className="field"><label>Banco</label><input className="input" value={f.banco || ''} onChange={set('banco')} /></div>
          <div className="field"><label>Alias</label><input className="input" value={f.alias || ''} onChange={set('alias')} /></div>
          <div className="field"><label>Titular</label><input className="input" value={f.titular || ''} onChange={set('titular')} /></div>
        </div>
        {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
        <button className="btn" disabled={busy || !f.cbu}>{busy ? 'Guardando…' : 'Agregar'}</button>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>CBU</th><th>Banco</th><th>Alias</th><th>Titular</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace' }}>{c.cbu}</td>
                <td>{c.banco || '—'}</td><td>{c.alias || '—'}</td><td>{c.titular || '—'}</td>
                <td><span className="badge" style={{ color: c.activo ? 'var(--green)' : 'var(--t3)' }}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggle(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>No tenés CBUs cargados.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
