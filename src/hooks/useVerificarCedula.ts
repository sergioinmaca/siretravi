import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCampamento } from '../context/CampamentoContext';

type CedulaEstado = 'idle' | 'verificando' | 'valido' | 'duplicado';

export function useVerificarCedula(isEditing: boolean) {
  const { campamentos = [] } = useCampamento();
  const [estado, setEstado] = useState<CedulaEstado>('idle');
  const [nombreCampamento, setNombreCampamento] = useState<string | null>(null);

  const verificar = async (cedula: string) => {
    if (isEditing) return;
    if (!cedula.trim()) {
      setEstado('idle');
      return;
    }
    setEstado('verificando');
    try {
      const { data } = await supabase
        .from('refugiados')
        .select('campamento_id')
        .eq('cedula', parseInt(cedula))
        .or('hogar_solidario.is.null,hogar_solidario.neq.RETIRADO')
        .limit(1)
        .maybeSingle();
      if (data) {
        const camp = campamentos.find((c) => c.id === data.campamento_id);
        setNombreCampamento(camp?.nombre || 'otro campamento');
        setEstado('duplicado');
      } else {
        setEstado('valido');
      }
    } catch {
      setEstado('idle');
    }
  };

  const reset = () => {
    setEstado('idle');
    setNombreCampamento(null);
  };

  return { estado, nombreCampamento, verificar, reset };
}
