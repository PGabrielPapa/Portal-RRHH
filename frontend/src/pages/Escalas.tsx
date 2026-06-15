import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoy = () => new Date().toISOString().slice(0, 10);
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const num = (v: string) => (v === '' || v == null ? null : Number(v));

// ─────────────────────────── Form de incremento (compartido) ───────────────────────────
function IncrementoForm({ onApply, alcances }: { onApply: (b: any) => Promise<void>; alcances: [string, string][] }) {
  const [tipo, setTipo] = useState('porcentaje');
  const [valor, setValor] = useState('');
  const [vig, setVig] = useState(hoy());
  const [alcance, setAlcance] = useState(alcances[0][0]);
  const [coment, setComent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  async function go(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try { await onApply({ tipo, valor: Number(valor), vigencia: vig, alcance, comentario: coment }); setOk('Incremento aplicado'); setValor(''); setComent(''); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <form className="card" style={{ marginBottom: 14 }} onSubmit={go}>
      <h3 style={{ marginTop: 0 }}>Aplicar incremento</h3>
      <div className="grid2" style={{ marginBottom: 10 }}>
        <div className="field"><label>Tipo</label><select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="porcentaje">Porcentaje (%)</option><option value="monto">Monto fijo ($)</option></select></div>
        <div className="field"><label>{tipo === 'porcentaje' ? 'Porcentaje %' : 'Monto $'} *</label><input className="input" type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
        <div className="field"><label>Vigencia desde *</label><input className="input" type="date" value={vig} onChange={(e) => setVig(e.target.value)} /></div>
        <div className="field"><label>Alcance</label><select className="input" value={alcance} onChange={(e) => setAlcance(e.target.value)}>{alcances.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Comentario</label><input className="input" value={coment} onChange={(e) => setComent(e.target.value)} /></div>
      </div>
      {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
      {ok && <div className="muted" style={{ marginBottom: 8, color: 'var(--green)' }}>✓ {ok}</div>}
      <button className="btn" disabled={busy || !valor || !vig}>{busy ? 'Aplicando…' : 'Aplicar incremento'}</button>
    </form>
  );
}

// ─────────────────────────── Escala interna ───────────────────────────
function EscalaInterna({ puedeEditar }: { puedeEditar: boolean }) {
  const [activa, setActiva] = useState<any>(null);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [vig, setVig] = useState(hoy());
  const [coment, setComent] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try { setActiva(await api.get('/escala/activa')); setVersiones(await api.get('/escala')); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const tramos: any[] = (edit || activa)?.tramos || [];

  async function guardar() {
    setErr('');
    try {
      await api.post('/escala/version', { vigencia: vig, comentario: coment, data: { tramos: edit.tramos, categorias: edit.categorias, regionales: edit.regionales, montos_titulo: edit.montos_titulo, adicionales: edit.adicionales || [] } });
      setEdit(null); setComent(''); load();
    } catch (e: any) { setErr(e.message); }
  }

  if (!activa) return <div className="muted">{err ? `⚠ ${err}` : 'Cargando…'}</div>;
  const d = edit || activa;

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <div><strong>Escala interna del grupo</strong> <span className="muted">· {d.mesLabel || d.vigencia}{d.porcentaje ? ` · +${d.porcentaje}%` : ''}</span></div>
          {puedeEditar && !edit && <button className="btn ghost" onClick={() => setEdit(clone(activa))}>✎ Editar</button>}
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px' }}>Categoría</th>{tramos.map((t) => <th key={t.key} style={{ textAlign: 'right', padding: '4px 8px' }}>{t.label}</th>)}{edit && <th></th>}</tr></thead>
            <tbody>
              {(d.categorias || []).map((c: any, ci: number) => (
                <tr key={ci}>
                  <td style={{ padding: '4px 8px', borderTop: '1px solid var(--border)' }}>
                    {edit
                      ? <input className="input" style={{ width: 200 }} value={c.cat + (c.label ? ` — ${c.label}` : '')} onChange={(e) => { const [cat, ...l] = e.target.value.split('—'); const n = clone(edit); n.categorias[ci].cat = cat.trim(); n.categorias[ci].label = l.join('—').trim(); setEdit(n); }} />
                      : <><strong>{c.cat}</strong> <span className="muted">{c.label}{c.nota ? ` · ${c.nota}` : ''}</span></>}
                  </td>
                  {tramos.map((t) => (
                    <td key={t.key} style={{ padding: '4px 8px', borderTop: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>
                      {edit
                        ? <input className="input" style={{ width: 110, textAlign: 'right' }} type="number" value={c.tramos[t.key] ?? ''} onChange={(e) => { const n = clone(edit); n.categorias[ci].tramos[t.key] = num(e.target.value); setEdit(n); }} />
                        : `$ ${$(c.tramos[t.key])}`}
                    </td>
                  ))}
                  {edit && <td><button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => { const n = clone(edit); n.categorias.splice(ci, 1); setEdit(n); }}>✕</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {edit && <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => { const n = clone(edit); n.categorias.push({ cat: 'NUEVA', label: '', tramos: Object.fromEntries(tramos.map((t) => [t.key, 0])) }); setEdit(n); }}>+ Agregar categoría</button>}

        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Gerencias regionales</div>
          {(d.regionales || []).map((r: any, ri: number) => (
            <div key={ri} className="row" style={{ gap: 8, marginBottom: 4 }}>
              {edit
                ? <>
                    <input className="input" style={{ flex: 1 }} value={r.label} onChange={(e) => { const n = clone(edit); n.regionales[ri].label = e.target.value; setEdit(n); }} />
                    <input className="input" style={{ width: 130, textAlign: 'right' }} type="number" value={r.monto ?? ''} onChange={(e) => { const n = clone(edit); n.regionales[ri].monto = num(e.target.value); setEdit(n); }} />
                    <button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => { const n = clone(edit); n.regionales.splice(ri, 1); setEdit(n); }}>✕</button>
                  </>
                : <div style={{ flex: 1 }}>{r.label} <span className="muted">{r.desc}</span> · <span style={{ fontFamily: 'monospace' }}>$ {$(r.monto)}</span></div>}
            </div>
          ))}
          {edit && <button className="btn ghost" onClick={() => { const n = clone(edit); (n.regionales = n.regionales || []).push({ key: 'NEW', label: 'Nueva regional', desc: '', monto: 0 }); setEdit(n); }}>+ Agregar regional</button>}
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Adicionales (título, presentismo, etc.)</div>
          {(d.adicionales || []).map((a: any, ai: number) => (
            <div key={ai} className="row" style={{ gap: 8, marginBottom: 4, fontSize: 13 }}>
              {edit
                ? <>
                    <input className="input" style={{ flex: 1 }} placeholder="Concepto" value={a.concepto} onChange={(e) => { const n = clone(edit); n.adicionales[ai].concepto = e.target.value; setEdit(n); }} />
                    <select className="input" style={{ width: 90 }} value={a.tipo || 'pct'} onChange={(e) => { const n = clone(edit); n.adicionales[ai].tipo = e.target.value; setEdit(n); }}><option value="pct">%</option><option value="monto">$</option></select>
                    <input className="input" style={{ width: 100, textAlign: 'right' }} type="number" value={a.valor ?? ''} onChange={(e) => { const n = clone(edit); n.adicionales[ai].valor = num(e.target.value); setEdit(n); }} />
                    <button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => { const n = clone(edit); n.adicionales.splice(ai, 1); setEdit(n); }}>✕</button>
                  </>
                : <div>{a.concepto}: <strong>{a.tipo === 'monto' ? `$ ${$(a.valor)}` : `${a.valor}%`}</strong> {a.nota ? <span className="muted">· {a.nota}</span> : ''}</div>}
            </div>
          ))}
          {edit && <button className="btn ghost" onClick={() => { const n = clone(edit); (n.adicionales = n.adicionales || []).push({ concepto: 'Presentismo', tipo: 'pct', valor: 0, rem: true }); setEdit(n); }}>+ Agregar adicional</button>}
        </div>

        {edit && (
          <div className="card" style={{ marginTop: 14, background: 'var(--bg2)' }}>
            <div className="grid2" style={{ marginBottom: 8 }}>
              <div className="field"><label>Vigencia de esta versión *</label><input className="input" type="date" value={vig} onChange={(e) => setVig(e.target.value)} /></div>
              <div className="field"><label>Comentario</label><input className="input" value={coment} onChange={(e) => setComent(e.target.value)} /></div>
            </div>
            {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
            <button className="btn" onClick={guardar} disabled={!vig}>Guardar como nueva versión</button>
            <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setEdit(null); setErr(''); }}>Cancelar</button>
          </div>
        )}
      </div>

      {puedeEditar && !edit && <IncrementoForm alcances={[['todas', 'Categorías y regionales'], ['categorias', 'Solo categorías'], ['regionales', 'Solo regionales']]}
        onApply={async (b) => { await api.post('/escala/incremento', b); await load(); }} />}

      <h3 style={{ marginBottom: 8 }}>Historial de versiones</h3>
      <Historial versiones={versiones} puedeEditar={puedeEditar} onDelete={async (v) => { await api.del(`/escala/${v.id}`); load(); }} />
    </>
  );
}

// ─────────────────────────── Convenio (sindicato) ───────────────────────────
function ConvenioView({ codigo, puedeEditar }: { codigo: string; puedeEditar: boolean }) {
  const [c, setC] = useState<any>(null);
  const [versiones, setVersiones] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [vig, setVig] = useState(hoy());
  const [coment, setComent] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try { setC(await api.get(`/convenios/${codigo}`)); setVersiones(await api.get(`/convenios/${codigo}/versiones`)); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [codigo]);

  async function guardar() {
    setErr('');
    try {
      await api.post(`/convenios/${codigo}/version`, { vigencia: vig, comentario: coment, data: { acuerdo: edit.acuerdo, tablas: edit.tablas, adicionales: edit.adicionales, noRemunerativos: edit.noRemunerativos } });
      setEdit(null); setComent(''); load();
    } catch (e: any) { setErr(e.message); }
  }

  if (!c) return <div className="muted">{err ? `⚠ ${err}` : 'Cargando…'}</div>;
  const d = edit || c;
  const upd = (fn: (n: any) => void) => { const n = clone(edit); fn(n); setEdit(n); };

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><strong>{c.codigo} — {c.nombre}</strong><div className="muted" style={{ fontSize: 12 }}>{c.cct}{d.mesLabel ? ` · ${d.mesLabel}` : ''}</div></div>
          {puedeEditar && !edit && <button className="btn ghost" onClick={() => setEdit(clone(c))}>✎ Editar</button>}
        </div>
        {d.acuerdo && !edit && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{d.acuerdo}</div>}
      </div>

      {(d.tablas || []).map((t: any, ti: number) => (
        <div key={ti} className="card" style={{ marginBottom: 12 }}>
          {edit
            ? <input className="input" style={{ marginBottom: 6, fontWeight: 600 }} value={t.titulo} onChange={(e) => upd((n) => { n.tablas[ti].titulo = e.target.value; })} />
            : <strong>{t.titulo}</strong>}
          {t.subtitulo && !edit && <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{t.subtitulo}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 6 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '4px 8px' }}>Categoría</th><th style={{ textAlign: 'right', padding: '4px 8px' }}>{t.tipo === 'hora' ? 'Valor hora' : 'Básico'}</th>{edit && <th></th>}</tr></thead>
            <tbody>
              {t.cats.map((cat: any, ci: number) => {
                const campo = t.tipo === 'hora' ? 'valorHora' : 'basico';
                return (
                  <tr key={ci}>
                    <td style={{ padding: '4px 8px', borderTop: '1px solid var(--border)' }}>
                      {edit ? <input className="input" style={{ width: 240 }} value={cat.cat} onChange={(e) => upd((n) => { n.tablas[ti].cats[ci].cat = e.target.value; })} />
                            : <>{cat.cat}{cat.nota ? <span className="muted" style={{ fontSize: 11 }}> · {cat.nota}</span> : ''}</>}
                    </td>
                    <td style={{ padding: '4px 8px', borderTop: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>
                      {edit ? <input className="input" style={{ width: 120, textAlign: 'right' }} type="number" value={cat[campo] ?? ''} onChange={(e) => upd((n) => { n.tablas[ti].cats[ci][campo] = num(e.target.value); n.tablas[ti].cats[ci].ok = e.target.value !== ''; })} />
                            : (cat[campo] != null ? `$ ${$(cat[campo])}` : <span className="muted">s/d</span>)}
                    </td>
                    {edit && <td><button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => upd((n) => { n.tablas[ti].cats.splice(ci, 1); })}>✕</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {edit && <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <button className="btn ghost" onClick={() => upd((n) => { n.tablas[ti].cats.push({ cat: 'Nueva categoría', [t.tipo === 'hora' ? 'valorHora' : 'basico']: 0, ok: true }); })}>+ Categoría</button>
            <select className="input" style={{ width: 130 }} value={t.tipo} onChange={(e) => upd((n) => { n.tablas[ti].tipo = e.target.value; })}><option value="mensual">Mensual</option><option value="hora">Por hora</option></select>
            <button className="btn ghost" style={{ color: 'var(--red)' }} onClick={() => upd((n) => { n.tablas.splice(ti, 1); })}>✕ Quitar tabla</button>
          </div>}
        </div>
      ))}
      {edit && <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => upd((n) => { (n.tablas = n.tablas || []).push({ titulo: 'Nueva tabla', tipo: 'mensual', cats: [] }); })}>+ Agregar tabla</button>}

      {/* Adicionales */}
      <div className="card" style={{ marginBottom: 12 }}>
        <strong>Adicionales</strong>
        {(d.adicionales || []).map((a: any, ai: number) => (
          <div key={ai} className="row" style={{ gap: 8, marginTop: 6, fontSize: 13 }}>
            {edit
              ? <>
                  <input className="input" style={{ flex: 1 }} placeholder="Concepto" value={a.concepto} onChange={(e) => upd((n) => { n.adicionales[ai].concepto = e.target.value; })} />
                  <input className="input" style={{ flex: 2 }} placeholder="Detalle" value={a.detalle || ''} onChange={(e) => upd((n) => { n.adicionales[ai].detalle = e.target.value; })} />
                  <label style={{ fontSize: 12 }}><input type="checkbox" checked={!!a.rem} onChange={(e) => upd((n) => { n.adicionales[ai].rem = e.target.checked; })} /> rem.</label>
                  <button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => upd((n) => { n.adicionales.splice(ai, 1); })}>✕</button>
                </>
              : <div>{a.concepto}{a.detalle ? ` — ${a.detalle}` : ''} <span className="badge">{a.rem ? 'rem.' : 'no rem.'}</span></div>}
          </div>
        ))}
        {edit && <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => upd((n) => { (n.adicionales = n.adicionales || []).push({ concepto: 'Presentismo', detalle: '', rem: true }); })}>+ Agregar adicional</button>}
      </div>

      {/* No remunerativos */}
      <div className="card" style={{ marginBottom: 12 }}>
        <strong>Sumas no remunerativas</strong>
        {(d.noRemunerativos || []).map((nr: any, ni: number) => (
          <div key={ni} className="row" style={{ gap: 8, marginTop: 6, fontSize: 13 }}>
            {edit
              ? <>
                  <input className="input" style={{ width: 110 }} type="month" value={nr.mes || ''} onChange={(e) => upd((n) => { n.noRemunerativos[ni].mes = e.target.value; })} />
                  <input className="input" style={{ flex: 1 }} placeholder="Detalle" value={nr.label} onChange={(e) => upd((n) => { n.noRemunerativos[ni].label = e.target.value; })} />
                  <input className="input" style={{ width: 120, textAlign: 'right' }} type="number" value={nr.monto ?? ''} onChange={(e) => upd((n) => { n.noRemunerativos[ni].monto = num(e.target.value); })} />
                  <button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => upd((n) => { n.noRemunerativos.splice(ni, 1); })}>✕</button>
                </>
              : <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}><span>{nr.mes ? `${nr.mes} · ` : ''}{nr.label}{nr.nota ? <span className="muted"> · {nr.nota}</span> : ''}</span><span style={{ fontFamily: 'monospace' }}>{nr.monto != null ? `$ ${$(nr.monto)}` : 'variable'}</span></div>}
          </div>
        ))}
        {edit && <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => upd((n) => { (n.noRemunerativos = n.noRemunerativos || []).push({ mes: hoy().slice(0, 7), label: 'Suma NR', monto: 0, activo: true }); })}>+ Agregar NR</button>}
      </div>

      {edit && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--bg2)' }}>
          <div className="grid2" style={{ marginBottom: 8 }}>
            <div className="field"><label>Vigencia de esta versión *</label><input className="input" type="date" value={vig} onChange={(e) => setVig(e.target.value)} /></div>
            <div className="field"><label>Comentario</label><input className="input" value={coment} onChange={(e) => setComent(e.target.value)} /></div>
          </div>
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          <button className="btn" onClick={guardar} disabled={!vig}>Guardar como nueva versión</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setEdit(null); setErr(''); }}>Cancelar</button>
        </div>
      )}

      {puedeEditar && !edit && <IncrementoForm alcances={[['todo', 'Básicos y NR'], ['basicos', 'Solo básicos'], ['nr', 'Solo NR']]}
        onApply={async (b) => { await api.post(`/convenios/${codigo}/incremento`, b); await load(); }} />}

      <h3 style={{ marginBottom: 8 }}>Historial de versiones</h3>
      <Historial versiones={versiones} puedeEditar={puedeEditar} onDelete={async (v) => { await api.del(`/convenios/${codigo}/versiones/${v.id}`); load(); }} />
    </>
  );
}

function Historial({ versiones, puedeEditar, onDelete }: { versiones: any[]; puedeEditar: boolean; onDelete: (v: any) => Promise<void> }) {
  const desc: Record<string, string> = { inicial: 'Inicial', incremento: 'Incremento %', porcentaje: 'Incremento %', monto: 'Incremento $', edicion: 'Edición' };
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table>
        <thead><tr><th>Vigencia</th><th>Tipo</th><th>Valor</th><th>Comentario</th>{puedeEditar && <th></th>}</tr></thead>
        <tbody>
          {versiones.map((v) => (
            <tr key={v.id}>
              <td>{v.mesLabel || v.vigencia}</td>
              <td>{desc[v.origen] || v.origen}</td>
              <td style={{ fontFamily: 'monospace' }}>{v.porcentaje ? `+${v.porcentaje}%` : v.monto ? `+$${$(v.monto)}` : '—'}</td>
              <td className="muted">{v.comentario || '—'}</td>
              {puedeEditar && <td style={{ textAlign: 'right' }}>{v.origen !== 'inicial' && <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => onDelete(v)}>✕</button>}</td>}
            </tr>
          ))}
          {!versiones.length && <tr><td colSpan={puedeEditar ? 5 : 4} className="muted" style={{ textAlign: 'center', padding: 16 }}>Sin versiones.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function Escalas() {
  const { user } = useAuth();
  const puedeEditar = user?.role === 'rrhh' || user?.role === 'admin';
  const [convenios, setConvenios] = useState<any[]>([]);
  const [tab, setTab] = useState('interna');

  useEffect(() => { api.get<any[]>('/convenios').then(setConvenios).catch(() => {}); }, []);

  return (
    <>
      <div className="row" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'interna' ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setTab('interna')}>Escala interna</button>
        {convenios.map((c) => (
          <button key={c.codigo} className={`btn ${tab === c.codigo ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setTab(c.codigo)}>{c.codigo}</button>
        ))}
      </div>
      {tab === 'interna' ? <EscalaInterna puedeEditar={puedeEditar} /> : <ConvenioView key={tab} codigo={tab} puedeEditar={puedeEditar} />}
    </>
  );
}
