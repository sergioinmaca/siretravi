import { useMemo } from 'react';

interface ActaPreviewProps {
  contenido: string;
  sistema: Record<string, string>;
  valores: Record<string, string>;
  tituloActa?: string;
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

// Configuración de cada bloque de firma con su etiqueta y las variables que se auto-llenan
// source: 'sistema' = variables del sistema, 'valores' = campos del contenido JSONB del acta
const FIRMA_CONFIG: {
  clave: string;
  etiqueta: string;
  datosVars: { key: string; source: 'sistema' | 'valores'; fallback: string; formatCedula?: boolean }[];
}[] = [
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

function renderLinea(linea: string, index: number) {
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

interface FirmaBlockProps {
  etiqueta: string;
  datos: string[];
}

function FirmaBlock({ etiqueta, datos }: FirmaBlockProps) {
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

export default function ActaPreview({ contenido, sistema, valores, tituloActa }: ActaPreviewProps) {
  const nombreCampamento = sistema.nombre_campamento || 'CAMPAMENTO';
  const tituloFinal = (tituloActa || sistema.nombre_tipo_acta || sistema.nombre_documento || '').trim();

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

    // No limpiar las firmas aún, las vamos a extraer
    return texto;
  }, [contenido, sistema, valores]);

  // Detectar qué firmas están presentes en la plantilla original
  const firmasPresentes = useMemo(() => {
    return FIRMA_CONFIG.filter(fc =>
      contenido.includes(`{{${fc.clave}}}`)
    );
  }, [contenido]);

  // Preparar los datos de cada firma con las variables del sistema o del contenido
  const firmasConDatos = useMemo(() => {
    return firmasPresentes.map(fc => {
      const datos = fc.datosVars.map(dv => {
        const fuente = dv.source === 'valores' ? valores : sistema;
        const valor = fuente[dv.key];
        if (!valor) return dv.fallback;
        // Formatear cédula si aplica (agregar V- y separadores de miles)
        if (dv.formatCedula && valor) {
          const soloNumeros = valor.replace(/\D/g, '');
          const formateado = soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          return `V-${formateado}`;
        }
        return valor;
      });
      return {
        ...fc,
        datosResueltos: datos,
      };
    });
  }, [firmasPresentes, sistema, valores]);

  // Limpiar texto de firmas para el cuerpo
  const textoSinFirmas = useMemo(() => {
    let t = textoRenderizado;
    // Remover las líneas que contengan placeholders de firma ya reemplazados
    FIRMA_CONFIG.forEach(fc => {
      // Limpiar cualquier residuo de firma en el texto
      t = t.replace(new RegExp(`\\[${SISTEMA_VARS[fc.clave]}\\]`, 'g'), '');
    });
    return t;
  }, [textoRenderizado]);

  // Filtrar si la primera línea no vacía coincide con el título para evitar duplicación
  const lineas = useMemo(() => {
    const rawLineas = textoSinFirmas.split('\n');
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
  }, [textoSinFirmas, tituloFinal]);

  // Agrupar firmas en pares para el grid de 2 columnas
  const filasFirmas: typeof firmasConDatos[] = [];
  for (let i = 0; i < firmasConDatos.length; i += 2) {
    filasFirmas.push(firmasConDatos.slice(i, i + 2));
  }

  return (
    <div className="bg-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Encabezado Institucional con Logos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '20px',
            paddingBottom: '4px',
          }}
        >
          <img
            src="/logorepublica.jpg"
            alt="República Bolivariana de Venezuela"
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/logovererojo.png"
            alt="Plan Venezuela Renace"
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/logoalcadia.png"
            alt="Alcaldía de Caracas"
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Antetítulo: Nombre del Campamento al que pertenece la persona / usuario */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {nombreCampamento}
          </p>
        </div>

        {/* Título: Valor de la columna 'nombre' de la tabla tipo_acta */}
        {tituloFinal && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#111827',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              {tituloFinal}
            </h1>
          </div>
        )}

        {/* Cuerpo del Acta */}
        {lineas.map((linea, i) => renderLinea(linea, i))}

        {/* Sección de firmas en grid de 2 columnas */}
        {firmasConDatos.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            {filasFirmas.map((fila, filaIdx) => (
              <div
                key={filaIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: fila.length === 2 ? '1fr 1fr' : '1fr',
                  gap: '24px',
                  marginBottom: filaIdx < filasFirmas.length - 1 ? '36px' : '0',
                }}
              >
                {fila.map(firma => (
                  <FirmaBlock
                    key={firma.clave}
                    etiqueta={firma.etiqueta}
                    datos={firma.datosResueltos}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
