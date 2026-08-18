import type { ReactNode } from 'react';

export const SISTEMA_VARS: Record<string, string> = {
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

export interface FirmaDatoVar {
  key: string;
  source: 'sistema' | 'valores';
  fallback: string;
  formatCedula?: boolean;
}

export interface FirmaConfig {
  clave: string;
  etiqueta: string;
  datosVars: FirmaDatoVar[];
}

// Configuración de cada bloque de firma con su etiqueta y las variables que se auto-llenan
// source: 'sistema' = variables del sistema, 'valores' = campos del contenido JSONB del acta
export const FIRMA_CONFIG: FirmaConfig[] = [
  {
    clave: 'firma_notificado',
    etiqueta: 'Ciudadano Notificado',
    datosVars: [
      { key: 'nombre_completo_integrante', source: 'sistema', fallback: 'XXXXXXXXXXX' },
      { key: 'cedula_integrante', source: 'sistema', fallback: 'C.I. X-XX.XXX.XXX' },
    ],
  },
  {
    clave: 'firma_jefe_familia',
    etiqueta: 'Jefe(a) del Grupo Familiar',
    datosVars: [
      { key: 'jefe_familia', source: 'sistema', fallback: 'XXXXXXXXXXXXX' },
      { key: 'cedula_jefe_familia', source: 'sistema', fallback: 'C.I. X-XX.XXX.XXX' },
    ],
  },
  {
    clave: 'firma_autoridad',
    etiqueta: 'AUTORIDAD RESPONSABLE',
    datosVars: [
      { key: 'nombre_campamento', source: 'sistema', fallback: 'Campamento' },
    ],
  },
  {
    clave: 'firma_testigo',
    etiqueta: 'TESTIGO',
    datosVars: [
      { key: 'nombre_testigo', source: 'valores', fallback: 'Nombre:' },
      { key: 'ci_testigo', source: 'valores', fallback: 'C.I.:', formatCedula: true },
    ],
  },
];

export interface FirmaConDatos extends FirmaConfig {
  datosResueltos: string[];
}

export interface ContenidoResuelto {
  texto: string;
  firmasConDatos: FirmaConDatos[];
}

export function formatearCedulaTexto(valor: string): string {
  const soloNumeros = valor.replace(/\D/g, '');
  const formateado = soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `V-${formateado}`;
}

export function resolverContenido(
  contenido: string,
  sistema: Record<string, string>,
  valores: Record<string, string>
): ContenidoResuelto {
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

  // Detectar qué firmas están presentes en la plantilla original
  const firmasPresentes = FIRMA_CONFIG.filter(fc => contenido.includes(`{{${fc.clave}}}`));

  // Preparar los datos de cada firma con las variables del sistema o del contenido
  const firmasConDatos: FirmaConDatos[] = firmasPresentes.map(fc => {
    const datos = fc.datosVars.map(dv => {
      const fuente = dv.source === 'valores' ? valores : sistema;
      const valor = fuente[dv.key];
      if (!valor) return dv.fallback;
      // Formatear cédula si aplica (agregar V- y separadores de miles)
      if (dv.formatCedula && valor) return formatearCedulaTexto(valor);
      return valor;
    });
    return {
      ...fc,
      datosResueltos: datos,
    };
  });

  // Limpiar residuos de firmas ya reemplazados en el texto
  FIRMA_CONFIG.forEach(fc => {
    texto = texto.replace(new RegExp(`\\[${SISTEMA_VARS[fc.clave]}\\]`, 'g'), '');
  });

  return { texto, firmasConDatos };
}

// Filtrar si la primera línea no vacía coincide con el título para evitar duplicación
export function deducirTitulo(texto: string, tituloFinal: string): string[] {
  const rawLineas = texto.split('\n');
  if (!tituloFinal) return rawLineas;

  const tituloClean = tituloFinal.toLowerCase().replace(/[^a-z0-9]/g, '');
  let tituloEncontrado = false;

  return rawLineas.filter(linea => {
    if (tituloEncontrado) return true;
    const trimmedClean = linea.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (trimmedClean && trimmedClean === tituloClean) {
      tituloEncontrado = true;
      return false; // Omitir línea redundante de título en la plantilla
    }
    return true;
  });
}

// Líneas que se omiten del cuerpo porque representan firmas o placeholders de una sola línea
export function esLineaOmitible(linea: string): boolean {
  const trimmed = linea.trim();
  if (trimmed.startsWith('{{firma_')) return true;
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) return true;
  return false;
}

export function renderLinea(linea: string, index: number): ReactNode {
  const trimmed = linea.trim();

  if (!trimmed) {
    return <div key={index} className="h-4" />;
  }

  // Las firmas se renderizan aparte en el bloque de firmas
  if (trimmed.startsWith('{{firma_')) {
    return null;
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

export function FirmaBlock({ etiqueta, datos }: { etiqueta: string; datos: string[] }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
      {/* Línea de firma */}
      <div
        style={{
          width: '210px',
          borderBottom: '1px solid #4a4a4a',
          marginBottom: '4px',
          marginTop: '16px',
        }}
      />
      {/* Datos auto-llenados debajo de la línea */}
      {datos.map((dato, i) => (
        <p
          key={i}
          className="text-center"
          style={{
            fontSize: '11px',
            lineHeight: '1.4',
            color: '#1a1a1a',
            fontWeight: i === 0 ? 600 : 400,
          }}
        >
          {dato}
        </p>
      ))}
      {/* Etiqueta del rol */}
      <p
        className="text-center"
        style={{
          fontSize: '11px',
          lineHeight: '1.4',
          color: '#1a1a1a',
          fontWeight: 600,
          textDecoration: etiqueta.startsWith('Jefe') || etiqueta.startsWith('Jefa') ? 'underline' : 'none',
        }}
      >
        {etiqueta}
      </p>
    </div>
  );
}
