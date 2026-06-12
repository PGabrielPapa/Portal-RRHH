import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import EmpleadoPicker from '../components/EmpleadoPicker';

interface E { id: number; tipo: string; descripcion?: string; identificador?: string; estado: string; fecha_entrega?: string; fecha_devolucion?: string; nom?: string; leg_num?: string; empresa?: string; }
const TIPOS = [['celular', '📱 Celular / Smartphone'], ['notebook', '💻 Notebook / Laptop'], ['tablet', '📟 Tablet'], ['auto', '🚗 Vehículo / Auto'], ['herramienta', '🔧 Herramienta'], ['ropa', '👕 Ropa / EPP'], ['llave', '🔑 Llave / Tarjeta de acceso'], ['otro', '📦 Otro elemento']];
const ESTADOS: Record<string, { l: string; c: string }> = { entregado: { l: 'En uso', c: 'var(--green)' }, devuelto: { l: 'Devuelto', c: 'var(--t3)' }, perdido: { l: 'Extraviado', c: 'var(--red)' }, roto: { l: 'Dado de baja', c: 'var(--yellow)' } };
const tipoLabel = (t: string) => TIPOS.find((x) => x[0] === t)?.[1] || t;
const fmt = (s?: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '—';
const hoy = () => new Date().toISOString().slice(0, 10);

export default function Elementos() {
  const [items, setItems] = useState<E[]>([]);
  const [q, setQ] = useState(''); const [empresa, setEmpresa] = useState(''); const [empresas, setEmpresas] = useState<string[]>([]);
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'celular', fechaEntrega: hoy() });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() { try { const p = new URLSearchParams(); if (q) p.set('q', q); if (empresa) p.set('empresa', empresa); setItems(await api.get<E[]>(`/elementos?${p}`)); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, empresa]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); if (!emp) return;
    try { await api.post('/elementos', { empleadoId: emp.id, tipo: f.tipo, descripcion: f.descripcion, identificador: f.identificador, fechaEntrega: f.fechaEntrega, observaciones: f.observaciones }); setMsg({ t: 'Elemento registrado', ok: true }); setF({ tipo: 'celular', fechaEntrega: hoy() }); setEmp(null); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function cambiarEstado(it: E, estado: string) { try { await api.patch(`/elementos/${it.id}`, { estado, fechaDevolucion: estado !== 'entregado' ? hoy() : null }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Elementos de trabajo</h2>
      <form className="card" style={{ marginBottom: 18 }} onSubmit={registrar}>
        <h3 style={{ marginTop: 0 }}>Registrar entrega</h3>
        <div className="field" style={{ marginBottom: 10 }}><label>Empleado *</label><EmpleadoPicker onSelect={setEmp} /></div>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>Tipo</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Identificador (serie / IMEI / patente)</label><input className="input" value={f.identificador || ''} onChange={set('identificador')} /></div>
          <div className="field"><label>Descripción</label><input className="input" value={f.descripcion || ''} onChange={set('descripcion')} /></div>
          <div className="field"><label>Fecha de entrega</label><input className="input" type="date" value={f.fechaEntrega || ''} onChange={set('fechaEntrega')} /></div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}><label>Observaciones</label><input className="input" value={f.observaciones || ''} onChange={set('observaciones')} /></div>
        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
        <button className="btn" disabled={!emp}>Registrar</button>
      </form>
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas las empresas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Tipo</th><th>Identificador</th><th>Entrega</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.nom} <span className="muted">({it.leg_num})</span></td><td>{tipoLabel(it.tipo)}</td><td>{it.identificador || '—'}</td><td>{fmt(it.fecha_entrega)}</td>
                <td><span className="badge" style={{ color: ESTADOS[it.estado]?.c }}>{ESTADOS[it.estado]?.l || it.estado}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{it.estado === 'entregado' && <>
                  <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11, marginRight: 4 }} onClick={() => cambiarEstado(it, 'devuelto')}>Devuelto</button>
                  <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11, marginRight: 4 }} onClick={() => cambiarEstado(it, 'perdido')}>Extraviado</button>
                  <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => cambiarEstado(it, 'roto')}>Baja</button>
                </>}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin elementos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
