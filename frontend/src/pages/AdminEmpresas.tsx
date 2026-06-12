import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Emp { id: number; nombre: string; slug: string; cuit?: string; logo?: string; data: Record<string, string>; }
const DOM = [['dir', 'Calle'], ['nro', 'Número'], ['piso', 'Piso'], ['depto', 'Depto'], ['loc', 'Localidad'], ['prov', 'Provincia'], ['cp', 'C.P.']];

export default function AdminEmpresas() {
  const [items, setItems] = useState<Emp[]>([]);
  const [edit, setEdit] = useState<Emp | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() { try { setItems(await api.get<Emp[]>('/admin/empresas')); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  useEffect(() => { load(); }, []);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Empresas</h2>
      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 12 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Logo</th><th>Empresa</th><th>CUIT</th><th>Domicilio</th><th></th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{e.logo ? <img src={e.logo} style={{ maxHeight: 34, maxWidth: 90 }} /> : <span className="muted">—</span>}</td>
                <td>{e.nombre}</td><td>{e.cuit || '—'}</td>
                <td className="muted">{[e.data?.dir, e.data?.nro, e.data?.loc].filter(Boolean).join(' ') || '—'}</td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEdit(e)}>Editar</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin empresas.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <EditModal emp={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setMsg({ t: 'Empresa actualizada', ok: true }); load(); }} onError={(t) => setMsg({ t, ok: false })} />}
    </>
  );
}

function EditModal({ emp, onClose, onSaved, onError }: { emp: Emp; onClose: () => void; onSaved: () => void; onError: (t: string) => void; }) {
  const [cuit, setCuit] = useState(emp.cuit || '');
  const [data, setData] = useState<Record<string, string>>({ ...(emp.data || {}) });
  const [logo, setLogo] = useState<string | undefined>(emp.logo);
  const [busy, setBusy] = useState(false);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 500 * 1024) { onError('El logo no debe superar 500 KB'); return; }
    const r = new FileReader(); r.onload = () => setLogo(String(r.result)); r.readAsDataURL(file);
  }
  async function save() {
    setBusy(true);
    try { await api.patch(`/admin/empresas/${emp.id}`, { cuit, data, logo }); onSaved(); }
    catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{emp.nombre}</h3>
        <div className="field" style={{ marginBottom: 10 }}><label>CUIT</label><input className="input" value={cuit} onChange={(e) => setCuit(e.target.value)} /></div>
        <div className="grid2">
          {DOM.map(([k, l]) => <div className="field" key={k}><label>{l}</label><input className="input" value={data[k] || ''} onChange={(e) => setData({ ...data, [k]: e.target.value })} /></div>)}
        </div>
        <div className="field" style={{ margin: '12px 0' }}>
          <label>Logo</label>
          <div className="row" style={{ gap: 12 }}>
            {logo ? <img src={logo} style={{ maxHeight: 50, maxWidth: 140, background: '#fff', padding: 4, borderRadius: 6 }} /> : <span className="muted">Sin logo</span>}
            <input type="file" accept="image/*" onChange={onLogo} />
            {logo && <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setLogo(undefined)}>Quitar</button>}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
