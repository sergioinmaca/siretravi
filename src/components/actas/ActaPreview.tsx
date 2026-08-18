import { useMemo } from 'react';
import { resolverContenido, deducirTitulo, renderLinea, FirmaBlock, type FirmaConDatos } from '../../lib/actaTemplate';

interface ActaPreviewProps {
  contenido: string;
  sistema: Record<string, string>;
  valores: Record<string, string>;
  tituloActa?: string;
}

export default function ActaPreview({ contenido, sistema, valores, tituloActa }: ActaPreviewProps) {
  const nombreCampamento = sistema.nombre_campamento || 'CAMPAMENTO';
  const tituloFinal = (tituloActa || sistema.nombre_tipo_acta || sistema.nombre_documento || '').trim();

  const resuelto = useMemo(
    () => resolverContenido(contenido, sistema, valores),
    [contenido, sistema, valores]
  );

  const lineas = useMemo(
    () => deducirTitulo(resuelto.texto, tituloFinal),
    [resuelto.texto, tituloFinal]
  );

  // Agrupar firmas en pares para el grid de 2 columnas
  const filasFirmas = useMemo(() => {
    const filas: FirmaConDatos[][] = [];
    for (let i = 0; i < resuelto.firmasConDatos.length; i += 2) {
      filas.push(resuelto.firmasConDatos.slice(i, i + 2));
    }
    return filas;
  }, [resuelto.firmasConDatos]);

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
            position: 'relative',
            top: '13px',
          }}
        >
          <img
            src="/logorepujpg.jpg"
            alt="República Bolivariana de Venezuela"
            style={{ height: '52px', width: 'auto', objectFit: 'contain', position: 'relative', left: '30px' }}
          />
          <img
            src="/verejpg.jpg"
            alt="Plan Venezuela Renace"
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/logoalcadiajpg.jpg"
            alt="Alcaldía de Caracas"
            style={{ height: '52px', width: 'auto', objectFit: 'contain', position: 'relative', left: '-29px' }}
          />
        </div>

        {/* Antetítulo: Nombre del Campamento al que pertenece la persona / usuario */}
        <div style={{ textAlign: 'center', marginBottom: '10px', position: 'relative', top: '7px' }}>
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

        {/* Texto del acta con margen adicional de 1cm en cada lado */}
        <div style={{ paddingLeft: '37.8px', paddingRight: '37.8px' }}>
          {/* Título: Valor de la columna 'nombre' de la tabla tipo_acta */}
          {tituloFinal && (
            <div style={{ textAlign: 'center', marginBottom: '-5px' }}>
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
          {filasFirmas.length > 0 && (
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
    </div>
  );
}
