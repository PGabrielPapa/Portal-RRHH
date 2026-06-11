import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Mensaje { id: number; titulo: string; cuerpo: string; autor?: string; created_at: string; broadcast: boolean; }

export default function Mensajes() {
  const { user } = useAuth();
  const canSend = user?.role === 'rrhh' || user?.role === 'admin';
  const [items, setItems] = useState<Mensaje[]>([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  // form
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [dni, setDni] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setItems(await api.get<Mensaje[]>('/mensajes')); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      const r = await api.post<{ broadcast: boolean }>('/mensajes', { titulo, cuerpo, destinatarioDni: dni.trim() || undefined });
      setOk(r.broadcast ? 'Mensaje enviado a todos' : 'Mensaje enviado');
      setTitulo(''); setCuerpo(''); setDni('');
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const fmt = (s: string) => new Date(s).toLocaleString('es-AR');

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mensajes</h2>

      {canSend && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={enviar}>
          <h3 style={{ marginTop: 0 }}>Nuevo mensaje</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Título *</label><input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
            <div className="field"><label>DNI destinatario (vacío = todos)</label><input className="input" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej: 17304264 — o vacío para broadcast" /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Mensaje *</label>
            <textarea className="input" rows={3} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          </div>
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          {ok && <div className="ok" style={{ marginBottom: 8 }}>✓ {ok}</div>}
          <button className="btn" disabled={busy || !titulo || !cuerpo}>{busy ? 'Enviando…' : 'Enviar'}</button>
        </form>
      )}

      {!canSend && err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {items.length === 0 && <div className="muted">No tenés mensajes.</div>}
      {items.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{m.titulo}</strong>
            {m.broadcast && <span className="badge">Para todos</span>}
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{m.cuerpo}</p>
          <div className="muted">{fmt(m.created_at)}{m.autor ? ` · de ${m.autor}` : ''}</div>
        </div>
      ))}
    </>
  );
}
