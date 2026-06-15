import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Emp { id: number; nombre: string; slug?: string; cuit?: string; logo?: string; firma?: string; data: Record<string, string>; }
const DOM = [['dir', 'Calle'], ['nro', 'Número'], ['piso', 'Piso'], ['depto', 'Depto'], ['loc', 'Localidad'], ['prov', 'Provincia'], ['cp', 'C.P.']];

export default function AdminEmpresas() {
  const [items, setItems] = useState<Emp[]>([]);
  const [edit, setEdit] = useState<Emp | null>(null);
  const [creando, setCreando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() { try { setItems(await api.get<Emp[]>('/admin/empresas')); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  useEffect(() => { load(); }, []);

  async function eliminar(e: Emp) {
    if (!confirm(`¿Eliminar la empresa "${e.nombre}"? (solo si no tiene empleados)`)) return;
    try { await api.del(`/admin/empresas/${e.id}`); setMsg({ t: 'Empresa eliminada', ok: true }); load(); }
    catch (err: any) { setMsg({ t: err.message, ok: false }); }
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => setCreando(true)}>+ Nueva empresa</button>
      </div>
      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 12 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Logo</th><th>Empresa</th><th>CUIT</th><th>Domicilio</th><th>Firma</th><th></th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{e.logo ? <img src={e.logo} style={{ maxHeight: 34, maxWidth: 90 }} /> : <span className="muted">—</span>}</td>
                <td>{e.nombre}</td><td>{e.cuit || '—'}</td>
                <td className="muted">{[e.data?.dir, e.data?.nro, e.data?.loc].filter(Boolean).join(' ') || '—'}</td>
                <td>{e.firma ? '✓' : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => setEdit(e)}>Editar</button>
                  <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => eliminar(e)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin empresas.</td></tr>}
          </tbody>
        </table>
      </div>
      {(edit || creando) && <EmpModal emp={edit} onClose={() => { setEdit(null); setCreando(false); }} onSaved={(m) => { setEdit(null); setCreando(false); setMsg({ t: m, ok: true }); load(); }} onError={(t) => setMsg({ t, ok: false })} />}
    </>
  );
}

function EmpModal({ emp, onClose, onSaved, onError }: { emp: Emp | null; onClose: () => void; onSaved: (m: string) => void; onError: (t: string) => void; }) {
  const [nombre, setNombre] = useState(emp?.nombre || '');
  const [cuit, setCuit] = useState(emp?.cuit || '');
  const [data, setData] = useState<Record<string, string>>({ ...(emp?.data || {}) });
  const [logo, setLogo] = useState<string | undefined>(emp?.logo);
  const [firma, setFirma] = useState<string | undefined>(emp?.firma);
  const [busy, setBusy] = useState(false);
  const esNueva = !emp;

  function leerImg(e: React.ChangeEvent<HTMLInputElement>, set: (s: string) => void) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 500 * 1024) { onError('La imagen no debe superar 500 KB'); return; }
    const r = new FileReader(); r.onload = () => set(String(r.result)); r.readAsDataURL(file);
  }
  async function save() {
    if (esNueva && !nombre.trim()) { onError('El nombre es obligatorio'); return; }
    setBusy(true);
    try {
      const body = { nombre, cuit, data, logo, firma };
      if (esNueva) await api.post('/admin/empresas', body);
      else await api.patch(`/admin/empresas/${emp!.id}`, { cuit, data, logo, firma });
      onSaved(esNueva ? 'Empresa creada' : 'Empresa actualizada');
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{esNueva ? 'Nueva empresa' : emp!.nombre}</h3>
        <div className="field" style={{ marginBottom: 10 }}><label>Nombre / Razón social {esNueva ? '*' : ''}</label><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!esNueva} /></div>
        <div className="field" style={{ marginBottom: 10 }}><label>CUIT</label><input className="input" value={cuit} onChange={(e) => setCuit(e.target.value)} /></div>
        <div className="grid2">
          {DOM.map(([k, l]) => <div className="field" key={k}><label>{l}</label><input className="input" value={data[k] || ''} onChange={(e) => setData({ ...data, [k]: e.target.value })} /></div>)}
        </div>
        <div className="field" style={{ margin: '12px 0' }}>
          <label>Logo</label>
          <div className="row" style={{ gap: 12 }}>
            {logo ? <img src={logo} style={{ maxHeight: 46, maxWidth: 140, background: '#fff', padding: 4, borderRadius: 6 }} /> : <span className="muted">Sin logo</span>}
            <input type="file" accept="image/*" onChange={(e) => leerImg(e, setLogo)} />
            {logo && <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setLogo(undefined)}>Quitar</button>}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Firma (RR.HH., para documentos)</label>
          <div className="row" style={{ gap: 12 }}>
            {firma ? <img src={firma} style={{ maxHeight: 46, maxWidth: 140, background: '#fff', padding: 4, borderRadius: 6 }} /> : <span className="muted">Sin firma</span>}
            <input type="file" accept="image/*" onChange={(e) => leerImg(e, setFirma)} />
            {firma && <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setFirma(undefined)}>Quitar</button>}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : (esNueva ? 'Crear' : 'Guardar')}</button>
        </div>
      </div>
    </div>
  );
}
