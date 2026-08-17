import { useState } from 'react';
import { BrainCircuit, Plus, Trash2, Upload, Loader2, Download, Save } from 'lucide-react';
import { useProfesiogramaStore } from '../../store/profesiogramaStore';
import { api } from '../../shared/lib/api';
import { MatrizTable } from './MatrizTable';
import { EmpresaForm } from './EmpresaForm';
import type { CargoProfesiograma } from '@profesiograma/shared-types';

type Tab = 'config' | 'matriz' | 'ordenes';

export function ProfesiogramaGeneratorPage() {
  const {
    jobsList, addJob, removeJob, generatedData,
    setGeneratedData, isLoading, setLoading, error, setError,
    empresaInfo, profesionalInfo,
  } = useProfesiogramaStore();

  const [currentJob, setCurrentJob] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('config');
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

    for (const job of jobsList) {
      const existing = generatedData.find(d => d.cargo === job);
      if (existing) { results.push(existing); continue; }
      const res = await api.post<{ success: boolean; data?: CargoProfesiograma }>('/profesiograma/generate', { cargo: job });
      if (res.success && res.data) {
        results.push(res.data);
      } else {
        results.push({ grupoOcupacional: 'Revisar', cargo: job, perfilCargo: { descripcion: 'Error IA', competencias: '', requisitosFisicos: '' }, peligrosRiesgos: 'Revisar', matriz: { fisico: { I: true, P: false, R: false, PI: false, RL: false }, osteomuscular: { I: true, P: false, R: false, PI: false, RL: false }, psicosensometrico: { I: false, P: false, R: false, PI: false, RL: false }, audiometria: { I: false, P: false, R: false, PI: false, RL: false }, visiometria: { I: false, P: false, R: false, PI: false, RL: false }, electrocardiograma: { I: false, P: false, R: false, PI: false, RL: false }, glicemia: { I: false, P: false, R: false, PI: false, RL: false }, perfillipidico: { I: false, P: false, R: false, PI: false, RL: false }, laboratorio: '' }, matrizObservaciones: {}, fundamentacionTecnica: { porqueMomentos: 'Error IA', obligatorios: [], electivos: [] }, recomendacionesRestricciones: [] });
      }
    }
    setGeneratedData(results);
    setActiveTab('matriz');
    setLoading(false);
    showNotif('success', `Profesiograma generado: ${results.length} cargos`);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'config', label: '1. Configuración' },
    { id: 'matriz', label: '2. Matriz' },
    { id: 'ordenes', label: '3. Órdenes' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Generador de Profesiograma</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Motor IA · Resolución 1843/2025 · Colombia</p>
        </div>
        {generatedData.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => window.print()}><Download size={16} /> Exportar PDF</button>
          </div>
        )}
      </div>

      {notification && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: notification.type === 'success' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', border: `1px solid ${notification.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, color: notification.type === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.85rem' }}>
          {notification.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', borderBottom: `2px solid ${activeTab === t.id ? '#f59e0b' : 'transparent'}`, color: activeTab === t.id ? '#f59e0b' : 'var(--color-text-muted)', background: 'none', transition: 'all 180ms' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
          <EmpresaForm />
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}><BrainCircuit size={18} color="#f59e0b" /> Cargos a Analizar</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input type="text" value={currentJob} onChange={e => setCurrentJob(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddJob()} placeholder="Ej: Conductor, Auxiliar Administrativo..." style={{ flex: 1, padding: '8px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none' }} />
              <button className="btn btn-primary" onClick={handleAddJob} style={{ padding: '8px 16px' }}><Plus size={16} /></button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>
              <Upload size={15} /> Importar desde Excel/CSV/PDF
              <input type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: 'none' }} />
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
          </div>
        </div>
      )}

      {activeTab === 'matriz' && <MatrizTable />}

      {activeTab === 'ordenes' && (
        <div className="card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Módulo de Órdenes — Selecciona cargo y momento para generar orden de servicio.</p>
        </div>
      )}
    </div>
  );
}
