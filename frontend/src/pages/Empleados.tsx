import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Empleado, ImportResult } from '../lib/types';

const PLANTILLA = ['Legajo*','DNI*','CUIL*','Apellido y Nombre*','Empresa*','Fecha Ingreso*',
  'Fecha Nacimiento','Ubicación','Categoría','Tramo','Sueldo Bruto','Sueldo Neto','E-mail',
  'Domicilio Calle','Localidad','Provincia','Código Postal'];

export default function Empleados() {
  const { user } = useAuth();
  const canEdit = user?.role === 'rrhh' || user?.role === 'admin';
  const [items, setItems] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [soloActivos, setSoloActivos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [showAlta, setShowAlta] = useState(false);
  const [editEmp, setEditEmp] = useState<Empleado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (empresa) params.set('empresa', empresa);
      if (soloActivos) params.set('activos', 'true');
      const data = await api.get<Empleado[]>(`/empleados?${params.toString()}`);
      setItems(data);
      if (!empresas.length) setEmpresas([...new Set(data.map((e) => e.empresa))].sort());
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, empresa, soloActivos]);

  async function toggleActivo(emp: Empleado) {
    try { await api.patch(`/empleados/${emp.id}/activo`, { activo: !emp.activo }); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }

  function descargarPlantilla() {
    const ws = XLSX.utils.aoa_to_sheet([PLANTILLA]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Altas');
    XLSX.writeFile(wb, 'plantilla_altas.xlsx');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const aoa = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false, blankrows: false });
      if (!aoa.length) return setMsg({ t: 'El archivo no contiene datos', ok: false });
      const hdr = (aoa[0] || []).map((h) => String(h).trim().replace(/[*]/g, '').trim());
      const rows = aoa.slice(1).filter((r) => String(r[0] ?? '').trim())
        .map((r) => Object.fromEntries(hdr.map((h, j) => [h, String(r[j] ?? '').trim()])));
      const res = await api.post<ImportResult>('/empleados/import', { rows });
      setMsg({ t: res.mensaje, ok: res.ok > 0 });
      if (res.errores?.length) console.warn('Import avisos:', res.errores);
      load();
    } catch (err: any) { setMsg({ t: 'No se pudo procesar el archivo: ' + err.message, ok: false }); }
  }

  return (
    <>
        <div className="row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar nombre, legajo o DNI…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ maxWidth: 220 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>
          <label className="row muted" style={{ gap: 6 }}>
            <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} /> Solo activos
          </label>
          <div style={{ flex: 1 }} />
          {canEdit && <>
            <button className="btn ghost" onClick={descargarPlantilla}>📋 Plantilla</button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>↑ Importar Excel</button>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={onFile} />
            <button className="btn" onClick={() => setShowAlta(true)}>+ Nueva alta</button>
          </>}
        </div>

        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 12 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}

        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr>
              <th>Legajo</th><th>Nombre</th><th>Empresa</th><th>DNI</th><th>Cat.</th><th>Estado</th>{canEdit && <th></th>}
            </tr></thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'monospace' }}>{e.legNum}</td>
                  <td>{e.nom}</td>
                  <td>{e.empresa}</td>
                  <td>{e.dni}</td>
                  <td>{e.cat || '—'}</td>
                  <td><span className="badge" style={{ color: e.activo ? 'var(--green)' : 'var(--t3)' }}>{e.activo ? 'Activo' : 'Baja'}</span></td>
                  {canEdit && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => setEditEmp(e)}>Editar</button>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleActivo(e)}>{e.activo ? 'Dar de baja' : 'Reactivar'}</button>
                  </td>}
                </tr>
              ))}
              {!items.length && <tr><td colSpan={canEdit ? 7 : 6} className="muted" style={{ textAlign: 'center', padding: 24 }}>{loading ? 'Cargando…' : 'Sin resultados'}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>{items.length} empleado(s)</p>

      {(showAlta || editEmp) && <EmpModal emp={editEmp} empresas={empresas} onClose={() => { setShowAlta(false); setEditEmp(null); }} onSaved={(m) => { setShowAlta(false); setEditEmp(null); setMsg({ t: m, ok: true }); load(); }} onError={(t) => setMsg({ t, ok: false })} />}
    </>
  );
}

function EmpModal({ emp, empresas, onClose, onSaved, onError }: { emp: Empleado | null; empresas: string[]; onClose: () => void; onSaved: (m: string) => void; onError: (t: string) => void; }) {
  const esNueva = !emp;
  const e = (emp || {}) as any;
  const ini: Record<string, string> = {
    empresa: e.empresa || empresas[0] || '', legNum: e.legNum || '', dni: e.dni || '', cuil: e.cuil || '', nom: e.nom || '',
    email: e.email || '', ingreso: e.ingreso || '', fecha_nac: e.fecha_nac || '', sexo: e.sexo || '', estado_civil: e.estado_civil || '', nacionalidad: e.nacionalidad || '',
    lugar: e.lugar || '', tarea: e.tarea || '', cat: e.cat || '', tramo: e.tramo || '', desc_categoria: e.desc_categoria || '', condicion: e.condicion || '',
    cod_convenio: e.cod_convenio || '', cod_os: e.cod_os || '', desc_os: e.desc_os || '', cod_sindicato: e.cod_sindicato || '',
    basico: e.basico ?? '', antiguedad_monto: e.antiguedad_monto ?? '', complemento: e.complemento ?? '', norem: e.norem ?? '', sueldo: e.sueldo ?? '',
    bruto: e.bruto != null ? String(e.bruto) : '', neto: e.neto != null ? String(e.neto) : '',
    dom_calle: e.dom_calle || '', dom_nro: e.dom_nro || '', dom_piso: e.dom_piso || '', dom_depto: e.dom_depto || '', dom_torre: e.dom_torre || '', dom_bloque: e.dom_bloque || '', dom_loc: e.dom_loc || '', dom_cp: e.dom_cp || '', dom_prov: e.dom_prov || '',
  };
  const [f, setF] = useState<Record<string, string>>(ini);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: ev.target.value });
  const F = ({ k, label, type = 'text', ph }: { k: string; label: string; type?: string; ph?: string }) => (
    <div className="field"><label>{label}</label><input className="input" type={type} value={f[k] || ''} onChange={set(k)} placeholder={ph} /></div>
  );

  async function save() {
    setBusy(true);
    try {
      const body: any = { ...f, bruto: parseFloat(f.bruto) || 0, neto: parseFloat(f.neto) || 0 };
      if (esNueva) await api.post('/empleados', body);
      else await api.put(`/empleados/${(emp as any).id}`, body);
      onSaved(esNueva ? 'Empleado dado de alta' : 'Empleado actualizado');
    } catch (err: any) { onError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 760, maxHeight: '90vh', overflow: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>{esNueva ? 'Nueva alta de empleado' : `Editar — ${e.nom}`}</h3>

        <div className="sb-group-label" style={{ margin: '4px 0 6px' }}>Identificación</div>
        <div className="grid2">
          <div className="field"><label>Empresa *</label><select className="input" value={f.empresa} onChange={set('empresa')} disabled={!esNueva}>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
          <div className="field"><label>Apellido y Nombre *</label><input className="input" value={f.nom || ''} onChange={set('nom')} /></div>
          <div className="field"><label>Legajo *</label><input className="input" value={f.legNum || ''} onChange={set('legNum')} disabled={!esNueva} /></div>
          <div className="field"><label>DNI *</label><input className="input" value={f.dni || ''} onChange={set('dni')} disabled={!esNueva} /></div>
          <F k="cuil" label="CUIL" ph="XX-XXXXXXXX-X" />
          <F k="email" label="E-mail" />
          <F k="ingreso" label="Fecha de ingreso" type="date" />
          <F k="fecha_nac" label="Fecha de nacimiento" ph="AAAA-MM-DD o DD/MM/AAAA" />
          <F k="sexo" label="Sexo" />
          <F k="estado_civil" label="Estado civil" />
          <F k="nacionalidad" label="Nacionalidad" />
        </div>

        <div className="sb-group-label" style={{ margin: '12px 0 6px' }}>Datos laborales</div>
        <div className="grid2">
          <F k="lugar" label="Ubicación / Lugar de trabajo" />
          <F k="tarea" label="Tarea / Puesto" />
          <F k="cat" label="Categoría (código)" />
          <F k="tramo" label="Tramo" />
          <F k="desc_categoria" label="Descripción de categoría" />
          <F k="condicion" label="Condición" />
          <F k="cod_convenio" label="Código de convenio" />
          <F k="cod_sindicato" label="Código de sindicato" />
          <F k="cod_os" label="Código obra social" />
          <F k="desc_os" label="Descripción obra social" />
        </div>

        <div className="sb-group-label" style={{ margin: '12px 0 6px' }}>Remuneración</div>
        <div className="grid2">
          <F k="basico" label="Básico" />
          <F k="antiguedad_monto" label="Adicional antigüedad ($)" />
          <F k="complemento" label="Complemento" />
          <F k="norem" label="No remunerativo" />
          <F k="sueldo" label="Sueldo" />
          <F k="bruto" label="Sueldo bruto" />
          <F k="neto" label="Sueldo neto" />
        </div>

        <div className="sb-group-label" style={{ margin: '12px 0 6px' }}>Domicilio</div>
        <div className="grid2">
          <F k="dom_calle" label="Calle" />
          <F k="dom_nro" label="Número" />
          <F k="dom_piso" label="Piso" />
          <F k="dom_depto" label="Depto" />
          <F k="dom_torre" label="Torre" />
          <F k="dom_bloque" label="Bloque" />
          <F k="dom_loc" label="Localidad" />
          <F k="dom_cp" label="C.P." />
          <F k="dom_prov" label="Provincia" />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={busy || !f.empresa || !f.legNum || !f.nom || (!f.dni && !f.cuil)}>{busy ? 'Guardando…' : (esNueva ? 'Crear' : 'Guardar cambios')}</button>
        </div>
      </div>
    </div>
  );
}
