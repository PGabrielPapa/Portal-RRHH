export default function Placeholder({ label }: { label: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🚧</div>
      <h3 style={{ margin: '0 0 6px' }}>{label}</h3>
      <p className="muted" style={{ maxWidth: 460, margin: '0 auto' }}>
        Módulo en migración a la nueva arquitectura. Está disponible en la versión
        actual del portal y se va a portar acá próximamente.
      </p>
    </div>
  );
}
