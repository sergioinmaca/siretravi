import type { ReactNode } from 'react';

// Marcadores invisibles (PUA) usados durante la resolución del contenido:
// - SENTINEL_NL: representa un salto de línea interno dentro del valor de un campo.
// - CAMPO_INI / CAMPO_FIN: delimitan una línea de plantilla que es un campo solitario.
const SENTINEL_NL = '\uE000';
const CAMPO_INI = '\uE001';
const CAMPO_FIN = '\uE002';

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
  const escaparValor = (valor: string): string =>
    valor
      .replace(/\r\n/g, '\n')
      .replace(/^\n+|\n+$/g, '')
      .replace(/\n/g, SENTINEL_NL);

  // Se sustituye línea por línea para poder detectar "campos solitarios"
  // (una línea que es exactamente {{clave}} de un campo del formulario)
  const lineas = contenido.split('\n');
  const texto = lineas
    .map(linea => {
      const trimmed = linea.trim();
      const match = trimmed.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);

      if (match && Object.prototype.hasOwnProperty.call(valores, match[1]) && valores[match[1]]) {
        return `${CAMPO_INI}${escaparValor(valores[match[1]])}${CAMPO_FIN}`;
      }

      let ln = linea;

      Object.entries(SISTEMA_VARS).forEach(([key]) => {
        const valor = sistema[key];
        if (valor) {
          ln = ln.replaceAll(`{{${key}}}`, escaparValor(valor));
        }
      });

      Object.entries(valores).forEach(([key, valor]) => {
        if (valor) {
          ln = ln.replaceAll(`{{${key}}}`, escaparValor(valor));
        }
      });

      return ln;
    })
    .join('\n');

  let textoLimpio = texto;

  // Limpiar placeholders no reemplazados
  Object.entries(SISTEMA_VARS).forEach(([key, desc]) => {
    textoLimpio = textoLimpio.replaceAll(`{{${key}}}`, `[${desc}]`);
  });
  Object.entries(valores).forEach(([key]) => {
    textoLimpio = textoLimpio.replaceAll(`{{${key}}}`, '');
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
    textoLimpio = textoLimpio.replace(new RegExp(`\\[${SISTEMA_VARS[fc.clave]}\\]`, 'g'), '');
  });

  return { texto: textoLimpio, firmasConDatos };
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

  // Línea que proviene de un campo solitario del formulario (ej. listado de familiares):
  // se dibuja en negrita, con tamaño mayor al cuerpo y menor interlineado.
  if (linea.includes(CAMPO_INI)) {
    const textoCampo = linea
      .replaceAll(CAMPO_INI, '')
      .replaceAll(CAMPO_FIN, '')
      .replaceAll(SENTINEL_NL, '\n');

    return (
      <p
        key={index}
        className="text-gray-800"
        style={{
          fontSize: '17px',
          fontWeight: 700,
          lineHeight: '1.3',
          textAlign: 'justify',
          whiteSpace: 'pre-wrap',
        }}
      >
        {textoCampo}
      </p>
    );
  }

  const isTitle = (
    trimmed === trimmed.toUpperCase() &&
    trimmed.length > 10 &&
    !trimmed.endsWith('.') &&
    !trimmed.endsWith(':')
  );

  if (isTitle) {
    return (
      <p key={index} className="leading-relaxed font-bold text-gray-900 text-center text-lg mb-4">
        {linea}
      </p>
    );
  }

  return (
    <p
      key={index}
      className="leading-relaxed text-gray-800"
      style={{ fontSize: '14.67px', textAlign: 'justify', textIndent: '2em' }}
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
            fontSize: '12.67px',
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
          fontSize: '12.67px',
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
