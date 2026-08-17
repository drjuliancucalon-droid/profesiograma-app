import { useState, useEffect } from 'react';
import { Building, Plus, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../../shared/lib/api';

interface OrgRow {
  id: string;
  nombre: string;
  activo: number;
  creado_en: string;
  usuarios: number;
}

interface NewOrgResult {
  organizacion_id: string;
  admin: { id: string; email: string; nombre: string; password: string };
}

export function OrganizacionesPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ nombre_organizacion: '', admin_email: '', admin_nombre: '' });
  const [result, setResult] = useState<NewOrgResult | null>(null);
  const [copied, setCopied] = useState(false);

  const showNotif = (type: 'success' | 'error', text: string) => {
    setNotif({ type, text });
    setTimeout(() => setNotif(null), 4000);
  };

  const load = () => {
    setLoading(true);
    api.get<{ success: boolean; data?: OrgRow[] }>('/organizaciones').then((res) => {
      if (res.success && res.data) setOrgs(res.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_organizacion || !form.admin_email || !form.admin_nombre) {
      showNotif('error', 'Completa todos los campos.');
      return;
    }
    setSaving(true);
    setResult(null);
    const res = await api.post<{ success: boolean; error?: string } & Partial<NewOrgResult>>('/organizaciones', form);
    setSaving(false);
    if (res.success && res.admin && res.organizacion_id) {
      setResult({ organizacion_id: res.organizacion_id, admin: res.admin });
      setForm({ nombre_organizacion: '', admin_email: '', admin_nombre: '' });
      load();
    } else {
      showNotif('error', res.error ?? 'Error al crear la organización.');
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    const text = `Organización: ${result.admin.nombre}\nCorreo: ${result.admin.email}\nContraseña temporal: ${result.admin.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Organizaciones</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Crea una organización nueva (clínica/consultorio cliente) y su primer usuario admin.</p>
      </div>

      {notif && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: notif.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${notif.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, color: notif.type === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.85rem' }}>
          {notif.text}
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(245,158,11,0.35)' }}>
          <h2 style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.95rem' }}>Organización creada — copia estas credenciales ahora</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
            Esta contraseña solo se muestra una vez. Entrégasela al cliente para que inicie sesión y la cambie.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', fontSize: '0.85rem', background: 'var(--color-surface-2)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <div>Correo: {result.admin.email}</div>
            <div>Contraseña temporal: {result.admin.password}</div>
          </div>
          <button onClick={copyCredentials} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar credenciales'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <form onSubmit={handleCreate} className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="#f59e0b" /> Nueva organización
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nombre de la organización</label>
              <input value={form.nombre_organizacion} onChange={(e) => setForm({ ...form, nombre_organizacion: e.target.value })} style={inputStyle} placeholder="Ej. Clínica San Rafael SST" />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nombre del admin</label>
              <input value={form.admin_nombre} onChange={(e) => setForm({ ...form, admin_nombre: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Correo del admin</label>
              <input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} style={inputStyle} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
              {saving ? 'Creando...' : 'Crear organización'}
            </button>
          </div>
        </form>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              <div className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 40, borderRadius: 10 }} />
            </div>
          ) : orgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faint)' }}>
              <Building size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p>No hay organizaciones registradas.</p>
            </div>
          ) : (
            <table className="tabla-medica" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.nombre}</td>
                    <td>{o.usuarios}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: o.activo ? '#86efac' : 'var(--color-text-faint)' }}>
                        {o.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(o.creado_en).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  fontSize: '0.85rem',
  outline: 'none',
};
