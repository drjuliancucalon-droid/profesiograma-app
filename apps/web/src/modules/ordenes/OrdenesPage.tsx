import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ClipboardList, ShieldCheck, Loader2 } from 'lucide-react';
import { useProfesiogramaStore } from '../../store/profesiogramaStore';
import { EXAMENES_MATRIZ } from '../../shared/data/legal';
import { guardarProfesiograma } from '../../shared/lib/saveProfesiograma';
import { api, downloadFile } from '../../shared/lib/api';

const MOMENTOS = ['I', 'P', 'R', 'PI', 'RL'] as const;

export function OrdenesPage() {
  const { generatedData, empresaInfo, profesionalInfo, savedRecord, setSavedRecord } = useProfesiogramaStore();
  const [requestRole, setRequestRole] = useState('');
  const [requestType, setRequestType] = useState<(typeof MOMENTOS)[number]>('I');
  const [candidate, setCandidate] = useState({ name: '', id: '' });
  const [mandatoryExams, setMandatoryExams] = useState<string[]>([]);
  const [idealExams, setIdealExams] = useState<string[]>([]);
  const [activeExams, setActiveExams] = useState<string[]>([]);
  const [orderNumber] = useState(() => Math.floor(Math.random() * 10000));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!requestRole || !generatedData.length) return;
    const roleData = generatedData.find((d) => d.cargo === requestRole);
    if (!roleData) return;
    const matriz = (roleData.matriz as unknown as Record<string, Record<string, boolean> | string>) ?? {};
    const bas: string[] = [];
    for (const e of EXAMENES_MATRIZ) {
      const val = matriz[e.key];
      if (val && typeof val === 'object' && val[requestType]) bas.push(e.fullLabel);
    }
    if (typeof matriz.laboratorio === 'string' && matriz.laboratorio.length > 3) bas.push(matriz.laboratorio);
    setMandatoryExams(bas);
    setIdealExams(roleData.fundamentacion_tecnica?.electivos ?? []);
    setActiveExams(bas);
  }, [requestRole, requestType, generatedData]);

  const toggleExam = (name: string) => {
    setActiveExams((prev) => (prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]));
  };

  const handleGuardarEImprimir = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      let record = savedRecord;
      if (!record || !record.cargoIds[requestRole]) {
        record = await guardarProfesiograma(empresaInfo, profesionalInfo, generatedData);
        setSavedRecord(record);
      }
      const cargoId = record.cargoIds[requestRole];
      if (!cargoId) throw new Error('No se encontró el cargo guardado. Vuelve a guardar el profesiograma en Informe.');

      const res = await api.post<{ success: boolean; id?: string; error?: string }>('/ordenes', {
        profesiograma_id: record.profesiogramaId,
        empresa_id: record.empresaId,
        cargo_id: cargoId,
        tipo_momento: requestType,
        candidato_nombre: candidate.name || undefined,
        candidato_id: candidate.id || undefined,
        examenes_json: activeExams,
      });
      if (!res.success || !res.id) throw new Error(res.error ?? 'No se pudo guardar la orden');

      await downloadFile(`/pdf/ordenes/${res.id}/pdf`, `Orden-${requestRole || 'servicio'}.pdf`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar la orden.');
    } finally {
      setSaving(false);
    }
  };

  if (!generatedData.length) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
        <ClipboardList size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p>Genera un profesiograma primero para poder crear órdenes de servicio.</p>
        <Link to="/profesiograma" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Ir a Configuración</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 print:hidden h-fit">
        <h3 className="text-lg font-bold text-slate-100 mb-5 flex items-center gap-2">
          <ClipboardList size={18} className="text-indigo-400" /> Gestión Clínica
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">1. Seleccionar Cargo</label>
            <select
              className="w-full bg-slate-800 border border-slate-700 p-3 text-sm rounded-xl outline-none text-slate-200 font-bold"
              value={requestRole}
              onChange={(e) => setRequestRole(e.target.value)}
            >
              <option value="">-- Seleccionar --</option>
              {generatedData.map((d, i) => <option key={i} value={d.cargo}>{d.cargo}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">2. Motivo (Evento)</label>
            <div className="flex flex-wrap gap-2">
              {MOMENTOS.map((t) => (
                <button key={t} onClick={() => setRequestType(t)} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${requestType === t ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{t}</button>
              ))}
            </div>
          </div>
          {requestRole && (
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
              <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1 mb-2"><ShieldCheck size={12} /> Básicos sugeridos</label>
              <div className="space-y-1">
                {mandatoryExams.length ? mandatoryExams.map((ex, i) => (
                  <label key={i} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={activeExams.includes(ex)} onChange={() => toggleExam(ex)} className="accent-emerald-500" /> {ex}
                  </label>
                )) : <p className="text-xs text-slate-500 italic">Ninguno sugerido para este momento.</p>}
              </div>
              {idealExams.length > 0 && (
                <>
                  <label className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1 mt-3 mb-2">Electivos</label>
                  <div className="space-y-1">
                    {idealExams.map((ex, i) => (
                      <label key={i} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={activeExams.includes(ex)} onChange={() => toggleExam(ex)} className="accent-amber-500" /> {ex}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">3. Trabajador</label>
            <input placeholder="Nombre Completo" className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm outline-none mb-2 text-slate-200" value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} />
            <input placeholder="Cédula / ID" className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm outline-none text-slate-200" value={candidate.id} onChange={(e) => setCandidate({ ...candidate, id: e.target.value })} />
          </div>
          {errorMsg && <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg p-2">{errorMsg}</p>}
          <button onClick={handleGuardarEImprimir} disabled={!requestRole || !activeExams.length || saving} className="w-full bg-slate-950 border border-slate-700 text-white py-3 rounded-xl font-bold flex justify-center gap-2 hover:bg-slate-800 disabled:opacity-40 transition-all">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {saving ? 'Generando...' : 'Guardar y Descargar PDF'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-8 print:w-full">
        <div className="bg-slate-900 border border-slate-800 p-10 min-h-[700px] print:bg-white print:border-none print:p-0 flex flex-col rounded-2xl print:rounded-none">
          <div className="border-b-2 border-slate-700 pb-6 mb-8 flex justify-between items-end print:border-black">
            <div>
              <h2 className="text-2xl font-serif font-black uppercase tracking-wide text-slate-100 print:text-black">Orden de Servicio Clínico</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Res. 1843 de 2025 - MinTrabajo</p>
            </div>
            <div className="text-right text-[10px] font-mono text-slate-500 print:text-black">
              <p className="font-bold text-slate-200 print:text-black">N° OS-{orderNumber}</p>
              <p>Fecha: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 mb-8 text-xs border border-slate-700 p-5 rounded-xl bg-slate-800/40 print:border-black print:bg-transparent">
              <div><span className="block font-bold text-slate-500 uppercase text-[9px] mb-0.5">Empresa</span><span className="font-bold text-sm text-slate-100 print:text-black">{empresaInfo.nombre || '—'}</span></div>
              <div><span className="block font-bold text-slate-500 uppercase text-[9px] mb-0.5">Motivo</span><span className="font-bold text-sm text-indigo-400 print:text-black">{requestType}</span></div>
              <div><span className="block font-bold text-slate-500 uppercase text-[9px] mb-0.5">Paciente</span><span className="font-bold text-sm text-slate-100 uppercase print:text-black">{candidate.name || '________________'}</span></div>
              <div className="col-span-2 border-t border-slate-700 pt-3 mt-1 print:border-black"><span className="block font-bold text-slate-500 uppercase text-[9px] tracking-wider mb-0.5">Cargo a Evaluar</span><span className="font-bold text-base text-slate-100 uppercase print:text-black">{requestRole || '_________________________________'}</span></div>
            </div>
            <h3 className="font-bold text-slate-100 uppercase text-xs border-b-2 border-slate-700 pb-2 mb-4 print:text-black print:border-black">Panel Clínico Autorizado</h3>
            <table className="w-full text-xs border-collapse border border-slate-700 print:border-black">
              <thead>
                <tr className="bg-slate-800 text-left print:bg-slate-100"><th className="p-3 border border-slate-700 font-bold uppercase text-slate-200 print:text-black print:border-black">Examen / Prueba</th><th className="p-3 border border-slate-700 w-24 text-center print:border-black">Firma</th></tr>
              </thead>
              <tbody>
                {activeExams.length ? activeExams.map((exam, i) => (
                  <tr key={i}><td className="p-3 border border-slate-700 font-medium text-slate-300 print:text-black print:border-black">{exam}</td><td className="p-3 border border-slate-700 print:border-black" /></tr>
                )) : (
                  <tr><td colSpan={2} className="p-4 text-center text-slate-500 italic">Selecciona un cargo y momento para ver los exámenes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
