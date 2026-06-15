import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import MiBanner from '../components/MiBanner';

interface Anticipo { id: number; monto: number; motivo?: string; cuotas: number; cuota_desde?: string; cuotas_pagadas?: number; total_pagado?: number; bruto?: number; ultimo_neto?: number; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; resuelto_por?: string; }
interface Cuota { nro: number; anio: number; mes: number; monto: number; }

const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const colorEstado = (e: string) => e === 'aprobado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function Adelantos() {
  const { key } = useParams();
  const modoMios = key === 'anticipos';   // personal vs aprobaciones
  const puedeAprobar = !modoMios;
  const [items, setItems] = useState<Anticipo[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [ultimoNeto, setUltimoNeto] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const proxMes = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const [aprob, setAprob] = useState<Record<number, { cuotas: string; cuotaDesde: string }>>({});
  const [verCuotas, setVerCuotas] = useState<number | null>(null);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  async function abrirCuotas(id: number) { if (verCuotas === id) { setVerCuotas(null); return; } try { setCuotas(await api.get<Cuota[]>(`/anticipos/${id}/cuotas`)); setVerCuotas(id); } catch (e: any) { setErr(e.message); } }

  async function load() { try { setItems(await api.get<Anticipo[]>(modoMios ? '/anticipos/mias' : '/anticipos')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { if (modoMios) api.get<{ neto: number }[]>('/recibos').then((r) => { if (r.length) setUltimoNeto(Number(r[0].neto)); }).catch(() => {}); }, [modoMios]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key]);

  const MOTIVOS = ['Gastos médicos', 'Gastos personales', 'Emergencia familiar', 'Refacción / vivienda', 'Educación', 'Deudas', 'Otro'];
  const tope = ultimoNeto != null ? ultimoNeto / 2 : null;
  const pctTope = tope && Number(f.monto) > 0 ? (Number(f.monto) / tope * 100) : 0;
  const excede = tope != null && Number(f.monto) > tope;
  async function solicitar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const motivo = `${f.motivoSel || 'Otro'}${f.explicacion ? ' — ' + f.explicacion.trim() : ''}`;
      await api.post('/anticipos', { monto: f.monto, motivo });
      setF({}); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function resolver(a: Anticipo, estado: string) {
    try {
      const cfg = aprob[a.id] || { cuotas: String(a.cuotas || 1), cuotaDesde: proxMes };
      const body: any = { estado };
      if (estado === 'aprobado') { body.cuotas = Number(cfg.cuotas) || 1; body.cuotaDesde = cfg.cuotaDesde || proxMes; }
      await api.patch(`/anticipos/${a.id}`, body); load();
    } catch (e: any) { setErr(e.message); }
  }
  const setAp = (id: number, k: string, v: string, a: Anticipo) => { const cur = aprob[id] || { cuotas: String(a.cuotas || 1), cuotaDesde: proxMes }; setAprob({ ...aprob, [id]: { ...cur, [k]: v } }); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      {modoMios && <MiBanner subtitulo="Solicitá un adelanto de tu sueldo" />}
      <h2 style={{ marginTop: 0 }}>{modoMios ? 'Adelantos' : 'Aprobaciones — adelantos'}</h2>

      {!puedeAprobar && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={solicitar}>
          <h3 style={{ marginTop: 0 }}>Solicitar adelanto</h3>
          {ultimoNeto != null && (
            <div className="card" style={{ marginBottom: 12, padding: '8px 14px', fontSize: 13, background: 'var(--bg2)' }}>
              Último neto liquidado: <strong>{money(ultimoNeto)}</strong> · Tope de referencia (50%): <strong style={{ color: 'var(--accent2)' }}>{money(tope!)}</strong>
            </div>
          )}
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Monto *</label><input className="input" type="number" value={f.monto || ''} onChange={set('monto')} /></div>
            <div className="field"><label>Motivo *</label><select className="input" value={f.motivoSel || ''} onChange={set('motivoSel')}><option value="">— Elegí un motivo —</option>{MOTIVOS.map((m) => <option key={m}>{m}</option>)}</select></div>
          </div>
          {tope != null && Number(f.monto) > 0 && (
            <div style={{ marginBottom: 10, fontSize: 13, color: excede ? 'var(--red)' : 'var(--green)' }}>
              {excede ? '⚠' : '✓'} Estás solicitando el <strong>{pctTope.toFixed(1)}%</strong> del tope de referencia{excede ? ' — excede el 50% del último neto' : ' (dentro del 50%)'}
            </div>
          )}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Explicación (hasta 500 caracteres)</label>
            <textarea className="input" rows={3} maxLength={500} value={f.explicacion || ''} onChange={set('explicacion')} />
            <div className="muted" style={{ textAlign: 'right', fontSize: 11 }}>{(f.explicacion || '').length} / 500</div>
          </div>
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          <button className="btn" disabled={busy || !f.monto || !f.motivoSel}>{busy ? 'Enviando…' : 'Solicitar'}</button>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>La cantidad de cuotas de descuento la define RR.HH. al aprobar el adelanto.</p>
        </form>
      )}
      {puedeAprobar && err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>
            {puedeAprobar && <th>Empleado</th>}
            <th>Monto</th>{puedeAprobar && <th>% del neto solicitado</th>}<th>Cuotas</th><th>1ª cuota</th><th>Descontado</th><th>Motivo</th><th>Fecha</th><th>Estado</th>{puedeAprobar && <th></th>}
          </tr></thead>
          <tbody>
            {items.map((a) => [
              <tr key={a.id}>
                {puedeAprobar && <td>{a.nom} <span className="muted">({a.leg_num} · {a.empresa})</span></td>}
                <td>{money(a.monto)}</td>
                {puedeAprobar && (() => { const neto = a.ultimo_neto || 0; const tope = neto / 2; const pctNeto = neto > 0 ? (a.monto / neto * 100) : 0; const exc = tope > 0 && a.monto > tope; return (
                  <td style={{ fontSize: 12 }}>{neto > 0 ? <>
                    <span className="muted">neto {money(neto)}</span><br />
                    <span style={{ color: exc ? 'var(--red)' : 'var(--green)' }}>{exc ? '⚠ ' : '✓ '}{pctNeto.toFixed(1)}% del neto</span>
                    <span className="muted"> · tope 50% {money(tope)}</span>
                  </> : <span className="muted">s/neto</span>}</td>
                ); })()}
                <td>{puedeAprobar && a.estado === 'pendiente'
                  ? <input className="input" style={{ width: 60 }} type="number" min="1" value={(aprob[a.id]?.cuotas) ?? String(a.cuotas || 1)} onChange={(e) => setAp(a.id, 'cuotas', e.target.value, a)} />
                  : a.cuotas}</td>
                <td>{puedeAprobar && a.estado === 'pendiente'
                  ? <input className="input" style={{ width: 110 }} type="month" value={(aprob[a.id]?.cuotaDesde) ?? proxMes} onChange={(e) => setAp(a.id, 'cuotaDesde', e.target.value, a)} />
                  : (a.cuota_desde || '—')}</td>
                <td>{a.estado === 'aprobado'
                  ? <button className="btn ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => abrirCuotas(a.id)}>{a.cuotas_pagadas || 0}/{a.cuotas} {verCuotas === a.id ? '▴' : '▾'}</button>
                  : <span className="muted">—</span>}</td>
                <td>{a.motivo || '—'}</td>
                <td className="muted">{new Date(a.created_at).toLocaleDateString('es-AR')}</td>
                <td><span className="badge" style={{ color: colorEstado(a.estado) }}>{a.estado}</span></td>
                {puedeAprobar && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {a.estado === 'pendiente' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(a, 'aprobado')}>Aprobar</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(a, 'rechazado')}>Rechazar</button>
                  </> : <span className="muted" style={{ fontSize: 12 }}>{a.resuelto_por ? `por ${a.resuelto_por}` : ''}</span>}
                </td>}
              </tr>,
              verCuotas === a.id && (
                <tr key={`c${a.id}`}>
                  <td colSpan={puedeAprobar ? 9 : 6} style={{ background: 'var(--bg2)', padding: '8px 14px' }}>
                    <strong style={{ fontSize: 13 }}>Cuotas aplicadas</strong>
                    {!cuotas.length && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Todavía no se aplicó ninguna cuota en liquidaciones.</div>}
                    {cuotas.length > 0 && (
                      <table style={{ marginTop: 6, fontSize: 12 }}><tbody>
                        {cuotas.map((c, i) => <tr key={i}><td style={{ padding: '2px 10px' }}>Cuota {c.nro}/{a.cuotas}</td><td style={{ padding: '2px 10px' }}>{String(c.mes).padStart(2, '0')}/{c.anio}</td><td style={{ padding: '2px 10px', fontFamily: 'monospace' }}>{money(c.monto)}</td></tr>)}
                        <tr style={{ borderTop: '1px solid var(--border)' }}><td style={{ padding: '2px 10px', fontWeight: 600 }}>Total descontado</td><td></td><td style={{ padding: '2px 10px', fontWeight: 600, fontFamily: 'monospace' }}>{money(a.total_pagado || 0)}</td></tr>
                        <tr><td style={{ padding: '2px 10px' }}>Saldo</td><td></td><td style={{ padding: '2px 10px', fontFamily: 'monospace' }}>{money(a.monto - (a.total_pagado || 0))}</td></tr>
                      </tbody></table>
                    )}
                  </td>
                </tr>
              ),
            ]).flat().filter(Boolean)}
            {!items.length && <tr><td colSpan={puedeAprobar ? 9 : 6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin adelantos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
