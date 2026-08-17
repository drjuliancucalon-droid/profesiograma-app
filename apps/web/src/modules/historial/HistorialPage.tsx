import { useState, useEffect } from 'react';
import { History, Download, RefreshCw } from 'lucide-react';
import { api } from '../../shared/lib/api';

export function HistorialPage() {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data?: unknown[] }>('/profesiograma').then(res => {
      if (res.success && res.data) setData(res.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700 }}>Historial</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Profesiogramas guardados</p>
        </div>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}><RefreshCw size={16} /> Actualizar</button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
          <History size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No hay profesiogramas guardados aún.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(data as Record<string, string>[]).map((item, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.empresa_nombre ?? 'Empresa'}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{item.fecha_emision} · v{item.version} · <span style={{ color: item.estado === 'publicado' ? '#16a34a' : 'var(--color-text-faint)' }}>{item.estado}</span></div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem' }}><Download size={14} /> Cargar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
