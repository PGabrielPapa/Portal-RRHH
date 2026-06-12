import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Fam { id: number; tipo: string; nombre: string; dni?: string; cuil?: string; fecha_nac?: string; fecha_vinculo?: string; discapacidad: boolean; vigencia_hasta?: string; motivo_cierre?: string; }
const TIPOS = [['padre', 'Padre'], ['madre', 'Madre'], ['conyuge', 'Cónyuge'], ['concubino', 'Concubino/a'], ['hijo', 'Hijo'], ['hija', 'Hija'], ['hijastro', 'Hijastro'], ['hijastra', 'Hijastra']];
const CON_FECHA = ['conyuge', 'concubino'];
const tipoLabel = (t: string) => TIPOS.find((x) => x[0] === t)?.[1] || t;
const fmt = (s?: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '—';

export default function MisFamiliares() {
  const [items, setItems] = useState<Fam[]>([]);
  const [f, setF] = useState<Record<string, any>>({ tipo: 'conyuge' });
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() { try { setItems(await api.get<Fam[]>('/familiares/mias')); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  useEffect(() => { load(); }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) await api.put(`/familiares/${editId}`, f); else await api.post('/familiares', f);
      setMsg({ t: editId ? 'Familiar actualizado' : 'Familiar agregado', ok: true }); setF({ tipo: 'conyuge' }); setEditId(null); load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  function editar(x: Fam) { setEditId(x.id); setF({ tipo: x.tipo, nombre: x.nombre, dni: x.dni || '', cuil: x.cuil || '', fecha_nac: x.fecha_nac || '', fecha_vinculo: x.fecha_vinculo || '', discapacidad: x.discapacidad }); }
  async function cerrar(x: Fam) {
    const motivo = prompt('Motivo del cierre (divorcio / fallecimiento / mayoría de edad / otro):') || '';
    const fecha = prompt('Fecha de cierre (AAAA-MM-DD):', new Date().toISOString().slice(0, 10)) || '';
    try { await api.patch(`/familiares/${x.id}/cerrar`, { fecha, motivo }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function eliminar(x: Fam) { if (!confirm(`¿Eliminar a ${x.nombre}?`)) return; try { await api.del(`/familiares/${x.id}`); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mis familiares</h2>
      <p className="muted" style={{ marginTop: -8 }}>Grupo familiar declarado (obra social, asignaciones familiares, trámites). Los vínculos llevan vigencia para conservar el histórico.</p>

      <form className="card" style={{ marginBottom: 18 }} onSubmit={guardar}>
        <h3 style={{ marginTop: 0 }}>{editId ? 'Editar familiar' : 'Agregar familiar'}</h3>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>Vínculo *</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Nombre completo *</label><input className="input" value={f.nombre || ''} onChange={set('nombre')} /></div>
          <div className="field"><label>DNI</label><input className="input" value={f.dni || ''} onChange={set('dni')} /></div>
          <div className="field"><label>CUIL</label><input className="input" value={f.cuil || ''} onChange={set('cuil')} placeholder="XX-XXXXXXXX-X" /></div>
          <div className="field"><label>Fecha de nacimiento</label><input className="input" type="date" value={f.fecha_nac || ''} onChange={set('fecha_nac')} /></div>
          {CON_FECHA.includes(f.tipo) && <div className="field"><label>{f.tipo === 'conyuge' ? 'Fecha de matrimonio' : 'Fecha de unión convivencial'}</label><input className="input" type="date" value={f.fecha_vinculo || ''} onChange={set('fecha_vinculo')} /></div>}
        </div>
        <label className="row muted" style={{ gap: 6, marginBottom: 12 }}><input type="checkbox" checked={!!f.discapacidad} onChange={set('discapacidad')} /> Con discapacidad</label>
        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
        <div className="row"><button className="btn">{editId ? 'Guardar' : 'Agregar'}</button>{editId && <button type="button" className="btn ghost" onClick={() => { setEditId(null); setF({ tipo: 'conyuge' }); }}>Cancelar</button>}</div>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Vínculo</th><th>Nombre</th><th>DNI</th><th>Nacimiento</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} style={{ opacity: x.vigencia_hasta ? 0.55 : 1 }}>
                <td>{tipoLabel(x.tipo)}{x.discapacidad && <span className="badge" style={{ marginLeft: 4 }}>discap.</span>}</td>
                <td>{x.nombre}</td><td>{x.dni || '—'}</td><td>{fmt(x.fecha_nac)}</td>
                <td>{x.vigencia_hasta ? <span className="muted">Cerrado {fmt(x.vigencia_hasta)}{x.motivo_cierre ? ` (${x.motivo_cierre})` : ''}</span> : <span className="badge" style={{ color: 'var(--green)' }}>Vigente</span>}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {!x.vigencia_hasta && <>
                    <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11, marginRight: 4 }} onClick={() => editar(x)}>Editar</button>
                    <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11, marginRight: 4 }} onClick={() => cerrar(x)}>Cerrar vínculo</button>
                  </>}
                  <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => eliminar(x)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>No cargaste familiares.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
