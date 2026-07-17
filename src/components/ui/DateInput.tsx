import { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function isValidDate(d: string, m: string, y: string): boolean {
  const date = new Date(+y, +m - 1, +d);
  return date.getDate() === +d && date.getMonth() === +m - 1;
}

export default function DateInput({
  value,
  onChange,
  label,
  required,
  disabled,
  className = '',
  placeholder = 'DD/MM/AAAA',
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const [localText, setLocalText] = useState(() => formatDisplay(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalText(formatDisplay(value));
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursor = input.selectionStart ?? 0;

    let raw = input.value.replace(/\D/g, '').slice(0, 8);

    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += raw[i];
    }

    setLocalText(formatted);

    const digitCountBefore = (input.value.slice(0, cursor).replace(/\D/g, '')).length;
    requestAnimationFrame(() => {
      let pos = 0;
      let digitIdx = 0;
      while (pos < formatted.length && digitIdx < digitCountBefore) {
        if (formatted[pos] !== '/') digitIdx++;
        pos++;
      }
      input.setSelectionRange(pos, pos);
    });

    if (raw.length === 8) {
      const d = raw.slice(0, 2);
      const m = raw.slice(2, 4);
      const y = raw.slice(4, 8);
      if (isValidDate(d, m, y)) {
        onChange(`${y}-${m}-${d}`);
      }
    }

    if (raw.length === 0) {
      onChange('');
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    setLocalText(formatDisplay(value));
  };

  const handleCalendarClick = () => {
    if (disabled) return;
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${disabled ? 'opacity-60' : ''}`}>
          {label}{required && <span className="text-caracas-red"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={textRef}
          type="text"
          inputMode="numeric"
          value={localText}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl pr-10 focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all ${
            disabled ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900'
          }`}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          tabIndex={-1}
        >
          <Calendar size={18} className="text-gray-400" />
        </button>
        <input
          ref={inputRef}
          type="date"
          lang="es"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
