import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import EmpleadoPicker from '../components/EmpleadoPicker';

interface B { id: number; tipo: string; modalidad?: string; monto: number; proveedor?: string; vigencia_desde?: string; vigencia_hasta?: string; detalle?: string; activo: boolean; nom?: string; leg_num?: string; empresa?: string; }
const TIPOS = [['combustible', 'Combustible'], ['gastos_vehiculo', 'Gastos de vehículo'], ['prepaga', 'Medicina prepaga'], ['adicional_recibo', 'Adicional fuera de recibo'], ['tarjeta_corp', 'Tarjeta corporativa'], ['estacionamiento', 'Estacionamiento'], ['vivienda', 'Vivienda / alojamiento'], ['educacion', 'Educación / capacitación'], ['seguro_vida', 'Seguro de vida adicional'], ['club_gimnasio', 'Club / Gimnasio'], ['otro', 'Otro beneficio']];
const tipoLabel = (t: string) => TIPOS.find((x) => x[0] === t)?.[1] || t;
const money = (n: number) => n ? Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '—';
const fmt = (s?: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '';

export default function Beneficios() {
  const [items, setItems] = useState<B[]>([]);
  const [q, setQ] = useState(''); const [empresa, setEmpresa] = useState(''); const [empresas, setEmpresas] = useState<string[]>([]);
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'prepaga', modalidad: 'fijo' });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() { try { const p = new URLSearchParams(); if (q) p.set('q', q); if (empresa) p.set('empresa', empresa); setItems(await api.get<B[]>(`/beneficios?${p}`)); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, empresa]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); if (!emp) return;
    try { await api.post('/beneficios', { empleadoId: emp.id, tipo: f.tipo, modalidad: f.modalidad, monto: f.monto, proveedor: f.proveedor, vigenciaDesde: f.vigenciaDesde, vigenciaHasta: f.vigenciaHasta, detalle: f.detalle }); setMsg({ t: 'Beneficio asignado', ok: true }); setF({ tipo: 'prepaga', modalidad: 'fijo' }); setEmp(null); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function baja(b: B) { try { await api.patch(`/beneficios/${b.id}/activo`, { activo: !b.activo }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Beneficios</h2>
      <form className="card" style={{ marginBottom: 18 }} onSubmit={registrar}>
        <h3 style={{ marginTop: 0 }}>Asignar beneficio</h3>
        <div className="field" style={{ marginBottom: 10 }}><label>Empleado *</label><EmpleadoPicker onSelect={setEmp} /></div>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>Tipo</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Modalidad</label><select className="input" value={f.modalidad} onChange={set('modalidad')}><option value="fijo">Monto fijo</option><option value="reintegro">Reintegro</option></select></div>
          <div className="field"><label>Monto ($)</label><input className="input" type="number" value={f.monto || ''} onChange={set('monto')} /></div>
          <div className="field"><label>Proveedor</label><input className="input" value={f.proveedor || ''} onChange={set('proveedor')} placeholder="Ej: OSDE, YPF…" /></div>
          <div className="field"><label>Vigencia desde</label><input className="input" type="date" value={f.vigenciaDesde || ''} onChange={set('vigenciaDesde')} /></div>
          <div className="field"><label>Vigencia hasta</label><input className="input" type="date" value={f.vigenciaHasta || ''} onChange={set('vigenciaHasta')} /></div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}><label>Detalle</label><input className="input" value={f.detalle || ''} onChange={set('detalle')} placeholder="Plan, N° afiliado, condiciones…" /></div>
        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
        <button className="btn" disabled={!emp}>Asignar</button>
      </form>
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas las empresas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Beneficio</th><th>Modalidad</th><th>Monto</th><th>Proveedor</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>{b.nom} <span className="muted">({b.leg_num})</span></td><td>{tipoLabel(b.tipo)}</td><td>{b.modalidad || '—'}</td><td>{money(b.monto)}</td><td>{b.proveedor || '—'}</td>
                <td className="muted">{fmt(b.vigencia_desde)}{b.vigencia_hasta ? ` → ${fmt(b.vigencia_hasta)}` : ''}</td>
                <td><span className="badge" style={{ color: b.activo ? 'var(--green)' : 'var(--t3)' }}>{b.activo ? 'Activo' : 'Baja'}</span></td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => baja(b)}>{b.activo ? 'Dar de baja' : 'Reactivar'}</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin beneficios.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
