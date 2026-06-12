import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Recibido { id: number; cuerpo: string; created_at: string; estado: string; borrar_al_leer?: boolean; nom: string; leg_num?: string; empresa?: string; }

const fmt = (s: string) => new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export default function MensajesRRHH() {
  const [items, setItems] = useState<Recibido[]>([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [err, setErr] = useState('');
  // broadcast
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [dni, setDni] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { const p = new URLSearchParams(); if (q) p.set('q', q); if (estado) p.set('estado', estado); setItems(await api.get<Recibido[]>(`/mensajes/recibidos?${p}`)); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, estado]);

  async function marcarLeido(id: number) { try { await api.patch(`/mensajes/${id}/leido`, {}); load(); } catch (e: any) { setErr(e.message); } }

  async function difundir(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      const r = await api.post<{ broadcast: boolean }>('/mensajes/difundir', { titulo, cuerpo, destinatarioDni: dni.trim() || undefined });
      setOk(r.broadcast ? 'Mensaje enviado a todos' : 'Mensaje enviado'); setTitulo(''); setCuerpo(''); setDni('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mensajes — RR.HH.</h2>

      <form className="card" style={{ marginBottom: 18 }} onSubmit={difundir}>
        <h3 style={{ marginTop: 0 }}>Enviar mensaje a empleados</h3>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>Título *</label><input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field"><label>DNI destinatario (vacío = todos)</label><input className="input" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI — o vacío para broadcast" /></div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}><label>Mensaje *</label><textarea className="input" rows={3} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} /></div>
        {ok && <div className="muted" style={{ marginBottom: 8, color: 'var(--green)' }}>✓ {ok}</div>}
        <button className="btn" disabled={busy || !titulo || !cuerpo}>{busy ? 'Enviando…' : 'Enviar'}</button>
      </form>

      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar por nombre o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 160 }} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos</option><option value="nuevo">Nuevos</option><option value="leido">Leídos</option>
        </select>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <h3 style={{ marginBottom: 8 }}>Mensajes recibidos de empleados</h3>
      {!items.length && <div className="muted">Sin mensajes.</div>}
      {items.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 10, background: m.estado === 'nuevo' ? 'rgba(61,127,255,.04)' : undefined }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <div><strong>{m.nom}</strong> <span className="muted" style={{ fontSize: 12 }}>({m.leg_num}{m.empresa ? ` · ${m.empresa}` : ''})</span></div>
            <span className="badge" style={{ color: m.estado === 'leido' ? 'var(--green)' : 'var(--accent2)' }}>{m.estado === 'leido' ? '✓ Leído' : '● Nuevo'}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 6px' }}>{m.cuerpo}</p>
          {m.borrar_al_leer && <div className="muted" style={{ fontSize: 11, color: 'var(--yellow)' }}>🔒 Se borra al marcarlo como leído</div>}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span className="muted" style={{ fontSize: 11 }}>{fmt(m.created_at)}</span>
            {m.estado === 'nuevo' && <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => marcarLeido(m.id)}>✓ Marcar como leído</button>}
          </div>
        </div>
      ))}
    </>
  );
}
