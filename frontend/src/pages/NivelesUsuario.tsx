import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GROUPS, type Role } from '../lib/sections';

const NIVELES: { role: Role; label: string; desc: string }[] = [
  { role: 'admin', label: 'Administrador', desc: 'Acceso total + administración de usuarios, empresas, auditoría y cierre de períodos.' },
  { role: 'rrhh', label: 'Recursos Humanos', desc: 'Gestión de RR.HH.: liquidación, recibos, licencias, sanciones, escalas, reportes, parámetros.' },
  { role: 'manager', label: 'Gerente / Jefe', desc: 'Su equipo: aprobaciones, licencias y sanciones del equipo, organigrama, evaluaciones.' },
  { role: 'employee', label: 'Empleado', desc: 'Su espacio personal: recibos, datos, licencias, adelantos, CBUs, mensajes.' },
];

interface U { id: number; role: string; }

export default function NivelesUsuario() {
  const nav = useNavigate();
  const [users, setUsers] = useState<U[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => { api.get<U[]>('/admin/usuarios').then(setUsers).catch((e) => setErr(e.message)); }, []);

  const conteo = useMemo(() => users.reduce((a: Record<string, number>, u) => { a[u.role] = (a[u.role] || 0) + 1; return a; }, {}), [users]);
  const panelesDe = (role: Role) => GROUPS.filter((g) => g.roles.includes(role)).map((g) => g.panel);

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Sistema de 4 niveles de acceso. La asignación de nivel a cada usuario se hace en <button className="btn ghost" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => nav('/m/admin-usuarios')}>Usuarios →</button></p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {NIVELES.map((n) => (
        <div key={n.role} className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: 15 }}>{n.label}</strong> <span className="badge" style={{ marginLeft: 6 }}>{n.role}</span>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{n.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontFamily: 'monospace', color: 'var(--accent2)' }}>{conteo[n.role] || 0}</div>
              <div className="muted" style={{ fontSize: 11 }}>usuarios</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Paneles con acceso: </span>
            {panelesDe(n.role).map((p) => <span key={p} className="badge" style={{ marginRight: 4 }}>{p}</span>)}
          </div>
        </div>
      ))}
    </>
  );
}
