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
                  {canEdit && <td style={{ textAlign: 'right' }}>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleActivo(e)}>{e.activo ? 'Dar de baja' : 'Reactivar'}</button>
                  </td>}
                </tr>
              ))}
              {!items.length && <tr><td colSpan={canEdit ? 7 : 6} className="muted" style={{ textAlign: 'center', padding: 24 }}>{loading ? 'Cargando…' : 'Sin resultados'}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>{items.length} empleado(s)</p>

      {showAlta && <AltaModal empresas={empresas} onClose={() => setShowAlta(false)} onSaved={() => { setShowAlta(false); setMsg({ t: 'Empleado dado de alta', ok: true }); load(); }} onError={(t) => setMsg({ t, ok: false })} />}
    </>
  );
}

function AltaModal({ empresas, onClose, onSaved, onError }: { empresas: string[]; onClose: () => void; onSaved: () => void; onError: (t: string) => void; }) {
  const [f, setF] = useState<Record<string, string>>({ empresa: empresas[0] || '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    try {
      await api.post('/empleados', {
        empresa: f.empresa, legNum: f.legNum, dni: f.dni, cuil: f.cuil, nom: f.nom,
        email: f.email, cat: f.cat, tramo: f.tramo, ingreso: f.ingreso || null,
        bruto: parseFloat(f.bruto) || 0, neto: parseFloat(f.neto) || 0,
      });
      onSaved();
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Nueva alta de empleado</h3>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Empresa *</label>
          <select className="input" value={f.empresa} onChange={set('empresa')}>
            {empresas.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>
        <div className="grid2">
          <div className="field"><label>Legajo *</label><input className="input" value={f.legNum || ''} onChange={set('legNum')} /></div>
          <div className="field"><label>DNI *</label><input className="input" value={f.dni || ''} onChange={set('dni')} /></div>
          <div className="field"><label>CUIL</label><input className="input" value={f.cuil || ''} onChange={set('cuil')} placeholder="XX-XXXXXXXX-X" /></div>
          <div className="field"><label>Fecha ingreso</label><input className="input" value={f.ingreso || ''} onChange={set('ingreso')} placeholder="AAAA-MM-DD" /></div>
        </div>
        <div className="field" style={{ margin: '10px 0' }}><label>Apellido y Nombre *</label><input className="input" value={f.nom || ''} onChange={set('nom')} /></div>
        <div className="grid2">
          <div className="field"><label>E-mail</label><input className="input" value={f.email || ''} onChange={set('email')} /></div>
          <div className="field"><label>Categoría</label><input className="input" value={f.cat || ''} onChange={set('cat')} /></div>
          <div className="field"><label>Sueldo bruto</label><input className="input" value={f.bruto || ''} onChange={set('bruto')} /></div>
          <div className="field"><label>Sueldo neto</label><input className="input" value={f.neto || ''} onChange={set('neto')} /></div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={busy || !f.empresa || !f.legNum || !f.nom || (!f.dni && !f.cuil)}>{busy ? 'Guardando…' : 'Crear'}</button>
        </div>
      </div>
    </div>
  );
}
