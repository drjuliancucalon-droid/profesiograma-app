const MOMENTOS = ['I', 'P', 'R', 'PI', 'RL'] as const;

interface MomentoBadgeProps {
  data: Partial<Record<(typeof MOMENTOS)[number], boolean>>;
  onChange: (key: string, value: boolean) => void;
}

export function MomentoBadge({ data, onChange }: MomentoBadgeProps) {
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
      {MOMENTOS.map((m) => {
        const active = !!data[m];
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m, !active)}
            title={m}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              fontSize: '0.6rem',
              fontWeight: 700,
              border: `1px solid ${active ? '#f59e0b' : 'var(--color-border)'}`,
              background: active ? 'rgba(245,158,11,0.18)' : 'transparent',
              color: active ? '#f59e0b' : 'var(--color-text-faint)',
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
