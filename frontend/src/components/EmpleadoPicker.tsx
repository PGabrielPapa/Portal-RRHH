import { useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

export default function EmpleadoPicker({ onSelect, value }: { onSelect: (e: Empleado | null) => void; value?: string }) {
  const [q, setQ] = useState(value || '');
  const [matches, setMatches] = useState<Empleado[]>([]);
  async function buscar(v: string) {
    setQ(v); onSelect(null);
    if (v.trim().length < 2) { setMatches([]); return; }
    try { setMatches((await api.get<Empleado[]>(`/empleados?q=${encodeURIComponent(v)}`)).slice(0, 8)); } catch { /* noop */ }
  }
  return (
    <div style={{ position: 'relative' }}>
      <input className="input" placeholder="Buscar nombre/legajo…" value={q} onChange={(e) => buscar(e.target.value)} />
      {matches.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflow: 'auto' }}>
          {matches.map((e) => (
            <div key={e.id} onClick={() => { onSelect(e); setQ(`${e.nom} (${e.legNum})`); setMatches([]); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
              {e.nom} <span className="muted">· {e.legNum} · {e.empresa}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
