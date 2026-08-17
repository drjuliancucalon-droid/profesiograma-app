import { useProfesiogramaStore } from '../../store/profesiogramaStore';
import { MomentoBadge } from '../../shared/ui/MomentoBadge';
import { EditableDiv } from '../../shared/ui/EditableDiv';

const EXAMENES = [
  { key: 'fisico', label: 'Examen Físico', color: '#93c5fd' },
  { key: 'osteomuscular', label: 'Osteomuscular', color: '#93c5fd' },
  { key: 'psicosensometrico', label: 'Psicosensométrico', color: '#a5b4fc' },
  { key: 'audiometria', label: 'Audiometría', color: '#a5b4fc' },
  { key: 'visiometria', label: 'Visiometría', color: '#a5b4fc' },
  { key: 'electrocardiograma', label: 'EKG', color: '#c4b5fd' },
  { key: 'glicemia', label: 'Glicemia', color: '#6ee7b7' },
  { key: 'perfilLipidico', label: 'Perfil Lipídico', color: '#6ee7b7' },
];

export function MatrizTable() {
  const { generatedData, updateCargo, toggleMomento } = useProfesiogramaStore();

  if (!generatedData.length) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
        <p>No hay datos generados. Ve a Configuración y genera el profesiograma.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tabla-medica">
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Cargo</th>
            <th>Perfil del Cargo</th>
            <th>Peligros y Riesgos</th>
            {EXAMENES.map(e => <th key={e.key} style={{ color: e.color }}>{e.label}</th>)}
            <th>Otros Labs</th>
          </tr>
        </thead>
        <tbody>
          {generatedData.map((row, idx) => (
            <tr key={idx}>
              <td><EditableDiv value={row.grupoOcupacional} onChange={v => updateCargo(idx, 'grupoOcupacional', v)} /></td>
              <td><strong style={{ fontFamily: "'Source Serif 4', serif", fontSize: '0.8rem' }}>{row.cargo}</strong></td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <EditableDiv value={row.perfilCargo?.descripcion} onChange={v => updateCargo(idx, 'perfilCargo.descripcion', v)} placeholder="Descripción..." />
                  <EditableDiv value={row.perfilCargo?.competencias} onChange={v => updateCargo(idx, 'perfilCargo.competencias', v)} placeholder="Competencias..." />
                </div>
              </td>
              <td><EditableDiv value={row.peligrosRiesgos} onChange={v => updateCargo(idx, 'peligrosRiesgos', v)} /></td>
              {EXAMENES.map(e => (
                <td key={e.key} style={{ textAlign: 'center' }}>
                  <MomentoBadge
                    data={(row.matriz as Record<string, Record<string, boolean>>)?.[e.key] ?? {}}
                    onChange={(key, val) => toggleMomento(idx, e.key, key, val)}
                  />
                  {(row.matrizObservaciones as Record<string, string>)?.[e.key] && (
                    <div style={{ fontSize: '0.58rem', color: 'var(--color-text-faint)', marginTop: 2 }}>
                      {(row.matrizObservaciones as Record<string, string>)[e.key]}
                    </div>
                  )}
                </td>
              ))}
              <td><EditableDiv value={row.matriz?.laboratorio} onChange={v => updateCargo(idx, 'matriz.laboratorio', v)} placeholder="Otros..." /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
