import { useRef, useEffect } from 'react';

interface EditableDivProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EditableDiv({ value, onChange, placeholder }: EditableDivProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== (value ?? '')) {
      ref.current.innerText = value ?? '';
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.innerText)}
      data-placeholder={placeholder}
      className="editable-div"
      style={{
        fontSize: '0.78rem',
        outline: 'none',
        minHeight: '1.2em',
        color: 'var(--color-text)',
      }}
    />
  );
}
