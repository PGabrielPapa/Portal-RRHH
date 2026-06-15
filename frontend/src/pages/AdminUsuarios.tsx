import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface U { id: number; leg_num: string; dni: string; nom: string; role: string; disabled: boolean; must_change_pwd: boolean; empresa: string; }
const ROLES = [{ v: 'employee', l: 'Empleado' }, { v: 'manager', l: 'Gerente' }, { v: 'rrhh', l: 'RR.HH.' }, { v: 'admin', l: 'Admin' }];

export default function AdminUsuarios() {
  const { user } = useAuth();
  const [items, setItems] = useState<U[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() {
    try { const p = new URLSearchParams(); if (q) p.set('q', q); if (role) p.set('role', role); if (empresa) p.set('empresa', empresa); setItems(await api.get<U[]>(`/admin/usuarios?${p}`)); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  useEffect(() => { setEmpresas([...new Set(items.map((i) => i.empresa))].sort()); }, [items.length]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, role, empresa]);

  async function cambiarRol(u: U, nuevo: string) {
    try { await api.patch(`/admin/usuarios/${u.id}`, { role: nuevo }); setMsg({ t: `Rol de ${u.nom} → ${nuevo}`, ok: true }); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function toggle(u: U) { try { await api.patch(`/admin/usuarios/${u.id}`, { disabled: !u.disabled }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  async function blanquear(u: U) {
    if (!confirm(`¿Blanquear la contraseña de ${u.nom}? Quedará igual al DNI (${u.dni}) con cambio forzado.`)) return;
    try { await api.post(`/admin/usuarios/${u.id}/blanquear`); setMsg({ t: `Clave de ${u.nom} blanqueada al DNI`, ok: true }); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }

  return (
    <>
      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 12 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar nombre, legajo o DNI…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Todos los roles</option>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Empresa</th><th>DNI</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{u.nom} <span className="muted">({u.leg_num})</span></td>
                <td>{u.empresa}</td><td>{u.dni}</td>
                <td>
                  <select className="input" style={{ padding: '4px 8px', fontSize: 12, width: 130 }} value={u.role} onChange={(e) => cambiarRol(u, e.target.value)} disabled={u.id === user?.id}>
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </td>
                <td>
                  <span className="badge" style={{ color: u.disabled ? 'var(--red)' : 'var(--green)' }}>{u.disabled ? 'Desactivado' : 'Activo'}</span>
                  {u.must_change_pwd && <span className="badge" title="Debe cambiar la contraseña" style={{ marginLeft: 4, color: 'var(--yellow)' }}>🔑</span>}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => blanquear(u)}>Blanquear clave</button>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggle(u)} disabled={u.id === user?.id}>{u.disabled ? 'Activar' : 'Desactivar'}</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin usuarios.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{items.length} usuario(s) · No podés cambiar tu propio rol/estado.</p>
    </>
  );
}
