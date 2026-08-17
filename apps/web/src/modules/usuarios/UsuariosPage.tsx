import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Power, Loader2, Users } from 'lucide-react';
import { api } from '../../shared/lib/api';
import { useAuthStore } from '../../store/authStore';

type Rol = 'admin' | 'medico' | 'rrhh' | 'sst';

interface UserRow {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: number;
  creado_en: string;
}

const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  medico: 'Médico',
  sst: 'Especialista SST',
  rrhh: 'RR.HH.',
};

export function UsuariosPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'medico' as Rol });

  const showNotif = (type: 'success' | 'error', text: string) => {
    setNotif({ type, text });
    setTimeout(() => setNotif(null), 4000);
  };

  const load = () => {
    setLoading(true);
    api.get<{ success: boolean; data?: UserRow[] }>('/users').then((res) => {
      if (res.success && res.data) setUsers(res.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email || !form.password || form.password.length < 8) {
      showNotif('error', 'Completa todos los campos. La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    const res = await api.post<{ success: boolean; error?: string }>('/users', form);
    setSaving(false);
    if (res.success) {
      showNotif('success', `Usuario ${form.nombre} creado.`);
      setForm({ nombre: '', email: '', password: '', rol: 'medico' });
      load();
    } else {
      showNotif('error', res.error ?? 'Error al crear el usuario.');
    }
  };

  const toggleActivo = async (u: UserRow) => {
    const res = await api.patch<{ success: boolean; error?: string }>(`/users/${u.id}/toggle`);
    if (res.success) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, activo: x.activo ? 0 : 1 } : x)));
    } else {
      showNotif('error', res.error ?? 'Error al cambiar el estado.');
    }
  };

  const remove = async (u: UserRow) => {
    if (!window.confirm(`¿Eliminar el usuario ${u.nombre}? Esta acción no se puede deshacer.`)) return;
    const res = await api.delete<{ success: boolean; error?: string }>(`/users/${u.id}`);
    if (res.success) {
      showNotif('success', 'Usuario eliminado.');
      load();
    } else {
      showNotif('error', res.error ?? 'Error al eliminar.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Usuarios</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Crea y administra las cuentas que pueden acceder al sistema.</p>
      </div>

      {notif && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: notif.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${notif.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, color: notif.type === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.85rem' }}>
          {notif.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <form onSubmit={handleCreate} className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="#f59e0b" /> Crear usuario
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nombre completo</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Correo electrónico</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })} style={inputStyle}>
                <option value="admin">Administrador</option>
                <option value="medico">Médico</option>
                <option value="sst">Especialista SST</option>
                <option value="rrhh">RR.HH.</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              <div className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 40, borderRadius: 10 }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faint)' }}>
              <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p>No hay usuarios registrados.</p>
            </div>
          ) : (
            <table className="tabla-medica" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                    <td>{ROL_LABEL[u.rol]}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: u.activo ? '#86efac' : 'var(--color-text-faint)' }}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      {u.id === currentUser?.id ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)' }}>Tu cuenta</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => toggleActivo(u)} className="btn btn-ghost" style={{ padding: '6px 10px' }} title={u.activo ? 'Desactivar' : 'Activar'}>
                            <Power size={14} />
                          </button>
                          <button onClick={() => remove(u)} className="btn btn-ghost" style={{ padding: '6px 10px', color: '#f87171' }} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
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
