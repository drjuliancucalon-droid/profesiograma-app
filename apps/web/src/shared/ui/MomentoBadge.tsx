const MOMENTOS = [
  { key: 'I', color: '#60a5fa' },
  { key: 'P', color: '#34d399' },
  { key: 'R', color: '#f59e0b' },
  { key: 'PI', color: '#a78bfa' },
  { key: 'RL', color: '#f472b6' },
] as const;

interface MomentoBadgeProps {
  data: Partial<Record<(typeof MOMENTOS)[number]['key'], boolean>>;
  onChange: (key: string, value: boolean) => void;
}

export function MomentoBadge({ data, onChange }: MomentoBadgeProps) {
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
      {MOMENTOS.map(({ key: m, color }) => {
        const active = !!data[m];
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m, !active)}
            title={m}
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              fontSize: '0.58rem',
              fontWeight: 700,
              border: `1px solid ${active ? color : 'var(--color-border)'}`,
              background: active ? `${color}26` : 'transparent',
              color: active ? color : 'var(--color-text-faint)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
