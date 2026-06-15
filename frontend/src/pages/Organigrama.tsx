import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { construirOrganigrama, type Emp, type OrgNode } from '../lib/organigrama';
import { useAuth } from '../lib/auth';

const legD = (l?: string) => String(l || '').replace(/\D/g, '').padStart(6, '0');

function Nodo({ nodo, nivel, expandido, toggle, q }: { nodo: OrgNode; nivel: number; expandido: Set<string>; toggle: (k: string) => void; q: string }) {
  const abierto = expandido.has(nodo.nombre);
  const tieneHijos = nodo.directos.length > 0 || Object.keys(nodo.subManagers).length > 0;
  const color = nivel === 0 ? 'var(--accent2)' : nivel === 1 ? 'rgb(168,85,247)' : 'var(--green)';
  const emp = nodo.empleado;
  const subs = Object.values(nodo.subManagers).sort((a, b) => b.totalRecursivo - a.totalRecursivo);
  const match = (s: string) => q && s.toLowerCase().includes(q.toLowerCase());

  return (
    <div style={{ marginLeft: nivel ? 18 : 0, marginBottom: 6 }}>
      <div className="card" style={{ padding: '8px 12px', borderLeft: `3px solid ${color}`, cursor: tieneHijos ? 'pointer' : 'default' }}
        onClick={() => tieneHijos && toggle(nodo.nombre)}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div>
            <strong style={{ color }}>{tieneHijos ? (abierto ? '▾ ' : '▸ ') : '• '}{nodo.nombre}</strong>
            {emp ? <span className="muted" style={{ fontSize: 11, marginLeft: 8, fontFamily: 'monospace' }}>Leg. {legD(emp.legNum || emp.leg)} · {emp.empresa || emp.emp} {emp.cat ? `· ${emp.cat} ${emp.tramo || ''}` : ''}</span>
                 : <span className="muted" style={{ fontSize: 11, marginLeft: 8, fontStyle: 'italic' }}>(Área / rol)</span>}
            {nodo.area && <div style={{ fontSize: 11, color, fontFamily: 'monospace' }}>{nodo.area}</div>}
          </div>
          <span className="badge" style={{ flexShrink: 0 }}>{nodo.totalRecursivo} pers.</span>
        </div>
      </div>

      {abierto && nodo.directos.length > 0 && (
        <div style={{ margin: '4px 0 4px 18px' }}>
          <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Directos ({nodo.directos.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {nodo.directos.sort((a, b) => a.emp.nom.localeCompare(b.emp.nom)).map((d) => (
              <span key={d.emp.legNum || d.emp.nom} className="badge"
                style={{ background: 'var(--bg2)', border: `1px solid ${match(d.emp.nom) ? 'rgba(234,179,8,.6)' : 'var(--border)'}`, fontWeight: 400 }}
                title={`${d.emp.empresa || d.emp.emp} · ${d.emp.lugar || ''}`}>
                {d.emp.nom} <span className="muted" style={{ fontFamily: 'monospace' }}>({legD(d.emp.legNum || d.emp.leg)})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {abierto && subs.map((s) => <Nodo key={s.nombre} nodo={s} nivel={nivel + 1} expandido={expandido} toggle={toggle} q={q} />)}
    </div>
  );
}

export default function Organigrama() {
  const { user } = useAuth();
  const [nomina, setNomina] = useState<Emp[]>([]);
  const [autoHecho, setAutoHecho] = useState(false);
  const [empresa, setEmpresa] = useState('');
  const [q, setQ] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Emp[]>('/empleados').then((es) => {
      setNomina(es);
      setEmpresas([...new Set(es.map((e) => e.empresa || e.emp || '').filter(Boolean))].sort());
    }).catch((e: any) => setErr(e.message));
  }, []);

  const { raices, totalEmpleados, nodos } = useMemo(() => construirOrganigrama(nomina, empresa), [nomina, empresa]);

  useEffect(() => {
    if (autoHecho || !user?.nom || !Object.keys(nodos).length) return;
    const mi = String(user.nom).toUpperCase().trim();
    const nodo = nodos[mi]; if (!nodo) return;
    const exp = new Set<string>([mi]);
    const expandir = (n: OrgNode, prof: number) => { if (prof > 10) return; for (const k of Object.keys(n.subManagers)) { exp.add(k); expandir(n.subManagers[k], prof + 1); } };
    expandir(nodo, 0);
    setExpandido(exp); setAutoHecho(true);
  }, [nodos, user, autoHecho]);

  // Filtro por búsqueda: mostrar solo ramas con coincidencias y expandirlas.
  const { raicesVisibles, autoExpand } = useMemo(() => {
    if (!q.trim()) return { raicesVisibles: raices, autoExpand: null as Set<string> | null };
    const ql = q.toLowerCase();
    const matchNodo = (n: OrgNode): boolean =>
      n.nombre.toLowerCase().includes(ql) || (n.area || '').toLowerCase().includes(ql) ||
      n.directos.some((d) => d.emp.nom.toLowerCase().includes(ql) || String(d.emp.legNum || d.emp.leg || '').includes(ql)) ||
      Object.values(n.subManagers).some(matchNodo);
    const exp = new Set<string>();
    const marcar = (n: OrgNode) => { if (matchNodo(n)) { exp.add(n.nombre); Object.values(n.subManagers).forEach(marcar); } };
    raices.forEach(marcar);
    return { raicesVisibles: raices.filter(matchNodo), autoExpand: exp };
  }, [q, raices]);

  const exp = autoExpand || expandido;
  const toggle = (k: string) => { if (autoExpand) return; setExpandido((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; }); };
  const expandirTodo = () => setExpandido(new Set(Object.keys(nodos)));
  const colapsar = () => setExpandido(new Set());

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 220 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          {empresas.map((em) => <option key={em} value={em}>{em}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar persona, área o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={expandirTodo} disabled={!!autoExpand}>Expandir todo</button>
        <button className="btn ghost" onClick={colapsar} disabled={!!autoExpand}>Colapsar</button>
        <span className="muted" style={{ alignSelf: 'center', fontSize: 12 }}>{totalEmpleados} empleados · {Object.keys(nodos).length} áreas</span>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {!raicesVisibles.length && <div className="muted">Sin datos de organigrama para los filtros aplicados.</div>}
      {raicesVisibles.map((r) => <Nodo key={r.nombre} nodo={r} nivel={0} expandido={exp} toggle={toggle} q={q} />)}
    </>
  );
}
