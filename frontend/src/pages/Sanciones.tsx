import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import EmpleadoPicker from '../components/EmpleadoPicker';

interface S { id: number; tipo: string; falta?: string; fecha: string; dias: number; descripcion?: string; estado?: string; nom?: string; leg_num?: string; empresa?: string; created_by?: string; resuelto_por?: string; }
const TIPOS = ['Llamado de atención', 'Apercibimiento', 'Suspensión'];
const FALTAS = ['Ausencia injustificada', 'Llegadas tarde reiteradas', 'Incumplimiento de tareas', 'Falta de respeto', 'Incumplimiento de normas de seguridad/higiene', 'Abandono de puesto', 'Uso indebido de bienes de la empresa', 'Negligencia', 'Otra'];
const fmt = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '—';
const colorEstado = (e?: string) => e === 'aplicada' ? 'var(--green)' : e === 'rechazada' ? 'var(--red)' : 'var(--yellow)';

export default function Sanciones() {
  const { key } = useParams();
  const modoMias = key === 'mis-sanciones';
  const esRRHH = key === 'sanciones';
  const esGerente = key === 'sanciones-equipo';
  const puedeRegistrar = esRRHH || esGerente;
  const titulo = modoMias ? 'Mis sanciones' : esRRHH ? 'Sanciones — RR.HH.' : 'Sanciones del equipo';

  const [items, setItems] = useState<S[]>([]);
  const [q, setQ] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'Llamado de atención', falta: FALTAS[0] });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() {
    try {
      if (modoMias) { setItems(await api.get<S[]>('/sanciones/mias')); return; }
      const p = new URLSearchParams(); if (q) p.set('q', q); if (empresa) p.set('empresa', empresa);
      setItems(await api.get<S[]>(`/sanciones?${p}`));
    } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  useEffect(() => { if (esRRHH) api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, [esRRHH]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key, q, empresa]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); if (!emp) return;
    try {
      const r = await api.post<{ estado: string }>('/sanciones', { empleadoId: emp.id, tipo: f.tipo, falta: f.falta, fecha: f.fecha, dias: f.dias, descripcion: f.descripcion });
      setMsg({ t: r.estado === 'solicitada' ? 'Sanción solicitada (pendiente de aplicación por RR.HH.)' : 'Sanción aplicada', ok: true });
      setF({ tipo: 'Llamado de atención', falta: FALTAS[0] }); setEmp(null); load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function resolver(s: S, estado: string) { try { await api.patch(`/sanciones/${s.id}`, { estado }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{titulo}</h2>
      {puedeRegistrar && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={registrar}>
          <h3 style={{ marginTop: 0 }}>{esGerente ? 'Solicitar sanción' : 'Registrar sanción'}</h3>
          <div className="field" style={{ marginBottom: 10 }}><label>Empleado *</label><EmpleadoPicker onSelect={setEmp} /></div>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Tipo de sanción</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Falta cometida</label><select className="input" value={f.falta} onChange={set('falta')}>{FALTAS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Fecha del incumplimiento *</label><input className="input" type="date" value={f.fecha || ''} onChange={set('fecha')} /></div>
            {f.tipo === 'Suspensión' && <div className="field"><label>Días</label><input className="input" type="number" value={f.dias || ''} onChange={set('dias')} /></div>}
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Comentarios</label><textarea className="input" rows={2} value={f.descripcion || ''} onChange={set('descripcion')} /></div>
          {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
          <button className="btn" disabled={!emp || !f.fecha}>{esGerente ? 'Solicitar' : 'Registrar'}</button>
        </form>
      )}
      {!puedeRegistrar && msg && !msg.ok && <div className="err" style={{ marginBottom: 12 }}>⚠ {msg.t}</div>}

      {!modoMias && (
        <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
          {esRRHH && <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>{!modoMias && <th>Empleado</th>}{esRRHH && <th>Empresa</th>}<th>Tipo</th><th>Falta</th><th>Fecha</th><th>Días</th><th>Estado</th>{esRRHH && <th></th>}</tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                {!modoMias && <td>{s.nom} <span className="muted">({s.leg_num})</span></td>}{esRRHH && <td>{s.empresa}</td>}
                <td>{s.tipo}</td><td>{s.falta || '—'}</td><td>{fmt(s.fecha)}</td><td>{s.dias || '—'}</td>
                <td><span className="badge" style={{ color: colorEstado(s.estado) }}>{s.estado || 'aplicada'}</span></td>
                {esRRHH && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {s.estado === 'solicitada' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(s, 'aplicada')}>Aplicar</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(s, 'rechazada')}>Rechazar</button>
                  </> : <span className="muted" style={{ fontSize: 12 }}>{s.resuelto_por ? `por ${s.resuelto_por}` : ''}</span>}
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={modoMias ? 5 : (esRRHH ? 8 : 6)} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin sanciones.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
