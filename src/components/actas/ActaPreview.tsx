import { useMemo } from 'react';

interface ActaPreviewProps {
  contenido: string;
  sistema: Record<string, string>;
  valores: Record<string, string>;
}

const SISTEMA_VARS: Record<string, string> = {
  fecha_actual: 'fecha actual del sistema',
  nombre_campamento: 'nombre del campamento',
  direccion_campamento: 'dirección del campamento',
  nombre_completo_integrante: 'nombre completo del integrante',
  cedula_integrante: 'cédula del integrante',
  codigo_integrante: 'código del integrante',
  jefe_familia: 'nombre del jefe de familia',
  cedula_jefe_familia: 'cédula del jefe de familia',
  nro_cama: 'número de cama',
  firma_notificado: 'firma del notificado',
  firma_jefe_familia: 'firma del jefe de familia',
  firma_autoridad: 'firma de la autoridad',
  firma_testigo: 'firma del testigo',
};

function renderLinea(linea: string, index: number) {
  const trimmed = linea.trim();

  if (!trimmed) {
    return <div key={index} className="h-4" />;
  }

  const isFirma = trimmed.startsWith('{{firma_');
  if (isFirma) {
    return (
      <div key={index} className="my-8">
        <div className="border-b border-gray-400 w-64 mx-auto mb-1" />
        <p className="text-xs text-gray-500 text-center">{trimmed.replace(/{{|}}/g, '')}</p>
      </div>
    );
  }

  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return null;
  }

  const isTitle = (
    trimmed === trimmed.toUpperCase() &&
    trimmed.length > 10 &&
    !trimmed.endsWith('.') &&
    !trimmed.endsWith(':')
  );

  return (
    <p
      key={index}
      className={`leading-relaxed ${isTitle ? 'font-bold text-gray-900 text-center text-lg mb-4' : 'text-gray-800 text-sm'}`}
      style={{ textIndent: !isTitle && trimmed.length > 30 ? '2em' : '0' }}
    >
      {linea}
    </p>
  );
}

export default function ActaPreview({ contenido, sistema, valores }: ActaPreviewProps) {
  const textoRenderizado = useMemo(() => {
    let texto = contenido;

    Object.entries(SISTEMA_VARS).forEach(([key]) => {
      const valor = sistema[key];
      if (valor) {
        texto = texto.replaceAll(`{{${key}}}`, valor);
      }
    });

    Object.entries(valores).forEach(([key, valor]) => {
      if (valor) {
        texto = texto.replaceAll(`{{${key}}}`, valor);
      }
    });

    // Limpiar placeholders no reemplazados
    Object.entries(SISTEMA_VARS).forEach(([key, desc]) => {
      texto = texto.replaceAll(`{{${key}}}`, `[${desc}]`);
    });
    Object.entries(valores).forEach(([key]) => {
      texto = texto.replaceAll(`{{${key}}}`, '');
    });

    texto = texto.replace(/{{firma_.*?}}/g, '');

    return texto;
  }, [contenido, sistema, valores]);

  const lineas = textoRenderizado.split('\n');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="max-w-2xl mx-auto">
        {lineas.map((linea, i) => renderLinea(linea, i))}
      </div>
    </div>
  );
}
