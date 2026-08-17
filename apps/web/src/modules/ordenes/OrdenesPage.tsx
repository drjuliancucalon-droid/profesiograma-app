import { FileText } from 'lucide-react';

export function OrdenesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>Órdenes de Servicio</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>Generación de órdenes por cargo y momento</p>
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
        <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p>Módulo en construcción — disponible en próxima versión.</p>
      </div>
    </div>
  );
}
