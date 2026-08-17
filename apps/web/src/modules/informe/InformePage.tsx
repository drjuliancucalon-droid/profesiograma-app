import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, BrainCircuit } from 'lucide-react';
import { useProfesiogramaStore } from '../../store/profesiogramaStore';
import { EditableDiv } from '../../shared/ui/EditableDiv';
import { MomentoBadge } from '../../shared/ui/MomentoBadge';
import { MARCO_LEGAL, DESCRIPCION_PRUEBAS, INSTRUCTIVO_STEPS, EXAMENES_MATRIZ } from '../../shared/data/legal';

type Section = 'all' | 'presentacion' | 'matriz' | 'recomendaciones' | 'pruebas' | 'legal';

const TABS: { id: Section; label: string }[] = [
  { id: 'presentacion', label: '⭐ Presentación' },
  { id: 'matriz', label: '📊 Matriz' },
  { id: 'recomendaciones', label: '⚠️ Restricciones' },
  { id: 'pruebas', label: '💉 Pruebas' },
  { id: 'legal', label: '⚖️ Legal' },
];

export function InformePage() {
  const { generatedData, empresaInfo, profesionalInfo, logoStyles, setLogoStyles, updateCargo, toggleMomento } = useProfesiogramaStore();
  const [section, setSection] = useState<Section>('all');

  if (!generatedData.length) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
        <BrainCircuit size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <p>No hay un profesiograma generado todavía.</p>
        <Link to="/profesiograma" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Ir a Configuración</Link>
      </div>
    );
  }

  const show = (id: Section) => section === id || section === 'all';

  return (
    <div>
      <div className="flex flex-wrap border-b border-slate-700 mb-6 print:hidden gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${section === t.id || section === 'all' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => setSection('all')} className="px-4 py-3 text-sm font-bold border-b-2 border-transparent text-indigo-400 hover:text-indigo-300">
          Mostrar Todo (Imprimir)
        </button>
      </div>

      {section === 'all' && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
          <div>
            <h3 className="font-black text-lg text-indigo-300">Preparación de Impresión</h3>
            <p className="text-sm text-slate-400 mt-1">Haz clic en los textos para editarlos directamente antes de imprimir.</p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => window.print()} className="bg-slate-950 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all text-sm">
              <Printer size={15} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      )}

      {/* PRESENTACIÓN */}
      <div className={show('presentacion') ? 'block' : 'hidden print:block'}>
        <div className="print-section-container mb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            <div
              className="md:col-span-5 bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-900/20 rounded-3xl p-8 flex flex-col justify-center border border-amber-800/40 shadow-xl relative print:border-2 print:border-black print:bg-white min-h-[250px]"
              style={{ alignItems: logoStyles.align === 'left' ? 'flex-start' : logoStyles.align === 'right' ? 'flex-end' : 'center' }}
            >
              {empresaInfo.logo ? (
                <div className="relative group w-full flex" style={{ justifyContent: logoStyles.align === 'left' ? 'flex-start' : logoStyles.align === 'right' ? 'flex-end' : 'center' }}>
                  <img src={empresaInfo.logo} alt="Logo" style={{ height: `${logoStyles.size}px`, marginTop: `${logoStyles.marginY}px` }} className="max-w-full object-contain mb-6 bg-white p-3 rounded-2xl shadow-sm print:border print:border-black" />
                  <div className="absolute top-0 right-0 translate-x-full opacity-0 group-hover:opacity-100 print:hidden flex flex-col gap-1 p-2 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-10 transition-opacity">
                    <button onClick={() => setLogoStyles({ size: logoStyles.size + 10 })} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="Aumentar"><ZoomIn size={14} /></button>
                    <button onClick={() => setLogoStyles({ size: Math.max(30, logoStyles.size - 10) })} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="Reducir"><ZoomOut size={14} /></button>
                    <div className="h-px bg-slate-700 my-1" />
                    <button onClick={() => setLogoStyles({ align: 'left' })} className="p-1 hover:bg-slate-700 rounded text-slate-300"><AlignLeft size={14} /></button>
                    <button onClick={() => setLogoStyles({ align: 'center' })} className="p-1 hover:bg-slate-700 rounded text-slate-300"><AlignCenter size={14} /></button>
                    <button onClick={() => setLogoStyles({ align: 'right' })} className="p-1 hover:bg-slate-700 rounded text-slate-300"><AlignRight size={14} /></button>
                    <div className="h-px bg-slate-700 my-1" />
                    <button onClick={() => setLogoStyles({ marginY: logoStyles.marginY + 10 })} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="Mover Abajo"><ArrowDown size={14} /></button>
                    <button onClick={() => setLogoStyles({ marginY: logoStyles.marginY - 10 })} className="p-1 hover:bg-slate-700 rounded text-slate-300" title="Mover Arriba"><ArrowUp size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="h-24 w-48 bg-white/5 border-2 border-dashed border-amber-700 rounded-2xl mb-6 flex flex-col items-center justify-center text-amber-500 font-bold text-xs print:hidden self-center">
                  Logo de la Empresa
                </div>
              )}
              <h1 className="text-2xl md:text-3xl font-black text-amber-500 tracking-wide uppercase mb-2 print:text-black self-center text-center break-words">Profesiograma</h1>
              <div className="text-xl font-bold text-slate-200 uppercase italic text-center px-4 self-center w-full print:text-black">{empresaInfo.nombre || 'Empresa'}</div>
            </div>
            <div className="md:col-span-7 pl-4 md:pl-8 border-l-2 border-slate-700 flex flex-col justify-center print:border-black">
              <h2 className="text-3xl font-black text-sky-400 tracking-wide uppercase mb-6 print:text-black">Objetivos</h2>
              <ul className="space-y-5">
                <li className="flex gap-4 items-start">
                  <div className="w-3 h-3 mt-1.5 rounded-full bg-sky-400 shrink-0 print:border print:border-black print:bg-transparent" />
                  <p className="text-[15px] text-slate-300 leading-relaxed font-medium print:text-black text-justify">
                    Presentar los requisitos de las evaluaciones médicas ocupacionales para los trabajadores de la empresa <strong className="uppercase">{empresaInfo.nombre}</strong> con base en el perfil del cargo y los riesgos ocupacionales.
                  </p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="w-3 h-3 mt-1.5 rounded-full bg-sky-400 shrink-0 print:border print:border-black print:bg-transparent" />
                  <p className="text-[15px] text-slate-300 leading-relaxed font-medium print:text-black">Definir los criterios técnicos de las evaluaciones.</p>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="w-3 h-3 mt-1.5 rounded-full bg-sky-400 shrink-0 print:border print:border-black print:bg-transparent" />
                  <p className="text-[15px] text-slate-300 leading-relaxed font-medium print:text-black">Presentar las principales restricciones que pueden darse por tipo de evaluación.</p>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-6 flex justify-end text-xs text-slate-400 font-mono">
            <span><strong>Fecha de Emisión:</strong> {empresaInfo.fecha || '—'}</span>
          </div>
          <div className="mt-20 grid grid-cols-2 gap-32 print:flex print:justify-between break-inside-avoid px-12">
            <div className="text-center w-full max-w-xs mx-auto">
              <div className="border-b-2 border-slate-500 mb-4" />
              <p className="font-serif font-bold text-lg text-slate-100 print:text-black">{empresaInfo.responsable}</p>
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-bold mt-2">Responsable SG-SST (Empresa)</p>
            </div>
            <div className="text-center w-full max-w-xs mx-auto">
              <div className="border-b-2 border-slate-500 mb-4" />
              <div className="text-sm">
                <p className="font-serif font-bold text-slate-100 print:text-black">{profesionalInfo.nombre || 'Dr. / Especialista SST'}</p>
                {profesionalInfo.titulo && <p className="text-slate-400 print:text-black text-xs mt-1 leading-tight">{profesionalInfo.titulo}</p>}
                {profesionalInfo.cedula && <p className="text-slate-500 print:text-black text-[10px] mt-1">C.C. {profesionalInfo.cedula}</p>}
                {profesionalInfo.licencia && <p className="text-slate-500 print:text-black text-[10px]">Lic. {profesionalInfo.licencia}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="print:block page-break hidden" />

      {/* MATRIZ */}
      <div className={show('matriz') ? 'block' : 'hidden print:block'}>
        <div className="print-section-container">
          <h2 className="text-xl font-serif font-bold uppercase tracking-wide text-slate-100 border-b border-slate-700 pb-4 mb-6 print:text-black print:border-black">1. Matriz de Evaluaciones Médicas (I-P-R-PI-RL)</h2>
          <div className="matriz-table-container overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 print:border-black">
            <table className="matriz-table border-collapse bg-slate-950" style={{ width: '100%', minWidth: 1400 }}>
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-300 text-center print:text-black">
                  <th className="bg-slate-800 p-3 border border-slate-700 font-bold print:bg-slate-100 print:border-black text-left" style={{ minWidth: 130 }}>Grupo Ocupacional</th>
                  <th className="bg-slate-800 p-3 border border-slate-700 font-bold print:bg-slate-100 print:border-black text-left" style={{ minWidth: 140 }}>Cargo</th>
                  <th className="bg-slate-800 p-3 border border-slate-700 font-bold print:bg-slate-100 print:border-black text-left" style={{ minWidth: 260 }}>Perfil del Cargo</th>
                  <th className="bg-slate-800 p-3 border border-slate-700 font-bold print:bg-slate-100 print:border-black text-left" style={{ minWidth: 220 }}>Peligros y Riesgos</th>
                  {EXAMENES_MATRIZ.map((e) => (
                    <th key={e.key} className="bg-indigo-950 p-2 border border-indigo-900 text-indigo-200 print:bg-slate-300 print:text-black print:border-black" style={{ minWidth: 150 }}>{e.label}</th>
                  ))}
                  <th className="bg-emerald-950 p-2 border border-emerald-900 text-emerald-200 print:bg-slate-300 print:text-black print:border-black" style={{ minWidth: 150 }}>Otros Labs</th>
                </tr>
              </thead>
              <tbody>
                {generatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors break-inside-avoid">
                    <td className="border border-slate-700 p-3 align-top bg-slate-900 break-words font-bold text-slate-200 text-xs print:text-black print:border-black print:bg-white">{row.grupo_ocupacional}</td>
                    <td className="border border-slate-700 p-3 align-top break-words font-serif font-black text-sm text-slate-100 leading-snug print:text-black print:border-black">{row.cargo}</td>
                    <td className="border border-slate-700 p-3 align-top break-words print:border-black">
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 print:text-black leading-snug"><strong className="text-slate-200 print:text-black">Descripción:</strong> {row.perfil_cargo?.descripcion}</div>
                        <div className="text-xs text-slate-400 print:text-black leading-snug pt-1.5 border-t border-slate-800"><strong className="text-slate-200 print:text-black">Competencias:</strong> {row.perfil_cargo?.competencias}</div>
                        <div className="text-xs text-slate-400 print:text-black leading-snug pt-1.5 border-t border-slate-800"><strong className="text-slate-200 print:text-black">Físico:</strong> {row.perfil_cargo?.requisitos_fisicos}</div>
                      </div>
                    </td>
                    <td className="border border-slate-700 p-3 align-top break-words text-xs text-slate-400 print:text-black leading-snug text-justify print:border-black">{row.peligros_riesgos}</td>
                    {EXAMENES_MATRIZ.map((e) => (
                      <td key={e.key} className="border border-slate-700 align-top p-2 text-center bg-slate-950 print:border-black print:bg-white">
                        <MomentoBadge
                          data={(row.matriz as unknown as Record<string, Record<string, boolean>>)?.[e.key] ?? {}}
                          onChange={(mk, val) => toggleMomento(idx, e.key, mk, val)}
                        />
                        <EditableDiv
                          value={(row.matriz_observaciones as unknown as Record<string, string>)?.[e.key]}
                          onChange={(val) => updateCargo(idx, `matriz_observaciones.${e.key}`, val)}
                          placeholder="Añadir..."
                        />
                      </td>
                    ))}
                    <td className="border border-slate-700 align-top p-2 text-center bg-emerald-950/20 print:border-black print:bg-white">
                      <EditableDiv value={row.matriz?.laboratorio} onChange={(val) => updateCargo(idx, 'matriz.laboratorio', val)} placeholder="Nombre Lab..." />
                      <EditableDiv value={row.matriz_observaciones?.laboratorio} onChange={(val) => updateCargo(idx, 'matriz_observaciones.laboratorio', val)} placeholder="Añadir..." />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-6 p-2 rounded-lg bg-slate-800/60 border border-slate-700 print:bg-transparent print:border-none text-[9px] font-bold text-slate-300 uppercase tracking-widest print:text-black break-inside-avoid">
            <span><span className="text-blue-400 print:text-black font-black">I:</span> Ingreso</span>
            <span><span className="text-emerald-400 print:text-black font-black">P:</span> Periódico</span>
            <span><span className="text-amber-400 print:text-black font-black">R:</span> Retiro</span>
            <span><span className="text-purple-400 print:text-black font-black">PI:</span> Post-Incapacidad</span>
            <span><span className="text-pink-400 print:text-black font-black">RL:</span> Retorno Laboral</span>
          </div>

          <div className="mt-6 space-y-4 break-inside-avoid">
            <div className="bg-slate-950 text-white p-3 rounded-t-xl flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] print:bg-slate-200 print:text-black print:border print:border-black border border-slate-800">
              <span className="text-amber-500">🧠</span> Fundamentación Técnica de la Conducta Médica
            </div>
            <div className="border border-slate-800 rounded-b-xl overflow-hidden print:border-black">
              {generatedData.map((row, idx) => (
                <div key={idx} className="p-4 border-b border-slate-800 last:border-0 print:border-black">
                  <h4 className="text-indigo-300 font-black text-xs mb-2 uppercase print:text-black">{row.cargo}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[9.5px]">
                    <div className="text-slate-400 text-justify italic print:text-black leading-relaxed">
                      <strong className="text-slate-200 block mb-1 uppercase text-[8px] not-italic print:text-black">Justificación de Periodicidad y Momentos:</strong>
                      <EditableDiv value={row.fundamentacion_tecnica?.por_que_momentos} onChange={(val) => updateCargo(idx, 'fundamentacion_tecnica.por_que_momentos', val)} />
                    </div>
                    <div className="space-y-2">
                      <div className="bg-emerald-950/30 p-2 rounded border border-emerald-900 print:bg-transparent print:border-black">
                        <strong className="text-emerald-400 block text-[8px] uppercase print:text-black mb-1">OBLIGATORIOS:</strong>
                        <span className="text-emerald-300 print:text-black font-medium">{(row.fundamentacion_tecnica?.obligatorios ?? []).join(', ') || '—'}</span>
                      </div>
                      <div className="bg-amber-950/30 p-2 rounded border border-amber-900 print:bg-transparent print:border-black">
                        <strong className="text-amber-400 block text-[8px] uppercase print:text-black mb-1">ELECTIVOS:</strong>
                        <span className="text-amber-300 print:text-black font-medium">{(row.fundamentacion_tecnica?.electivos ?? []).join(', ') || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="print:block page-break hidden" />

      {/* RESTRICCIONES */}
      <div className={show('recomendaciones') ? 'block' : 'hidden print:block'}>
        <div className="print-section-container">
          <h2 className="text-xl font-serif font-bold uppercase tracking-wide text-slate-100 border-b border-slate-700 pb-4 mb-2 print:text-black print:border-black">2. Recomendaciones y Restricciones Laborales</h2>
          <p className="text-xs text-slate-500 mb-6 font-bold tracking-widest uppercase">Según Res. 1843/2025, se omiten conceptos de "No Apto".</p>
          <div className="grid grid-cols-1 gap-8">
            {generatedData.map((row, idx) => (
              <div key={idx} className="border border-slate-700 rounded-2xl overflow-hidden break-inside-avoid print:border-black">
                <div className="bg-slate-950 p-4 text-white print:bg-slate-200 print:text-black">
                  <h3 className="font-serif font-bold text-lg">{row.cargo}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 uppercase tracking-wider text-[8px] print:bg-slate-100 print:text-black">
                        <th className="p-3 border-b border-r border-slate-700 w-[20%] print:border-black">Factor / Condición</th>
                        <th className="p-3 border-b border-r border-slate-700 w-[25%] print:border-black">Recomendaciones</th>
                        <th className="p-3 border-b border-r border-slate-700 w-[25%] print:border-black">Restricciones</th>
                        <th className="p-3 border-b border-r border-slate-700 w-[15%] print:border-black">Temporalidad</th>
                        <th className="p-3 border-b border-slate-700 w-[15%] print:border-black">Seguimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.recomendaciones_restricciones?.length ? (
                        row.recomendaciones_restricciones.map((rec, i) => (
                          <tr key={i} className="hover:bg-slate-800/40 break-inside-avoid">
                            <td className="p-3 border-b border-r border-slate-800 font-bold text-slate-200 print:text-black print:border-black">{rec.factor_riesgo}<br /><span className="text-[9px] font-normal text-slate-500">{rec.condicion}</span></td>
                            <td className="p-3 border-b border-r border-slate-800 text-slate-300 print:text-black print:border-black">{rec.recomendaciones}</td>
                            <td className="p-3 border-b border-r border-slate-800 text-amber-400 font-medium print:text-black print:border-black">{rec.restricciones}</td>
                            <td className="p-3 border-b border-r border-slate-800 text-slate-400 text-[10px] print:text-black print:border-black">{rec.temporalidad}</td>
                            <td className="p-3 border-b border-slate-800 text-slate-400 text-[10px] print:text-black print:border-black">{rec.seguimiento}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">No hay restricciones estructuradas para este cargo.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="print:block page-break hidden" />

      {/* PRUEBAS */}
      <div className={show('pruebas') ? 'block' : 'hidden print:block'}>
        <div className="print-section-container">
          <h2 className="text-xl font-serif font-bold uppercase tracking-wide text-slate-100 border-b border-slate-700 pb-4 mb-6 print:text-black print:border-black">3. Descripción de Pruebas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DESCRIPCION_PRUEBAS.map((p, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-700 p-6 rounded-xl break-inside-avoid print:border-black">
                <h3 className="font-serif font-bold text-slate-100 border-b-2 border-slate-800 pb-2 mb-3 text-lg print:text-black">{p.prueba}</h3>
                <p className="text-xs text-slate-300 mb-3 print:text-black"><span className="font-bold uppercase text-[10px] tracking-wider">Objetivo:</span> {p.objetivo}</p>
                <div className="bg-slate-800/60 text-slate-400 text-xs p-3 rounded-lg border border-slate-700 print:text-black">
                  <span className="font-bold text-amber-500 uppercase text-[10px] tracking-widest block mb-1">Indicación Clínica</span>
                  {p.indicacion}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="print:block page-break hidden" />

      {/* LEGAL */}
      <div className={show('legal') ? 'block' : 'hidden print:block'}>
        <div className="print-section-container">
          <h2 className="text-xl font-serif font-bold uppercase tracking-wide text-slate-100 border-b border-slate-700 pb-4 mb-6 print:text-black print:border-black">4. Marco Normativo Vigente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {MARCO_LEGAL.map((ley, idx) => (
              <div key={idx} className="border border-slate-700 rounded-xl p-6 bg-slate-900 break-inside-avoid print:border-black">
                <h4 className="font-bold text-slate-100 text-sm mb-1 print:text-black">{ley.norma}</h4>
                <h5 className="text-[10px] font-bold text-amber-500 mb-2 uppercase tracking-widest">{ley.titulo}</h5>
                <p className="text-xs text-slate-400 text-justify print:text-black">{ley.descripcion}</p>
              </div>
            ))}
          </div>
          <h2 className="text-xl font-serif font-bold uppercase tracking-wide text-slate-100 border-b border-slate-700 pb-4 mb-6 print:text-black print:border-black">5. Instructivo de Aplicación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {INSTRUCTIVO_STEPS.map((step, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-700 text-white p-5 rounded-xl print:bg-white print:text-black print:border-black break-inside-avoid">
                <h4 className="font-bold text-amber-500 print:text-slate-900 mb-1">{step.paso}</h4>
                <p className="text-xs text-slate-400 print:text-slate-700">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
