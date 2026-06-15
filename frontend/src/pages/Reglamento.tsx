import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Vac { hasta: number | null; dias: number; }
interface Lic { tipo: string; dias: number; computo: string; art?: string; nota?: string; }
interface Reg { vacaciones: Vac[]; licencias: Lic[]; texto?: string; }

export default function Reglamento() {
  const { user } = useAuth();
  const puede = user?.role === 'rrhh' || user?.role === 'admin';
  const [reg, setReg] = useState<Reg | null>(null);
  const [edit, setEdit] = useState<Reg | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  async function load() { try { setReg(await api.get<Reg>('/reglamento')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);

  async function guardar() { if (!edit) return; setErr(''); setOk(''); try { await api.put('/reglamento', edit); setOk('Reglamento guardado.'); setEdit(null); load(); } catch (e: any) { setErr(e.message); } }
  const d = edit || reg;
  if (!d) return <div className="muted">{err ? `⚠ ${err}` : 'Cargando…'}</div>;

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {puede && !edit && <button className="btn ghost" onClick={() => setEdit(JSON.parse(JSON.stringify(reg)))}>✎ Editar</button>}
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>✓ {ok}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Vacaciones por antigüedad <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(Art. 150 LCT)</span></h3>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Antigüedad</th><th style={{ textAlign: 'right' }}>Días corridos</th>{edit && <th></th>}</tr></thead>
          <tbody>
            {d.vacaciones.map((v, i) => (
              <tr key={i}>
                <td>{v.hasta == null ? 'Más de ' + (d.vacaciones[i - 1]?.hasta ?? 20) + ' años' : `Hasta ${v.hasta} años`}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{edit ? <input className="input" style={{ width: 80, textAlign: 'right' }} type="number" value={v.dias} onChange={(e) => { const n = JSON.parse(JSON.stringify(edit)); n.vacaciones[i].dias = Number(e.target.value); setEdit(n); }} /> : `${v.dias} días`}</td>
                {edit && <td></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Licencias especiales <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(Art. 158 LCT y CCT)</span></h3>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Tipo</th><th style={{ textAlign: 'right' }}>Días</th><th>Cómputo</th><th>Norma</th><th>Nota</th>{edit && <th></th>}</tr></thead>
          <tbody>
            {d.licencias.map((l, i) => (
              <tr key={i}>
                <td>{edit ? <input className="input" style={{ width: 160 }} value={l.tipo} onChange={(e) => { const n = JSON.parse(JSON.stringify(edit)); n.licencias[i].tipo = e.target.value; setEdit(n); }} /> : l.tipo}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{edit ? <input className="input" style={{ width: 70, textAlign: 'right' }} type="number" value={l.dias} onChange={(e) => { const n = JSON.parse(JSON.stringify(edit)); n.licencias[i].dias = Number(e.target.value); setEdit(n); }} /> : l.dias}</td>
                <td>{edit ? <select className="input" value={l.computo} onChange={(e) => { const n = JSON.parse(JSON.stringify(edit)); n.licencias[i].computo = e.target.value; setEdit(n); }}><option value="corridos">corridos</option><option value="hábil">hábiles</option></select> : l.computo}</td>
                <td className="muted">{l.art || '—'}</td>
                <td className="muted">{edit ? <input className="input" value={l.nota || ''} onChange={(e) => { const n = JSON.parse(JSON.stringify(edit)); n.licencias[i].nota = e.target.value; setEdit(n); }} /> : l.nota || '—'}</td>
                {edit && <td><button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => { const n = JSON.parse(JSON.stringify(edit)); n.licencias.splice(i, 1); setEdit(n); }}>✕</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {edit && <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => { const n = JSON.parse(JSON.stringify(edit)); n.licencias.push({ tipo: 'Nueva licencia', dias: 1, computo: 'corridos', art: '', nota: '' }); setEdit(n); }}>+ Agregar licencia</button>}
      </div>

      {edit && (
        <div className="card" style={{ marginTop: 14, background: 'var(--bg2)' }}>
          <button className="btn" onClick={guardar}>Guardar reglamento</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setEdit(null); setErr(''); }}>Cancelar</button>
        </div>
      )}
    </>
  );
}
