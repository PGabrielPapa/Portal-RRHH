import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import EmpleadoPicker from '../components/EmpleadoPicker';

interface S { id: number; tipo: string; falta?: string; fecha: string; dias: number; descripcion?: string; estado?: string; fecha_notificacion?: string; fecha_cumplimiento?: string; nom?: string; leg_num?: string; empresa?: string; created_by?: string; resuelto_por?: string; }
const TIPOS = ['Llamado de atención', 'Apercibimiento', 'Severo apercibimiento', 'Suspensión', 'Desvinculación'];
const FALTAS = ['Llegadas tarde reiteradas', 'Ausencias injustificadas', 'Falta de respeto al superior o compañeros', 'Falta de cuidado de elementos de trabajo', 'Incumplimiento de órdenes e instrucciones', 'Incumplimiento de normas internas / convenio', 'Uso indebido de recursos de la empresa', 'Adulteración de documentación / fraude', 'Inconducta laboral / agresión', 'Incumplimiento de normas de seguridad', 'Bajo rendimiento o productividad', 'Otro motivo'];
const fmt = (s?: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '—';
const colorEstado = (e?: string) => e === 'aplicada' ? 'var(--green)' : e === 'rechazada' ? 'var(--red)' : 'var(--yellow)';
const hoy = () => new Date().toISOString().slice(0, 10);

function imprimirSancion(s: S) {
  const w = window.open('', '_blank', 'width=820,height=920'); if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Sanción ${s.leg_num || ''}</title>
  <style>body{font-family:Arial,sans-serif;color:#000;padding:40px;max-width:720px;margin:0 auto;font-size:13px;line-height:1.6}
  h1{font-size:18px;text-align:center;margin-bottom:4px}.sub{text-align:center;color:#555;margin-bottom:24px}
  .row{margin:6px 0}.lbl{font-weight:bold}hr{border:none;border-top:1px solid #ccc;margin:18px 0}
  .firmas{display:flex;justify-content:space-between;margin-top:60px}.firma{width:45%;border-top:1px solid #000;text-align:center;padding-top:6px;font-size:12px}</style></head><body>
  <h1>NOTIFICACIÓN DE SANCIÓN DISCIPLINARIA</h1>
  <div class="sub">${s.empresa || ''}</div>
  <div class="row"><span class="lbl">Empleado:</span> ${s.nom || ''} (Legajo ${s.leg_num || ''})</div>
  <div class="row"><span class="lbl">Tipo de sanción:</span> ${s.tipo}</div>
  <div class="row"><span class="lbl">Falta cometida:</span> ${s.falta || '—'}</div>
  <div class="row"><span class="lbl">Fecha del incumplimiento:</span> ${fmt(s.fecha)}</div>
  ${s.dias ? `<div class="row"><span class="lbl">Días de suspensión:</span> ${s.dias}</div>` : ''}
  <div class="row"><span class="lbl">Fecha de notificación:</span> ${fmt(s.fecha_notificacion) !== '—' ? fmt(s.fecha_notificacion) : '____/____/______'}</div>
  <hr><div class="row"><span class="lbl">Detalle / descripción de los hechos:</span></div>
  <div class="row">${s.descripcion || '—'}</div>
  <hr><div class="row" style="font-size:12px;color:#444">Por la presente se notifica al trabajador la sanción detallada, conforme al art. 67 LCT. La firma del presente implica su recepción, no necesariamente su conformidad.</div>
  <div class="firmas"><div class="firma">Firma del empleador</div><div class="firma">Firma del trabajador</div></div>
  <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

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
  const [f, setF] = useState<Record<string, string>>({ tipo: TIPOS[0], falta: FALTAS[0], fechaNotificacion: hoy() });
  const [notif, setNotif] = useState<Record<number, string>>({});
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
      const r = await api.post<{ estado: string }>('/sanciones', { empleadoId: emp.id, tipo: f.tipo, falta: f.falta, fecha: f.fecha, dias: f.dias, descripcion: f.descripcion, fechaNotificacion: f.fechaNotificacion, fechaCumplimiento: f.fechaCumplimiento });
      setMsg({ t: r.estado === 'solicitada' ? 'Sanción solicitada (pendiente RR.HH.)' : 'Sanción aplicada', ok: true });
      setF({ tipo: TIPOS[0], falta: FALTAS[0], fechaNotificacion: hoy() }); setEmp(null); load();
    } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function resolver(s: S, estado: string) { try { await api.patch(`/sanciones/${s.id}`, { estado }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  async function comunicar(s: S) {
    try { await api.post(`/sanciones/${s.id}/notificar`, { fecha: notif[s.id] || hoy() }); setMsg({ t: `Sanción comunicada electrónicamente a ${s.nom}`, ok: true }); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      {puedeRegistrar && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={registrar}>
          <h3 style={{ marginTop: 0 }}>{esGerente ? 'Solicitar sanción' : 'Registrar sanción'}</h3>
          <div className="field" style={{ marginBottom: 10 }}><label>Empleado *</label><EmpleadoPicker onSelect={setEmp} /></div>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Tipo de sanción</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Falta cometida</label><select className="input" value={f.falta} onChange={set('falta')}>{FALTAS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Fecha del incumplimiento *</label><input className="input" type="date" value={f.fecha || ''} onChange={set('fecha')} /></div>
            {f.tipo === 'Suspensión' && <div className="field"><label>Días de suspensión</label><input className="input" type="number" value={f.dias || ''} onChange={set('dias')} /></div>}
            {esRRHH && <div className="field"><label>Fecha de notificación *</label><input className="input" type="date" max={hoy()} value={f.fechaNotificacion || ''} onChange={set('fechaNotificacion')} /></div>}
            {esRRHH && <div className="field"><label>Fecha de cumplimiento{f.tipo === 'Suspensión' ? ' (suspensión)' : ''}</label><input className="input" type="date" value={f.fechaCumplimiento || ''} onChange={set('fechaCumplimiento')} /></div>}
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Comentarios</label><textarea className="input" rows={2} value={f.descripcion || ''} onChange={set('descripcion')} /></div>
          {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
          <button className="btn" disabled={!emp || !f.fecha || (esRRHH && !f.fechaNotificacion)}>{esGerente ? 'Solicitar' : 'Registrar'}</button>
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
          <thead><tr>{!modoMias && <th>Empleado</th>}{esRRHH && <th>Empresa</th>}<th>Tipo</th><th>Falta</th><th>Hecho</th><th>Estado</th>{esRRHH && <th>Notificación</th>}{esRRHH && <th>Cumplimiento</th>}{esRRHH && <th></th>}</tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                {!modoMias && <td>{s.nom} <span className="muted">({s.leg_num})</span></td>}{esRRHH && <td>{s.empresa}</td>}
                <td>{s.tipo}</td><td>{s.falta || '—'}</td><td>{fmt(s.fecha)}</td>
                <td><span className="badge" style={{ color: colorEstado(s.estado) }}>{s.estado || 'aplicada'}</span></td>
                {esRRHH && <td>
                  {s.fecha_notificacion ? <span className="muted">{fmt(s.fecha_notificacion)}</span>
                    : (s.estado !== 'solicitada' && s.estado !== 'rechazada') ? (
                      <input className="input" type="date" style={{ padding: '3px 6px', fontSize: 12, width: 130 }} value={notif[s.id] || hoy()} onChange={(e) => setNotif({ ...notif, [s.id]: e.target.value })} />
                    ) : <span className="muted">—</span>}
                </td>}
                {esRRHH && <td className="muted">{fmt(s.fecha_cumplimiento)}</td>}
                {esRRHH && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {s.estado === 'solicitada' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(s, 'aplicada')}>Aplicar</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(s, 'rechazada')}>Rechazar</button>
                  </> : s.estado !== 'rechazada' ? <>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => imprimirSancion(s)}>🖨 Imprimir</button>
                    {!s.fecha_notificacion && <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => comunicar(s)}>📧 Comunicar</button>}
                  </> : null}
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td className="muted" style={{ textAlign: 'center', padding: 20 }} colSpan={modoMias ? 5 : (esRRHH ? 10 : 6)}>Sin sanciones.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
