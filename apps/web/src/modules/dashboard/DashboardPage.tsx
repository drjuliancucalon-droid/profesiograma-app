import { FileText, Building2, BrainCircuit, ClipboardList, TrendingUp, Shield } from 'lucide-react';

const stats = [
  { label: 'Profesiogramas', value: '—', icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { label: 'Empresas', value: '—', icon: Building2, color: '#4f46e5', bg: 'rgba(79,70,229,0.12)' },
  { label: 'Cargos analizados', value: '—', icon: BrainCircuit, color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  { label: 'Órdenes emitidas', value: '—', icon: ClipboardList, color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
];

export function DashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Sistema de Profesiograma Médico-Ocupacional · Resolución 1843 de 2025</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Shield size={20} color="#f59e0b" />
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>Marco Legal Vigente</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { norma: 'Resolución 1843 de 2025', desc: 'Regulación Evaluaciones Médicas Ocupacionales. Deroga Res. 2346/07. Duración mínima consulta 20 min.' },
            { norma: 'Sentencia T-202 de 2024', desc: 'Prohibición de pruebas de Embarazo, VIH o Serología VDRL como filtro de ingreso.' },
            { norma: 'Decreto 1072 de 2015', desc: 'Exámenes fundamentados estrictamente en el Perfil del Cargo y Matriz de Peligros IPVR.' },
            { norma: 'Resolución 4272 de 2021', desc: 'Trabajo en Alturas: Perfil Lipídico, Glicemia, Visiometría y Test de Vértigo. IMC ≤35 y peso ≤110 kg.' },
          ].map(({ norma, desc }) => (
            <div key={norma} style={{ background: 'var(--color-surface-2)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>{norma}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8 }}>
          <p style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600 }}>⚠️ No existe concepto "No Apto". El empleador tiene 20 días hábiles para implementar recomendaciones.</p>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="/profesiograma" className="btn btn-primary"><BrainCircuit size={18} /> Nuevo Profesiograma</a>
        <a href="/ordenes" className="btn btn-secondary"><FileText size={18} /> Generar Orden</a>
        <a href="/historial" className="btn btn-ghost"><TrendingUp size={18} /> Ver Historial</a>
      </div>
    </div>
  );
}
