import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const v = (x: unknown) => (x === null || x === undefined || x === '' ? '—' : String(x));

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label>{label}</label>
      <div style={{ fontSize: 14 }}>{v(value)}</div>
    </div>
  );
}

export default function MisDatos() {
  const [p, setP] = useState<Empleado | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Empleado>('/empleados/mi-perfil').then(setP).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="err">⚠ {err}</div>;
  if (!p) return <div className="muted">Cargando…</div>;

  const dom = [p['dom_calle'], p['dom_nro'], p['dom_piso'] ? `Piso ${p['dom_piso']}` : '', p['dom_depto'] ? `Dto ${p['dom_depto']}` : '']
    .filter(Boolean).join(' ');
  const loc = [p['dom_loc'], p['dom_prov'], p['dom_cp'] ? `(${p['dom_cp']})` : ''].filter(Boolean).join(' ');

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{p.nom}</h2>
      <p className="muted" style={{ marginTop: -8 }}>Legajo {p.legNum} · {p.empresa} · {p.role}</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Datos personales</h3>
        <div className="grid2">
          <Field label="DNI" value={p.dni} />
          <Field label="CUIL" value={p.cuil} />
          <Field label="Fecha de nacimiento" value={p['fecha_nac']} />
          <Field label="Sexo" value={p['sexo']} />
          <Field label="Estado civil" value={p['estado_civil']} />
          <Field label="Nacionalidad" value={p['nacionalidad']} />
          <Field label="E-mail" value={p.email} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Datos laborales</h3>
        <div className="grid2">
          <Field label="Empresa" value={p.empresa} />
          <Field label="Legajo" value={p.legNum} />
          <Field label="Fecha de ingreso" value={p.ingreso} />
          <Field label="Categoría" value={p.cat} />
          <Field label="Tramo" value={p.tramo} />
          <Field label="Tarea" value={p['tarea']} />
          <Field label="Condición" value={p['condicion']} />
          <Field label="Convenio" value={p['cod_convenio']} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Domicilio</h3>
        <div className="grid2">
          <Field label="Domicilio" value={dom} />
          <Field label="Localidad / Provincia" value={loc} />
        </div>
      </div>
    </>
  );
}
