import { Building2, Upload } from 'lucide-react';
import { useProfesiogramaStore } from '../../store/profesiogramaStore';

export function EmpresaForm() {
  const { empresaInfo, setEmpresaInfo, profesionalInfo, setProfesionalInfo } = useProfesiogramaStore();

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building2 size={18} color="#4f46e5" />
        Datos Empresa
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(['nombre', 'nit', 'fecha', 'responsable'] as const).map(k => (
          <div key={k}>
            <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {k === 'nombre' ? 'Razón Social' : k === 'nit' ? 'NIT' : k === 'fecha' ? 'Fecha de emisión' : 'Responsable SG-SST'}
            </label>
            <input
              type={k === 'fecha' ? 'date' : 'text'}
              value={String((empresaInfo as Record<string, string>)[k] ?? '')}
              onChange={e => setEmpresaInfo({ [k]: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
        ))}

        <div>
          <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Logo empresa</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            <Upload size={14} />
            {empresaInfo.logo ? 'Cambiar logo' : 'Subir logo (PNG, JPG, SVG)'}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => setEmpresaInfo({ logo: reader.result as string });
                reader.readAsDataURL(file);
              }} />
          </label>
          {empresaInfo.logo && <img src={empresaInfo.logo} alt="Logo empresa" style={{ marginTop: 8, height: 48, objectFit: 'contain', borderRadius: 6 }} />}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Médico elaborador</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['nombre', 'cedula', 'titulo', 'licencia', 'celular', 'correo'] as const).map(k => (
              <div key={k}>
                <label style={{ display: 'block', color: 'var(--color-text-faint)', fontSize: '0.68rem', fontWeight: 600, marginBottom: 3, letterSpacing: '0.04em', textTransform: 'capitalize' }}>{k}</label>
                <input
                  type={k === 'correo' ? 'email' : 'text'}
                  value={profesionalInfo[k]}
                  onChange={e => setProfesionalInfo({ [k]: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
