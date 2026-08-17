import { useState, useEffect } from 'react';
import { KeyRound, Save, Loader2 } from 'lucide-react';
import { api } from '../../shared/lib/api';

type Provider = 'gemini' | 'openrouter' | 'mistral';

interface AiKeysData {
  gemini_api_key: string | null;
  openrouter_api_key: string | null;
  mistral_api_key: string | null;
  primary_provider: Provider;
  gemini_env_fallback: boolean;
}

const PROVIDERS: { id: Provider; label: string; help: string }[] = [
  { id: 'gemini', label: 'Google Gemini', help: 'API key de Google AI Studio (Gemini 2.5 Flash).' },
  { id: 'openrouter', label: 'OpenRouter', help: 'API key de openrouter.ai — acceso a múltiples modelos.' },
  { id: 'mistral', label: 'Mistral AI', help: 'API key de la plataforma de Mistral.' },
];

export function SettingsPage() {
  const [current, setCurrent] = useState<AiKeysData | null>(null);
  const [values, setValues] = useState<Record<Provider, string>>({ gemini: '', openrouter: '', mistral: '' });
  const [primary, setPrimary] = useState<Provider>('gemini');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ success: boolean; data?: AiKeysData }>('/settings/ai-keys').then((res) => {
      if (res.success && res.data) {
        setCurrent(res.data);
        setPrimary(res.data.primary_provider);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const body: Record<string, string> = { primary_provider: primary };
    if (values.gemini) body.gemini_api_key = values.gemini;
    if (values.openrouter) body.openrouter_api_key = values.openrouter;
    if (values.mistral) body.mistral_api_key = values.mistral;
    const res = await api.put<{ success: boolean; error?: string }>('/settings/ai-keys', body);
    setSaving(false);
    if (res.success) {
      setNotif({ type: 'success', text: 'Configuración guardada.' });
      setValues({ gemini: '', openrouter: '', mistral: '' });
      load();
    } else {
      setNotif({ type: 'error', text: res.error ?? 'Error al guardar.' });
    }
    setTimeout(() => setNotif(null), 4000);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Ajustes de IA</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Configura las API keys de los proveedores de inteligencia artificial.</p>
      </div>

      {notif && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: notif.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${notif.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, color: notif.type === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.85rem' }}>
          {notif.text}
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      ) : (
        <div className="card" style={{ padding: 24, maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <KeyRound size={18} color="#f59e0b" />
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Proveedores de IA</h2>
          </div>

          {PROVIDERS.map((p) => {
            const maskedValue = current?.[`${p.id}_api_key` as const];
            return (
              <div key={p.id} style={{ marginBottom: 18 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>{p.label}</span>
                  <span style={{ fontSize: '0.7rem', color: maskedValue ? '#86efac' : (p.id === 'gemini' && current?.gemini_env_fallback ? '#93c5fd' : 'var(--color-text-faint)') }}>
                    {maskedValue ? `Configurada (${maskedValue})` : p.id === 'gemini' && current?.gemini_env_fallback ? 'Usando secret del Worker' : 'No configurada'}
                  </span>
                </label>
                <input
                  type="password"
                  placeholder={maskedValue ? 'Dejar en blanco para no cambiar' : `Pega la API key de ${p.label}`}
                  value={values[p.id]}
                  onChange={(e) => setValues({ ...values, [p.id]: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: 4 }}>{p.help}</p>
              </div>
            );
          })}

          <div style={{ marginTop: 8, marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>Proveedor principal</label>
            <select
              value={primary}
              onChange={(e) => setPrimary(e.target.value as Provider)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: 4 }}>
              Si el proveedor principal falla o no tiene key configurada, el sistema intenta automáticamente con los demás.
            </p>
          </div>

          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
