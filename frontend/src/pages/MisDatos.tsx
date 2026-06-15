import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const v = (x: unknown) => (x === null || x === undefined || x === '' ? '—' : String(x));
function Field({ label, value }: { label: string; value: unknown }) {
  return (<div className="field" style={{ marginBottom: 10 }}><label>{label}</label><div style={{ fontSize: 14 }}>{v(value)}</div></div>);
}
interface Cambio { id: number; dom_nuevo?: string; estado: string; created_at: string; resuelto_por?: string; }
const estadoColor = (e: string) => e === 'aprobado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function MisDatos() {
  const [p, setP] = useState<Empleado | null>(null);
  const [err, setErr] = useState('');
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() {
    try { setP(await api.get<Empleado>('/empleados/mi-perfil')); }
    catch (e: any) { setErr(e.message); return; }
    // Secundario: si falla (p.ej. backend sin actualizar), no rompe la página.
    try { setCambios(await api.get<Cambio[]>('/cambios-domicilio/mias')); } catch { /* opcional */ }
  }
  useEffect(() => { load(); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    try { await api.post('/cambios-domicilio', f); setMsg({ t: 'Cambio de domicilio enviado a RR.HH.', ok: true }); setF({}); setShowForm(false); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  if (err) return <div className="err">⚠ {err}</div>;
  if (!p) return <div className="muted">Cargando…</div>;

  const dom = [p['dom_calle'], p['dom_nro'], p['dom_piso'] ? `Piso ${p['dom_piso']}` : '', p['dom_depto'] ? `Dto ${p['dom_depto']}` : ''].filter(Boolean).join(' ');
  const loc = [p['dom_loc'], p['dom_prov'], p['dom_cp'] ? `(${p['dom_cp']})` : ''].filter(Boolean).join(' ');

  return (
    <>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(61,127,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--accent2)', flexShrink: 0 }}>
          {String(p.nom || '').replace(/,/g, '').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{p.nom}</div>
          <div className="muted" style={{ fontFamily: 'var(--font-mono)', marginTop: 2 }}>Legajo {p.legNum} · {p.empresa}{p['lugar'] ? ` · ${p['lugar']}` : ''}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Datos personales</h3>
        <div className="grid2">
          <Field label="DNI" value={p.dni} /><Field label="CUIL" value={p.cuil} />
          <Field label="Fecha de nacimiento" value={p['fecha_nac']} /><Field label="Sexo" value={p['sexo']} />
          <Field label="Estado civil" value={p['estado_civil']} /><Field label="Nacionalidad" value={p['nacionalidad']} />
          <Field label="E-mail" value={p.email} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Datos laborales</h3>
        <div className="grid2">
          <Field label="Empresa" value={p.empresa} /><Field label="Legajo" value={p.legNum} />
          <Field label="Fecha de ingreso" value={p.ingreso} /><Field label="Categoría" value={p.cat} />
          <Field label="Tramo" value={p.tramo} /><Field label="Tarea" value={p['tarea']} />
          <Field label="Condición" value={p['condicion']} /><Field label="Convenio" value={p['cod_convenio']} />
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Domicilio</h3>
          <button className="btn ghost" onClick={() => setShowForm(!showForm)}>✏ Informar cambio de domicilio</button>
        </div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <Field label="Domicilio" value={dom} /><Field label="Localidad / Provincia" value={loc} />
        </div>

        {showForm && (
          <form onSubmit={enviar} style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h4 style={{ marginTop: 0 }}>Nuevo domicilio</h4>
            <div className="grid2">
              <div className="field"><label>Calle *</label><input className="input" value={f.calle || ''} onChange={set('calle')} /></div>
              <div className="field"><label>Número *</label><input className="input" value={f.nro || ''} onChange={set('nro')} /></div>
              <div className="field"><label>Piso</label><input className="input" value={f.piso || ''} onChange={set('piso')} /></div>
              <div className="field"><label>Depto</label><input className="input" value={f.depto || ''} onChange={set('depto')} /></div>
              <div className="field"><label>Localidad *</label><input className="input" value={f.loc || ''} onChange={set('loc')} /></div>
              <div className="field"><label>Provincia</label><input className="input" value={f.prov || ''} onChange={set('prov')} /></div>
              <div className="field"><label>C.P.</label><input className="input" value={f.cp || ''} onChange={set('cp')} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}><button className="btn">Enviar</button><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        )}
        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginTop: 10 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}

        {cambios.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ marginBottom: 6 }}>Cambios informados:</div>
            {cambios.map((c) => (
              <div key={c.id} className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                <span>{c.dom_nuevo}</span><span className="badge" style={{ color: estadoColor(c.estado) }}>{c.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
