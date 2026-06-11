import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ChangePassword() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [conf, setConf] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (nw.length < 6) return setErr('La nueva contraseña debe tener al menos 6 caracteres');
    if (nw !== conf) return setErr('Las contraseñas no coinciden');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: cur, newPassword: nw });
      await refresh();
      nav('/', { replace: true });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: 360 }} onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Contraseña actual (tu DNI)</label>
          <input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoFocus />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Nueva contraseña</label>
          <input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Repetir nueva contraseña</label>
          <input className="input" type="password" value={conf} onChange={(e) => setConf(e.target.value)} />
        </div>
        {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </div>
  );
}
