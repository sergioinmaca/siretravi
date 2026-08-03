import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface BuscadorUsuariosProps {
  onChange: (termino: string) => void;
  placeholder?: string;
}

export default function BuscadorUsuarios({ onChange, placeholder = 'Buscar por nickname, nombre o apellido...' }: BuscadorUsuariosProps) {
  const [valor, setValor] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      onChangeRef.current(valor.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [valor]);

  return (
    <div className="relative">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={valor}
        onChange={e => setValor(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-caracas-red/20 focus:border-caracas-red outline-none transition-all text-sm text-gray-700 placeholder-gray-400"
      />
    </div>
  );
}
