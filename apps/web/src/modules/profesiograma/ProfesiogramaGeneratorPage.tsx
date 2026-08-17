import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { useProfesiogramaStore } from '../../store/profesiogramaStore';
import { api } from '../../shared/lib/api';
import { EmpresaForm } from './EmpresaForm';
import type { CargoProfesiograma } from '@profesiograma/shared-types';

export function ProfesiogramaGeneratorPage() {
  const navigate = useNavigate();
  const {
    jobsList, addJob, removeJob, generatedData,
    setGeneratedData, isLoading, setLoading, error, setError,
  } = useProfesiogramaStore();

  const [currentJob, setCurrentJob] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotif = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddJob = () => {
    if (currentJob.trim()) { addJob(currentJob.trim()); setCurrentJob(''); }
  };

  const handleGenerate = async () => {
    if (!jobsList.length) { setError('Agrega al menos un cargo.'); return; }
    setLoading(true);
    setError(null);
    const results: CargoProfesiograma[] = [];
    let quotaHit = false;

    for (const [i, job] of jobsList.entries()) {
      const existing = generatedData.find(d => d.cargo === job && d.grupo_ocupacional !== 'Revisión Manual');
      if (existing) { results.push(existing); continue; }

      if (quotaHit) {
        results.push(buildErrorCargo(job, 'No se intentó: se alcanzó el límite de solicitudes por minuto del proveedor de IA. Vuelve a generar en unos minutos.'));
        continue;
      }

      if (i > 0) await new Promise((r) => setTimeout(r, 1500));

      const res = await api.post<{ success: boolean; data?: CargoProfesiograma; error?: string }>('/profesiograma/generate', { cargo: job });
      if (res.success && res.data) {
        results.push(res.data);
      } else {
        if (res.error && /quota|429|RESOURCE_EXHAUSTED/i.test(res.error)) quotaHit = true;
        results.push(buildErrorCargo(job, res.error ?? 'Error de IA en este cargo. Edita manualmente o vuelve a generar.'));
      }
    }
    setGeneratedData(results);
    setLoading(false);
    if (quotaHit) {
      showNotif('error', 'Se alcanzó el límite de solicitudes del proveedor de IA. Algunos cargos no se generaron — revisa Ajustes o intenta de nuevo en unos minutos.');
    } else {
      showNotif('success', `Profesiograma generado: ${results.length} cargos`);
    }
    navigate('/informe');
  };

  function buildErrorCargo(job: string, motivo: string): CargoProfesiograma {
    return {
      grupo_ocupacional: 'Revisión Manual',
      cargo: job,
      perfil_cargo: { descripcion: motivo, competencias: '', requisitos_fisicos: '' },
      peligros_riesgos: 'Revisar',
      matriz: {
        fisico: { I: true, P: false, R: false, PI: false, RL: false },
        osteomuscular: { I: true, P: false, R: false, PI: false, RL: false },
        psicosensometrico: { I: false, P: false, R: false, PI: false, RL: false },
        audiometria: { I: false, P: false, R: false, PI: false, RL: false },
        visiometria: { I: false, P: false, R: false, PI: false, RL: false },
        electrocardiograma: { I: false, P: false, R: false, PI: false, RL: false },
        glicemia: { I: false, P: false, R: false, PI: false, RL: false },
        perfil_lipidico: { I: false, P: false, R: false, PI: false, RL: false },
        laboratorio: '',
      },
      matriz_observaciones: {},
      fundamentacion_tecnica: { por_que_momentos: 'Vuelve a hacer clic en "Generar Profesiograma" para reintentar este cargo.', obligatorios: [], electivos: [] },
      recomendaciones_restricciones: [],
    };
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Configuración del Profesiograma</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Motor IA · Resolución 1843/2025 · Colombia</p>
      </div>

      {notification && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: notification.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${notification.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, color: notification.type === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.85rem' }}>
          {notification.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
        <EmpresaForm />
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}><BrainCircuit size={18} color="#f59e0b" /> Cargos a Analizar</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input type="text" value={currentJob} onChange={e => setCurrentJob(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddJob()} placeholder="Ej: Conductor, Auxiliar Administrativo..." style={{ flex: 1, padding: '8px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none' }} />
            <button className="btn btn-primary" onClick={handleAddJob} style={{ padding: '8px 16px' }}><Plus size={16} /></button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>
            <Upload size={15} /> Importar desde Excel/CSV/PDF (próximamente)
            <input type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: 'none' }} disabled />
          </label>
          {jobsList.length > 0 ? (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {jobsList.map((job, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{job}</span>
                  <button onClick={() => removeJob(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label={`Eliminar ${job}`}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-faint)' }}>
              <BrainCircuit size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.85rem' }}>Agrega los cargos a analizar</p>
            </div>
          )}
          {error && <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isLoading || !jobsList.length} style={{ width: '100%', justifyContent: 'center', marginTop: 16, opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando con IA...</> : <><BrainCircuit size={16} /> Generar Profesiograma ({jobsList.length} cargos)</>}
          </button>
          {generatedData.length > 0 && (
            <button className="btn btn-ghost" onClick={() => navigate('/informe')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              Ver Informe Generado ({generatedData.length} cargos)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
