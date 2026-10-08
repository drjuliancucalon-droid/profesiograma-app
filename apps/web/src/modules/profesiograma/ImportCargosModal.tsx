import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Sparkles, X } from 'lucide-react';
import { api } from '../../shared/lib/api';
import { cleanCargos, MAX_CARGO_LENGTH } from '../../shared/lib/importCargos/extractCargos';
import { ImportError, readCargosFromFile, type ImportResult } from '../../shared/lib/importCargos/readers';

type Props = {
  file: File;
  /** Cargos que ya están en la lista, para no duplicarlos. */
  existing: string[];
  onAdd: (cargos: string[]) => void;
  onClose: () => void;
};

type Item = { text: string; selected: boolean };

const KIND_LABEL: Record<ImportResult['kind'], string> = {
  xlsx: 'Excel', csv: 'CSV', docx: 'Word', pdf: 'PDF',
};

export function ImportCargosModal({ file, existing, onAdd, onClose }: Props) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isReading, setIsReading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readCargosFromFile(file)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setItems(cleanCargos(res.cargos, existing).map((text) => ({ text, selected: true })));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ImportError ? err.message : 'No se pudo leer el archivo.');
      })
      .finally(() => { if (!cancelled) setIsReading(false); });
    return () => { cancelled = true; };
    // existing se usa solo al leer el archivo; no debe relanzar la lectura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectedCount = useMemo(() => items.filter((i) => i.selected && i.text.trim()).length, [items]);

  const toggle = (index: number) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  const edit = (index: number, text: string) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)));
  const remove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const analyzeWithAi = async () => {
    if (!result?.text) return;
    setIsAnalyzing(true);
    setAiMessage(null);
    try {
      const res = await api.post<{ success: boolean; data?: { cargos: string[] }; error?: string }>(
        '/profesiograma/extract-cargos',
        { texto: result.text },
      );
      if (!res.success || !res.data) {
        setAiMessage(res.error ?? 'La IA no pudo analizar el documento.');
        return;
      }
      const current = items.map((i) => i.text);
      const added = cleanCargos(res.data.cargos, [...current, ...existing]);
      setItems((prev) => [...prev, ...added.map((text) => ({ text, selected: true }))]);
      setAiMessage(added.length ? `La IA encontró ${added.length} cargo(s) adicionales.` : 'La IA no encontró cargos nuevos.');
    } catch {
      setAiMessage('No se pudo conectar con el servicio de IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAdd = () => {
    const chosen = cleanCargos(items.filter((i) => i.selected).map((i) => i.text), existing);
    onAdd(chosen);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-cargos-title"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '85dvh', display: 'flex', flexDirection: 'column', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 id="import-cargos-title" style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#f59e0b" /> Importar cargos
          </h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: 16, overflowWrap: 'anywhere' }}>
          {file.name}{result ? ` · ${KIND_LABEL[result.kind]}` : ''}
        </p>

        {isReading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Leyendo el archivo...
          </div>
        )}

        {error && <p role="alert" style={{ color: '#fca5a5', fontSize: '0.85rem', padding: '12px 0' }}>{error}</p>}

        {!isReading && !error && (
          <>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {items.length
                ? `Se detectaron ${items.length} cargo(s). Revisa, corrige o desmarca los que no correspondan.`
                : 'No se detectaron cargos automáticamente. Puedes pedirle a la IA que los busque en el documento.'}
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1, minHeight: 0, marginBottom: 12 }}>
              {items.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={item.selected} onChange={() => toggle(i)} aria-label={`Incluir ${item.text}`} />
                  <input
                    type="text"
                    value={item.text}
                    maxLength={MAX_CARGO_LENGTH}
                    onChange={(e) => edit(i, e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none', opacity: item.selected ? 1 : 0.5 }}
                  />
                  <button onClick={() => remove(i)} aria-label={`Quitar ${item.text}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginBottom: 12 }}>
              <button className="btn btn-ghost" onClick={analyzeWithAi} disabled={isAnalyzing || !result?.text} style={{ width: '100%', justifyContent: 'center' }}>
                {isAnalyzing
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analizando con IA...</>
                  : <><Sparkles size={15} /> Analizar con IA</>}
              </button>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: 6 }}>
                Opcional: envía el texto del documento al proveedor de IA configurado. No lo uses con documentos que contengan datos personales de pacientes.
              </p>
              {aiMessage && <p role="status" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6 }}>{aiMessage}</p>}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={isReading || selectedCount === 0}>
            Agregar {selectedCount > 0 ? `${selectedCount} cargo(s)` : 'seleccionados'}
          </button>
        </div>
      </div>
    </div>
  );
}
