import { Building2 } from 'lucide-react';

export function EmpresasPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>Empresas</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>Gestión de empresas clientes</p>
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
        <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p>Módulo en construcción — disponible en próxima versión.</p>
      </div>
    </div>
  );
}
