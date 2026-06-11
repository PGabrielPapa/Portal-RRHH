import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [dni, setDni] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await login(dni.trim(), pwd);
      nav(r.mustChangePassword ? '/cambiar-clave' : '/', { replace: true });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: 360 }} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Portal RR.HH.</h2>
        <p className="muted" style={{ marginTop: -8 }}>Grupo LEITEN</p>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>DNI</label>
          <input className="input" value={dni} onChange={(e) => setDni(e.target.value)} autoFocus />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Contraseña</label>
          <input className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="muted" style={{ marginTop: 14 }}>La contraseña inicial es tu DNI; te pediremos cambiarla.</p>
      </form>
    </div>
  );
}
