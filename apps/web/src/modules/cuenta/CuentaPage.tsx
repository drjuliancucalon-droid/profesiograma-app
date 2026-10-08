import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { api } from '../../shared/lib/api';
import { useAuthStore } from '../../store/authStore';

const MIN_PASSWORD_LENGTH = 8;

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador', medico: 'Médico', sst: 'Especialista SST', rrhh: 'RR.HH.',
};

/** Devuelve el primer problema de la nueva contraseña, o null si es válida. */
function validate(current: string, next: string, confirm: string): string | null {
  if (!current || !next || !confirm) return 'Completa todos los campos.';
  if (next.length < MIN_PASSWORD_LENGTH) return `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (next === current) return 'La nueva contraseña debe ser distinta a la actual.';
  if (next !== confirm) return 'La confirmación no coincide con la nueva contraseña.';
  return null;
}

export function CuentaPage() {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate(current, next, confirm);
    if (problem) {
      setNotice({ type: 'error', text: problem });
      return;
    }
    setIsSaving(true);
    setNotice(null);
    try {
      const res = await api.post<{ success: boolean; error?: string }>('/auth/change-password', {
        current_password: current,
        new_password: next,
        refresh_token: refreshToken ?? undefined,
      });
      if (res.success) {
        setCurrent('');
        setNext('');
        setConfirm('');
        setNotice({ type: 'success', text: 'Contraseña actualizada. Las sesiones abiertas en otros dispositivos se cerraron.' });
      } else {
        setNotice({ type: 'error', text: res.error ?? 'No se pudo cambiar la contraseña.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Mi cuenta</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {user?.nombre} · {user?.email}{user?.rol ? ` · ${ROL_LABEL[user.rol] ?? user.rol}` : ''}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24, maxWidth: 420 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={18} color="#f59e0b" /> Cambiar contraseña
        </h2>

        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '0.83rem', background: notice.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${notice.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, color: notice.type === 'success' ? '#86efac' : '#fca5a5' }}
          >
            {notice.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PasswordField label="Contraseña actual" value={current} onChange={setCurrent} visible={showPasswords} autoComplete="current-password" />
          <PasswordField label="Nueva contraseña" value={next} onChange={setNext} visible={showPasswords} autoComplete="new-password" placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`} />
          <PasswordField label="Confirmar nueva contraseña" value={confirm} onChange={setConfirm} visible={showPasswords} autoComplete="new-password" />

          <button type="button" onClick={() => setShowPasswords((v) => !v)} className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: '0.78rem', padding: '4px 8px' }}>
            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />} {showPasswords ? 'Ocultar' : 'Mostrar'} contraseñas
          </button>

          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={16} />}
            {isSaving ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  autoComplete: string;
  placeholder?: string;
};

function PasswordField({ label, value, onChange, visible, autoComplete, placeholder }: PasswordFieldProps) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
      />
    </label>
  );
}
