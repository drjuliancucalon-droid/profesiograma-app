export const MARCO_LEGAL = [
  { norma: 'Resolución 1843 de 2025', titulo: 'Regulación Evaluaciones Médicas Ocupacionales', descripcion: "Deroga Res. 2346/07. Concepto de 'Perfil de Cargo' obligatorio. Duración mínima de consulta: 20 min. Prohibición de término 'No Apto'. Custodia de HC por IPS/médico (20 años mínimo), NO por empleador." },
  { norma: 'Sentencia T-202 de 2024 / Ley 2114', titulo: 'Medidas Antidiscriminatorias', descripcion: 'Se prohíbe exigir pruebas de Embarazo, VIH o Serología (VDRL) para ingreso. Son consideradas medidas discriminatorias.' },
  { norma: 'Decreto 1072 de 2015', titulo: 'Decreto Único Reglamentario SST', descripcion: 'Obliga a fundamentar exámenes estrictamente en el Perfil del Cargo y la Matriz de Peligros (IPVR).' },
  { norma: 'Resolución 4272 de 2021', titulo: 'Trabajo en Alturas', descripcion: 'Exige Perfil Lipídico, Glicemia, Visiometría y Test de Vértigo. Restricción estricta IMC > 35 y peso > 110kg.' },
  { norma: 'Res. 20223040040595 de 2022', titulo: 'PESV (Conductores)', descripcion: 'Obligatoriedad de pruebas psicosensométricas, médicas y visuales para certificar aptitud.' },
] as const;

export const DESCRIPCION_PRUEBAS = [
  { prueba: 'Examen Médico Completo', objetivo: 'Evaluación completa incluyendo antecedentes. Físico general.', indicacion: 'Anual para riesgos altos, 2-3 años para moderados. Mínimo 20 min de consulta.' },
  { prueba: 'Examen Osteomuscular', objetivo: 'Evaluación de articulaciones, postura, rango de movimiento.', indicacion: 'Obligatorio para manipulación de cargas o posturas prolongadas.' },
  { prueba: 'Audiometría Tonal', objetivo: 'Evaluar umbral auditivo (0.5 a 8 kHz).', indicacion: 'Expuestos a ruido >80 dB(A). Reposo auditivo 12h requerido en Ingreso/Retiro.' },
  { prueba: 'Optometría / Visiometría', objetivo: 'Agudeza visual, percepción de colores, profundidad.', indicacion: 'Conductores, Trabajo en Alturas, Operativos con maquinaria de precisión.' },
  { prueba: 'Prueba Psicosensométrica', objetivo: 'Coordinación motriz, atención, tiempo de reacción.', indicacion: 'Obligatorio Conductores y operadores de maquinaria pesada.' },
  { prueba: 'Espirometría', objetivo: 'Capacidad pulmonar, detectar patrones obstructivos/restrictivos.', indicacion: 'Exposición a químicos, polvos, humos. No requiere ayuno.' },
  { prueba: 'Electrocardiograma (EKG)', objetivo: 'Registro de actividad eléctrica cardiaca.', indicacion: 'Trabajo en alturas, espacios confinados, conductores >50 años.' },
  { prueba: 'Glicemia / Perfil Lipídico', objetivo: 'Nivel de glucosa, colesterol, triglicéridos.', indicacion: 'Prevención de riesgo cardiovascular (Conductores, Alturas). Ayuno de 8-12h.' },
  { prueba: 'Cuadro Hemático', objetivo: 'Hemoglobina, plaquetas, infecciones.', indicacion: 'Exposición a químicos o radiaciones ionizantes.' },
  { prueba: 'Pruebas Embarazo / VIH', objetivo: 'Condiciones de salud específicas.', indicacion: 'PROHIBIDO como filtro. Solo con indicación médica y consentimiento informado.' },
] as const;

export const INSTRUCTIVO_STEPS = [
  { paso: '1. Identificar Cargo', desc: 'Ubicar el grupo ocupacional y revisar responsabilidades, competencias y riesgos en la matriz.' },
  { paso: '2. Consultar Matriz', desc: 'Verificar exámenes según modalidad: I (Ingreso), P (Periódico), R (Retiro), PI (Post-Incapacidad), RL (Retorno Laboral).' },
  { paso: '3. Generar Orden', desc: "Emitir remisión exacta desde el sistema. NO pedir exámenes 'por si acaso'." },
  { paso: '4. Gestión Post-Examen', desc: "El empleador tiene 20 días hábiles para implementar las recomendaciones. No existe concepto 'No Apto'." },
] as const;

export const EXAMENES_MATRIZ = [
  { key: 'fisico', label: 'Físico' },
  { key: 'osteomuscular', label: 'Osteomus...' },
  { key: 'psicosensometrico', label: 'Psicosenso...' },
  { key: 'audiometria', label: 'Audio...' },
  { key: 'visiometria', label: 'Visio...' },
  { key: 'electrocardiograma', label: 'EKG' },
  { key: 'glicemia', label: 'Glicemia' },
  { key: 'perfil_lipidico', label: 'Lípidos' },
] as const;
