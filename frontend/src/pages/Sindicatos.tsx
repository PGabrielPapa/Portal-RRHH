import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Sind { id?: number; codigo: string; nombre: string; pctEmpleado: number; pctPatronal: number; pctAntigPorAnio: number; nota?: string; tieneAdicionalTitulo: boolean; presBase: string; }
const PRES = [['basico', 'Solo básico'], ['basico+antig', 'Básico + antigüedad'], ['basico+antig+titulo', 'Básico + antig. + título']];
const vacio = (): Sind => ({ codigo: '', nombre: '', pctEmpleado: 0, pctPatronal: 0, pctAntigPorAnio: 1, nota: '', tieneAdicionalTitulo: false, presBase: 'basico' });

export default function Sindicatos() {
  const { user } = useAuth();
  const puede = user?.role === 'rrhh' || user?.role === 'admin';
  const [items, setItems] = useState<Sind[]>([]);
  const [edit, setEdit] = useState<Sind | null>(null);
  const [err, setErr] = useState('');

  async function load() { try { setItems(await api.get<Sind[]>('/sindicatos')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);

  async function guardar() {
    if (!edit) return; setErr('');
    if (!edit.codigo || !edit.nombre) { setErr('Código y nombre son obligatorios.'); return; }
    try { if (edit.id) await api.put(`/sindicatos/${edit.id}`, edit); else await api.post('/sindicatos', edit); setEdit(null); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function borrar(s: Sind) { try { await api.del(`/sindicatos/${s.id}`); load(); } catch (e: any) { setErr(e.message); } }
  const setF = (k: keyof Sind, v: any) => setEdit({ ...(edit as Sind), [k]: v });
  const presLbl = (p: string) => PRES.find((x) => x[0] === p)?.[1] || p;

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Catálogo de sindicatos y sus parámetros de aportes (cuota del empleado, contribución patronal, antigüedad, base de presentismo y adicional por título).</p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {edit ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{edit.id ? `Editar ${edit.codigo}` : 'Nuevo sindicato'}</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Código *</label><input className="input" value={edit.codigo} disabled={!!edit.id} onChange={(e) => setF('codigo', e.target.value.toUpperCase())} /></div>
            <div className="field"><label>Nombre *</label><input className="input" value={edit.nombre} onChange={(e) => setF('nombre', e.target.value)} /></div>
            <div className="field"><label>% aporte empleado</label><input className="input" type="number" step="0.01" value={edit.pctEmpleado} onChange={(e) => setF('pctEmpleado', Number(e.target.value))} /></div>
            <div className="field"><label>% contribución patronal</label><input className="input" type="number" step="0.01" value={edit.pctPatronal} onChange={(e) => setF('pctPatronal', Number(e.target.value))} /></div>
            <div className="field"><label>% antigüedad por año</label><input className="input" type="number" step="0.01" value={edit.pctAntigPorAnio} onChange={(e) => setF('pctAntigPorAnio', Number(e.target.value))} /></div>
            <div className="field"><label>Base de presentismo</label><select className="input" value={edit.presBase} onChange={(e) => setF('presBase', e.target.value)}>{PRES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="field"><label>Nota</label><input className="input" value={edit.nota || ''} onChange={(e) => setF('nota', e.target.value)} /></div>
            <div className="field" style={{ alignSelf: 'end' }}><label className="row" style={{ gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={edit.tieneAdicionalTitulo} onChange={(e) => setF('tieneAdicionalTitulo', e.target.checked)} /> Tiene adicional por título</label></div>
          </div>
          <button className="btn" onClick={guardar}>Guardar</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setEdit(null); setErr(''); }}>Cancelar</button>
        </div>
      ) : puede && <button className="btn" style={{ marginBottom: 12 }} onClick={() => setEdit(vacio())}>+ Nuevo sindicato</button>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th style={{ textAlign: 'right' }}>% empl.</th><th style={{ textAlign: 'right' }}>% patr.</th><th style={{ textAlign: 'right' }}>% antig.</th><th>Presentismo</th><th>Título</th>{puede && <th></th>}</tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.codigo}</strong></td><td>{s.nombre}{s.nota ? <div className="muted" style={{ fontSize: 11 }}>{s.nota}</div> : ''}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{s.pctEmpleado}%</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{s.pctPatronal}%</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{s.pctAntigPorAnio}%</td>
                <td className="muted" style={{ fontSize: 12 }}>{presLbl(s.presBase)}</td>
                <td>{s.tieneAdicionalTitulo ? '✓' : '—'}</td>
                {puede && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, marginRight: 6 }} onClick={() => setEdit({ ...s })}>✎</button>
                  <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrar(s)}>✕</button>
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={puede ? 8 : 7} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin sindicatos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
