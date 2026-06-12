import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, fetchBlob } from '../lib/api';
import type { Empleado } from '../lib/types';

interface Lic { id: number; tipo: string; desde: string; hasta: string; dias: number; motivo?: string; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; resuelto_por?: string; justificacion?: boolean; tiene_comprobante?: boolean; }

const TIPOS = ['Vacaciones', 'Enfermedad', 'Examen', 'Matrimonio', 'Matrimonio de hijo', 'Fallecimiento familiar', 'Nacimiento', 'Mudanza', 'Donación de sangre', 'Otra'];
// Enfermedad, fallecimiento y nacimiento son imprevisibles: no se solicitan con anticipación (RR.HH. las registra).
const TIPOS_SOLICITABLES = TIPOS.filter((t) => !['Enfermedad', 'Fallecimiento familiar', 'Nacimiento'].includes(t));
const colorEstado = (e: string) => e === 'aprobada' ? 'var(--green)' : e === 'rechazada' ? 'var(--red)' : 'var(--yellow)';
const fmt = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR') : '—';

export default function Licencias() {
  const { key } = useParams();
  const modoMias = key === 'mis-licencias';
  const esRRHH = key === 'licencias-rrhh';
  const titulo = modoMias ? 'Mis licencias' : esRRHH ? 'Licencias — gestión RR.HH.' : 'Licencias del equipo';

  const [items, setItems] = useState<Lic[]>([]);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'Vacaciones' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [estado, setEstado] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [q, setQ] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [vac, setVac] = useState<any>(null);
  // registrar (RR.HH.)
  const [regQ, setRegQ] = useState('');
  const [regMatches, setRegMatches] = useState<Empleado[]>([]);
  const [regEmp, setRegEmp] = useState<Empleado | null>(null);
  const [reg, setReg] = useState<Record<string, string>>({ tipo: 'Vacaciones' });
  const [regMsg, setRegMsg] = useState('');

  async function load() {
    try {
      if (modoMias) { setItems(await api.get<Lic[]>('/licencias/mias')); return; }
      const p = new URLSearchParams();
      if (estado) p.set('estado', estado);
      if (empresa) p.set('empresa', empresa);
      if (q) p.set('q', q);
      setItems(await api.get<Lic[]>(`/licencias?${p.toString()}`));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { if (modoMias) api.get('/licencias/vacaciones-info').then(setVac).catch(() => {}); }, [modoMias]);
  useEffect(() => { if (!modoMias) api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, [modoMias]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key, estado, empresa, q]);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/licencias', { tipo: f.tipo, desde: f.desde, hasta: f.hasta, motivo: f.motivo }); setF({ tipo: 'Vacaciones' }); load(); api.get('/licencias/vacaciones-info').then(setVac).catch(() => {}); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function resolver(l: Lic, est: string) { try { await api.patch(`/licencias/${l.id}`, { estado: est }); load(); } catch (e: any) { setErr(e.message); } }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const diasSol = (f.desde && f.hasta && f.hasta >= f.desde) ? Math.round((new Date(f.hasta + 'T12:00:00').getTime() - new Date(f.desde + 'T12:00:00').getTime()) / 86400000) + 1 : 0;
  const esVac = String(f.tipo || '').toLowerCase() === 'vacaciones';
  async function verComprobante(id: number) {
    try { const b = await fetchBlob(`/licencias/${id}/comprobante`); const u = URL.createObjectURL(b); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    catch (e: any) { setErr(e.message); }
  }
  const excedeSaldo = modoMias && esVac && vac && diasSol > vac.disponible;
  const setR = (k: string) => (e: any) => setReg({ ...reg, [k]: e.target.value });

  async function buscarEmp(v: string) {
    setRegQ(v); setRegEmp(null);
    if (v.trim().length < 2) { setRegMatches([]); return; }
    try { setRegMatches((await api.get<Empleado[]>(`/empleados?q=${encodeURIComponent(v)}`)).slice(0, 8)); } catch { /* noop */ }
  }
  async function registrar(e: React.FormEvent) {
    e.preventDefault(); setRegMsg(''); setErr('');
    if (!regEmp) return;
    try {
      await api.post('/licencias/registrar', { empleadoId: regEmp.id, tipo: reg.tipo, desde: reg.desde, hasta: reg.hasta, motivo: reg.motivo });
      setRegMsg(`Licencia registrada para ${regEmp.nom}`); setReg({ tipo: 'Vacaciones' }); setRegEmp(null); setRegQ(''); load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{titulo}</h2>

      {modoMias && vac && (
        <div className="card" style={{ marginBottom: 14, borderLeft: '3px solid var(--accent)' }}>
          <strong>🏖 Te corresponden {vac.corresponden} días corridos de licencia anual</strong>
          <div className="muted" style={{ marginTop: 4 }}>
            Según tu antigüedad de {vac.antiguedad} año(s) al 31/12/{vac.anio} (Art. 150, Ley 20.744).
            {' '}Tomados este año: <strong>{vac.tomadosEsteAnio}</strong> · Saldo {vac.anio}: <strong style={{ color: vac.saldoEsteAnio < 0 ? 'var(--red)' : 'var(--green)' }}>{vac.saldoEsteAnio}</strong>
            {vac.saldoAnteriores > 0 ? <> · Saldo años anteriores: <strong>{vac.saldoAnteriores}</strong></> : null}
            {' '}· <strong>Disponible para solicitar: {vac.disponible} día(s)</strong>
          </div>
        </div>
      )}
      {modoMias && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={solicitar}>
          <h3 style={{ marginTop: 0 }}>Solicitar licencia</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Tipo</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS_SOLICITABLES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"></div>
            <div className="field"><label>Desde *</label><input className="input" type="date" value={f.desde || ''} onChange={set('desde')} /></div>
            <div className="field"><label>Hasta *</label><input className="input" type="date" value={f.hasta || ''} onChange={set('hasta')} /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Motivo</label><textarea className="input" rows={2} value={f.motivo || ''} onChange={set('motivo')} /></div>
          {diasSol > 0 && <div className="muted" style={{ marginBottom: 8 }}>Días solicitados: <strong>{diasSol}</strong>{esVac && vac ? ` · disponible: ${vac.disponible}` : ''}</div>}
          {excedeSaldo && <div className="err" style={{ marginBottom: 8 }}>⚠ Excede tu saldo de vacaciones ({vac.disponible} día(s) disponibles).</div>}
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          <button className="btn" disabled={busy || !f.desde || !f.hasta || excedeSaldo}>{busy ? 'Enviando…' : 'Solicitar'}</button>
        </form>
      )}

      {esRRHH && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={registrar}>
          <h3 style={{ marginTop: 0 }}>Registrar licencia (para un empleado)</h3>
          <div className="field" style={{ position: 'relative', marginBottom: 10 }}>
            <label>Empleado *</label>
            <input className="input" placeholder="Buscar nombre/legajo…" value={regQ} onChange={(e) => buscarEmp(e.target.value)} />
            {regMatches.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflow: 'auto' }}>
                {regMatches.map((e) => (
                  <div key={e.id} onClick={() => { setRegEmp(e); setRegQ(`${e.nom} (${e.legNum})`); setRegMatches([]); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                    {e.nom} <span className="muted">· {e.legNum} · {e.empresa}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Tipo</label><select className="input" value={reg.tipo} onChange={setR('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"></div>
            <div className="field"><label>Desde *</label><input className="input" type="date" value={reg.desde || ''} onChange={setR('desde')} /></div>
            <div className="field"><label>Hasta *</label><input className="input" type="date" value={reg.hasta || ''} onChange={setR('hasta')} /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Motivo</label><input className="input" value={reg.motivo || ''} onChange={setR('motivo')} /></div>
          {regMsg && <div className="ok" style={{ marginBottom: 8 }}>✓ {regMsg}</div>}
          <button className="btn" disabled={!regEmp || !reg.desde || !reg.hasta}>Registrar (queda aprobada)</button>
        </form>
      )}

      {!modoMias && (
        <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
          {esRRHH && (
            <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
              <option value="">Todas las empresas</option>
              {empresas.map((em) => <option key={em} value={em}>{em}</option>)}
            </select>
          )}
          <select className="input" style={{ maxWidth: 180 }} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
        </div>
      )}
      {!modoMias && err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>
            {!modoMias && <th>Empleado</th>}
            {esRRHH && <th>Empresa</th>}
            <th>Tipo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Estado</th><th>Comprobante</th>{!modoMias && <th></th>}
          </tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                {!modoMias && <td>{l.nom} <span className="muted">({l.leg_num})</span></td>}
                {esRRHH && <td>{l.empresa}</td>}
                <td>{l.tipo}</td><td>{fmt(l.desde)}</td><td>{fmt(l.hasta)}</td><td>{l.dias}</td>
                <td><span className="badge" style={{ color: colorEstado(l.estado) }}>{l.estado}</span></td>
                <td>{l.tiene_comprobante ? <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => verComprobante(l.id)}>📄 Ver</button> : <span className="muted">—</span>}</td>
                {!modoMias && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {l.estado === 'pendiente' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(l, 'aprobada')}>Aprobar</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(l, 'rechazada')}>Rechazar</button>
                  </> : <span className="muted" style={{ fontSize: 12 }}>{l.resuelto_por ? `por ${l.resuelto_por}` : ''}</span>}
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={modoMias ? 6 : (esRRHH ? 9 : 8)} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin licencias.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
