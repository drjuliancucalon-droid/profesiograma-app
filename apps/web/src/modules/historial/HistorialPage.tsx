import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Download, RefreshCw, Building2, ClipboardList, FileText } from 'lucide-react';
import { api } from '../../shared/lib/api';
import { useProfesiogramaStore } from '../../store/profesiogramaStore';
import type { CargoProfesiograma } from '@profesiograma/shared-types';

type Tab = 'profesiogramas' | 'empresas' | 'ordenes';

interface ProfesiogramaRow {
  id: string;
  empresa_nombre: string | null;
  fecha_emision: string;
  version: number;
  estado: string;
  creado_en: string;
}

interface EmpresaRow {
  id: string;
  nombre: string;
  nit: string | null;
  responsable: string | null;
  creado_en: string;
}

interface OrdenRow {
  id: string;
  empresa_nombre: string | null;
  cargo_nombre: string | null;
  tipo_momento: string;
  candidato_nombre: string | null;
  creado_en: string;
}

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'profesiogramas', label: 'Profesiogramas', icon: FileText },
  { id: 'empresas', label: 'Empresas', icon: Building2 },
  { id: 'ordenes', label: 'Órdenes', icon: ClipboardList },
];

export function HistorialPage() {
  const navigate = useNavigate();
  const { setGeneratedData, setEmpresaInfo, setProfesionalInfo, setSavedRecord } = useProfesiogramaStore();
  const [tab, setTab] = useState<Tab>('profesiogramas');
  const [profesiogramas, setProfesiogramas] = useState<ProfesiogramaRow[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cargando, setCargando] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ success: boolean; data?: ProfesiogramaRow[] }>('/profesiograma'),
      api.get<{ success: boolean; data?: EmpresaRow[] }>('/empresas'),
      api.get<{ success: boolean; data?: OrdenRow[] }>('/ordenes'),
    ]).then(([p, e, o]) => {
      if (p.success && p.data) setProfesiogramas(p.data);
      if (e.success && e.data) setEmpresas(e.data);
      if (o.success && o.data) setOrdenes(o.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cargarProfesiograma = async (id: string) => {
    setCargando(id);
    setErrorMsg(null);
    try {
      const res = await api.get<{
        success: boolean;
        data?: {
          empresa_id: string; profesional_id: string; fecha_emision: string;
          empresa?: { nombre: string; nit: string | null; responsable: string | null };
          profesional?: { nombre: string; cedula: string; titulo: string; licencia: string; celular: string; correo: string };
          cargos: Array<{ id: string; nombre_cargo: string; ia_raw_json: string }>;
        };
        error?: string;
      }>(`/profesiograma/${id}`);
      if (!res.success || !res.data) throw new Error(res.error ?? 'No se pudo cargar');

      const { data } = res;
      const generatedData: CargoProfesiograma[] = [];
      const cargoIds: Record<string, string> = {};
      for (const c of data.cargos) {
        try {
          generatedData.push(JSON.parse(c.ia_raw_json) as CargoProfesiograma);
        } catch {
          continue;
        }
        cargoIds[c.nombre_cargo] = c.id;
      }

      setEmpresaInfo({
        nombre: data.empresa?.nombre ?? '',
        nit: data.empresa?.nit ?? '',
        responsable: data.empresa?.responsable ?? '',
        fecha: data.fecha_emision ?? '',
      });
      setProfesionalInfo({
        nombre: data.profesional?.nombre ?? '',
        cedula: data.profesional?.cedula ?? '',
        titulo: data.profesional?.titulo ?? '',
        licencia: data.profesional?.licencia ?? '',
        celular: data.profesional?.celular ?? '',
        correo: data.profesional?.correo ?? '',
      });
      setGeneratedData(generatedData);
      setSavedRecord({ empresaId: data.empresa_id, profesionalId: data.profesional_id, profesiogramaId: id, cargoIds });

      navigate('/informe');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar el profesiograma.');
    } finally {
      setCargando(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700 }}>Historial</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Profesiogramas, empresas y órdenes guardados</p>
        </div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, borderBottom: `2px solid ${tab === t.id ? '#f59e0b' : 'transparent'}`, color: tab === t.id ? '#f59e0b' : 'var(--color-text-muted)', background: 'none' }}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : tab === 'profesiogramas' ? (
        profesiogramas.length === 0 ? (
          <EmptyState icon={FileText} text="No hay profesiogramas guardados aún." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profesiogramas.map((item) => (
              <div key={item.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.empresa_nombre ?? 'Empresa'}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                    {item.fecha_emision} · v{item.version} · <span style={{ color: item.estado === 'vigente' ? '#86efac' : 'var(--color-text-faint)' }}>{item.estado}</span>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => cargarProfesiograma(item.id)} disabled={cargando === item.id}>
                  <Download size={14} /> {cargando === item.id ? 'Cargando...' : 'Cargar'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : tab === 'empresas' ? (
        empresas.length === 0 ? (
          <EmptyState icon={Building2} text="No hay empresas guardadas aún." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {empresas.map((item) => (
              <div key={item.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.nombre}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                  {item.nit ? `NIT ${item.nit} · ` : ''}{item.responsable ? `Responsable: ${item.responsable}` : 'Sin responsable registrado'}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        ordenes.length === 0 ? (
          <EmptyState icon={ClipboardList} text="No hay órdenes de servicio guardadas aún." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ordenes.map((item) => (
              <div key={item.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.cargo_nombre ?? 'Cargo'} — {item.empresa_nombre ?? 'Empresa'}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                    {item.candidato_nombre ? `${item.candidato_nombre} · ` : ''}Motivo: {item.tipo_momento} · {new Date(item.creado_en).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-faint)' }}>
      <Icon size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
      <p>{text}</p>
    </div>
  );
}
