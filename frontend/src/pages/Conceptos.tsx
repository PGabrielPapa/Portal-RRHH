import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Concepto { id: number; codigo: string; descripcion: string; tipo: string; formula?: string; base_legal?: string; activo: boolean; }

const TIPOS = [
  { v: 'remunerativo', l: 'Remunerativo' },
  { v: 'no_remunerativo', l: 'No remunerativo' },
  { v: 'descuento', l: 'Descuento' },
  { v: 'aporte', l: 'Aporte' },
  { v: 'contribucion', l: 'Contribución' },
];
const tipoLabel = (t: string) => TIPOS.find((x) => x.v === t)?.l || t;

export default function Conceptos() {
  const { user } = useAuth();
  const canEdit = user?.role === 'rrhh' || user?.role === 'admin';
  const [items, setItems] = useState<Concepto[]>([]);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Concepto | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    try {
      const p = new URLSearchParams();
      if (q) p.set('q', q); if (tipo) p.set('tipo', tipo);
      setItems(await api.get<Concepto[]>(`/conceptos?${p.toString()}`));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, tipo]);

  async function toggle(c: Concepto) { try { await api.patch(`/conceptos/${c.id}/activo`, { activo: !c.activo }); load(); } catch (e: any) { setErr(e.message); } }

  return (
    <>
      <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        {canEdit && <button className="btn" onClick={() => setShowNew(true)}>+ Nuevo concepto</button>}
      </div>
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar código o descripción…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>
      {err && <div className="err" style={{ marginBottom: 10 }}>⚠ {err}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Código</th><th>Descripción</th><th>Tipo</th><th>Base legal</th><th>Estado</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace' }}>{c.codigo}</td>
                <td>{c.descripcion}</td>
                <td><span className="badge">{tipoLabel(c.tipo)}</span></td>
                <td className="muted">{c.base_legal || '—'}</td>
                <td><span className="badge" style={{ color: c.activo ? 'var(--green)' : 'var(--t3)' }}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                {canEdit && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => setEdit(c)}>Editar</button>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggle(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button>
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={canEdit ? 6 : 5} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin conceptos.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{items.length} concepto(s)</p>

      {(showNew || edit) && <ConceptoModal concepto={edit} onClose={() => { setShowNew(false); setEdit(null); }} onSaved={() => { setShowNew(false); setEdit(null); load(); }} onError={setErr} />}
    </>
  );
}

function ConceptoModal({ concepto, onClose, onSaved, onError }: { concepto: Concepto | null; onClose: () => void; onSaved: () => void; onError: (t: string) => void; }) {
  const [f, setF] = useState<any>(concepto || { tipo: 'remunerativo' });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    try {
      if (concepto) await api.put(`/conceptos/${concepto.id}`, f);
      else await api.post('/conceptos', f);
      onSaved();
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{concepto ? 'Editar concepto' : 'Nuevo concepto'}</h3>
        <div className="grid2">
          <div className="field"><label>Código *</label><input className="input" value={f.codigo || ''} onChange={set('codigo')} disabled={!!concepto} /></div>
          <div className="field"><label>Tipo</label>
            <select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select>
          </div>
        </div>
        <div className="field" style={{ margin: '10px 0' }}><label>Descripción *</label><input className="input" value={f.descripcion || ''} onChange={set('descripcion')} /></div>
        <div className="field" style={{ marginBottom: 10 }}><label>Base legal</label><input className="input" value={f.base_legal || ''} onChange={set('base_legal')} /></div>
        <div className="field"><label>Fórmula (opcional)</label><input className="input" value={f.formula || ''} onChange={set('formula')} placeholder="Ej: basico * 0.01 * anios" /></div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={busy || !f.codigo || !f.descripcion}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
