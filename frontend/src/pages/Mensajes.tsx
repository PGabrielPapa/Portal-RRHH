import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Mensaje {
  id: number; titulo: string; cuerpo: string; autor?: string; created_at: string;
  direccion: 'a_rrhh' | 'a_empleado'; estado: string; borrar_al_leer?: boolean; broadcast?: boolean;
}

const fmt = (s: string) => new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export default function Mensajes() {
  const [items, setItems] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [borrar, setBorrar] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() { try { setItems(await api.get<Mensaje[]>('/mensajes')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk('');
    if (!texto.trim()) { setErr('Escribí un mensaje.'); return; }
    if (texto.length > 500) { setErr('El mensaje no puede superar los 500 caracteres.'); return; }
    setBusy(true);
    try { await api.post('/mensajes', { cuerpo: texto.trim(), borrarAlLeer: borrar }); setOk('Mensaje enviado a RR.HH.'); setTexto(''); setBorrar(false); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function borrarMsg(id: number) { try { await api.del(`/mensajes/${id}`); load(); } catch (e: any) { setErr(e.message); } }

  const enviados = items.filter((m) => m.direccion === 'a_rrhh');
  const recibidos = items.filter((m) => m.direccion === 'a_empleado');

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mensajes</h2>

      <form className="card" style={{ marginBottom: 18 }} onSubmit={enviar}>
        <h3 style={{ marginTop: 0 }}>Enviar mensaje a RR.HH.</h3>
        <div className="field" style={{ marginBottom: 8 }}>
          <textarea className="input" rows={3} maxLength={500} value={texto} placeholder="Escribí tu mensaje para RR.HH.…"
            onChange={(e) => setTexto(e.target.value)} />
          <div className="muted" style={{ textAlign: 'right', fontSize: 11, marginTop: 2 }}>{texto.length} / 500</div>
        </div>
        <label className="row" style={{ gap: 6, fontSize: 13, marginBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={borrar} onChange={(e) => setBorrar(e.target.checked)} />
          Eliminar el mensaje automáticamente cuando RR.HH. lo lea
        </label>
        {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
        {ok && <div className="muted" style={{ marginBottom: 8, color: 'var(--green)' }}>✓ {ok}</div>}
        <button className="btn" disabled={busy || !texto.trim()}>{busy ? 'Enviando…' : '↑ Enviar mensaje'}</button>
      </form>

      <h3 style={{ marginBottom: 8 }}>Mis mensajes enviados</h3>
      {!enviados.length && <div className="muted" style={{ marginBottom: 18 }}>No enviaste mensajes aún.</div>}
      {enviados.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 10 }}>
          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 6px' }}>{m.cuerpo}</p>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: 11 }}>{fmt(m.created_at)}
              <span className="badge" style={{ marginLeft: 8, color: m.estado === 'leido' ? 'var(--green)' : 'var(--accent2)' }}>
                {m.estado === 'leido' ? '✓ Leído' : 'Enviado'}
              </span>
            </span>
            {m.estado === 'leido' && <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12 }} onClick={() => borrarMsg(m.id)}>🗑 Eliminar</button>}
          </div>
        </div>
      ))}

      {recibidos.length > 0 && <>
        <h3 style={{ marginBottom: 8, marginTop: 18 }}>Mensajes de RR.HH.</h3>
        {recibidos.map((m) => (
          <div key={m.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{m.titulo}</strong>
              {m.broadcast && <span className="badge">Para todos</span>}
            </div>
            <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{m.cuerpo}</p>
            <div className="muted" style={{ fontSize: 11 }}>{fmt(m.created_at)}{m.autor ? ` · de ${m.autor}` : ''}</div>
          </div>
        ))}
      </>}
    </>
  );
}
