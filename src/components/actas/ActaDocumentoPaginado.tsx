import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { resolverContenido, deducirTitulo, esLineaOmitible, renderLinea, FirmaBlock, type FirmaConDatos } from '../../lib/actaTemplate';

// Página Carta (Letter): 8.5 x 11 pulgadas @ 96dpi => 816 x 1056 px
// Margen de 5mm por lado => padding de ~18.9px
// Margen de texto adicional de 1cm (37.8px) en cada lado (X)
export const ACTA_PAGE_WIDTH = 816;
export const ACTA_PAGE_HEIGHT = 1056;
const ACTA_PAGE_PADDING = 18.9;
const TEXTO_MARGEN_X = 37.8;
const HEADER_WIDTH = ACTA_PAGE_WIDTH - ACTA_PAGE_PADDING * 2;
const CONTENT_WIDTH = ACTA_PAGE_WIDTH - ACTA_PAGE_PADDING * 2 - TEXTO_MARGEN_X * 2;
const CONTENT_HEIGHT = ACTA_PAGE_HEIGHT - ACTA_PAGE_PADDING * 2;

interface ActaDocumentoPaginadoProps {
  contenido: string;
  sistema: Record<string, string>;
  valores: Record<string, string>;
  tituloActa?: string;
}

interface Bloque {
  key: string;
  tipo: 'espacio' | 'linea' | 'firma';
  indice: number;
}

function EncabezadoPagina({ nombreCampamento }: { nombreCampamento: string }) {
  return (
    <div>
      {/* Logos institucionales */}
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

      {/* Antetítulo: Nombre del Campamento */}
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
    </div>
  );
}

function TituloPagina({ titulo }: { titulo: string }) {
  return (
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
        {titulo}
      </h1>
    </div>
  );
}

function renderBloque(bloque: Bloque, lineas: string[], filasFirmas: FirmaConDatos[][]): ReactNode {
  if (bloque.tipo === 'espacio') {
    return <div style={{ height: '30px' }} />;
  }

  if (bloque.tipo === 'linea') {
    return renderLinea(lineas[bloque.indice], bloque.indice);
  }

  const fila = filasFirmas[bloque.indice];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: fila.length === 2 ? '1fr 1fr' : '1fr',
        gap: '24px',
        marginBottom: bloque.indice < filasFirmas.length - 1 ? '36px' : '0',
        marginTop: bloque.indice === 0 ? '45px' : '0',
      }}
    >
      {fila.map(firma => (
        <FirmaBlock key={firma.clave} etiqueta={firma.etiqueta} datos={firma.datosResueltos} />
      ))}
    </div>
  );
}

export default function ActaDocumentoPaginado({ contenido, sistema, valores, tituloActa }: ActaDocumentoPaginadoProps) {
  const nombreCampamento = sistema.nombre_campamento || 'CAMPAMENTO';
  const tituloFinal = (tituloActa || sistema.nombre_tipo_acta || sistema.nombre_documento || '').trim();

  const resuelto = useMemo(
    () => resolverContenido(contenido, sistema, valores),
    [contenido, sistema, valores]
  );

  const lineas = useMemo(() => {
    const filtradas = deducirTitulo(resuelto.texto, tituloFinal).filter(l => !esLineaOmitible(l));
    // Recortar líneas en blanco iniciales y finales (el aire lo controla el código)
    let inicio = 0;
    let fin = filtradas.length;
    while (inicio < fin && filtradas[inicio].trim() === '') inicio++;
    while (fin > inicio && filtradas[fin - 1].trim() === '') fin--;
    return filtradas.slice(inicio, fin);
  }, [resuelto.texto, tituloFinal]);

  const filasFirmas = useMemo(() => {
    const filas: FirmaConDatos[][] = [];
    for (let i = 0; i < resuelto.firmasConDatos.length; i += 2) {
      filas.push(resuelto.firmasConDatos.slice(i, i + 2));
    }
    return filas;
  }, [resuelto.firmasConDatos]);

  const bloques = useMemo<Bloque[]>(() => {
    const b: Bloque[] = [];
    if (lineas.length > 0 || filasFirmas.length > 0) {
      b.push({ key: 'espacio-titulo', tipo: 'espacio', indice: 0 });
    }
    lineas.forEach((_, i) => b.push({ key: `linea-${i}`, tipo: 'linea', indice: i }));
    filasFirmas.forEach((_, i) => b.push({ key: `firma-${i}`, tipo: 'firma', indice: i }));
    return b;
  }, [lineas, filasFirmas]);

  // Primera pasada: medir alturas reales en contenedor oculto (mismo ancho y tipografía)
  const medidorRef = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState<number[] | null>(null);

  useEffect(() => {
    let cancel = false;

    const medir = () => {
      const el = medidorRef.current;
      if (!el) return;
      const heights = Array.from(el.children).map(c => (c as HTMLElement).offsetHeight);
      if (!cancel) setMedidas(heights);
    };

    medir();
    if (document.fonts?.ready) {
      document.fonts.ready.then(medir).catch(() => {});
    }

    return () => {
      cancel = true;
    };
  }, [bloques, tituloFinal]);

  // Escala visual: la hoja se ajusta al ancho disponible sin alterar su layout fijo
  const escenaRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useLayoutEffect(() => {
    const el = escenaRef.current;
    if (!el) return;

    const medir = () => {
      setEscala(Math.min(1, el.clientWidth / ACTA_PAGE_WIDTH));
    };

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Segunda pasada: asignación greedy de bloques por página
  const paginas = useMemo(() => {
    if (!medidas || medidas.length !== bloques.length + (tituloFinal ? 2 : 1)) return null;

    const headerH = medidas[0];
    const tituloH = tituloFinal ? medidas[1] : 0;
    const inicioBloques = tituloFinal ? 2 : 1;
    const presupuestoPagina1 = CONTENT_HEIGHT - headerH - tituloH;
    const presupuestoResto = CONTENT_HEIGHT - headerH;

    const result: number[][] = [];
    let actual: number[] = [];
    let usado = 0;
    let presupuesto = presupuestoPagina1;

    for (let i = 0; i < bloques.length; i++) {
      const h = medidas[inicioBloques + i];
      if (usado + h > presupuesto && actual.length > 0) {
        result.push(actual);
        actual = [];
        usado = 0;
        presupuesto = presupuestoResto;
      }
      actual.push(i);
      usado += h;
    }
    if (actual.length > 0) result.push(actual);

    return result;
  }, [medidas, bloques, tituloFinal]);

  return (
    <div className="bg-white p-6">
      {/* Contenedor oculto solo para medir alturas */}
      <div
        ref={medidorRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -9999,
          top: 0,
          width: CONTENT_WIDTH,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: HEADER_WIDTH, marginLeft: -TEXTO_MARGEN_X }}>
          <EncabezadoPagina nombreCampamento={nombreCampamento} />
        </div>
        {tituloFinal && <TituloPagina titulo={tituloFinal} />}
        {bloques.map(b => renderBloque(b, lineas, filasFirmas))}
      </div>

      {paginas ? (
        <div ref={escenaRef} style={{ width: '100%' }}>
          {paginas.map((indices, paginaIdx) => (
            <div
              key={paginaIdx}
              style={{
                width: '100%',
                height: ACTA_PAGE_HEIGHT * escala,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {/* Div intermedio con el scale visual (la página capturada no lleva transform) */}
              <div
                data-acta-escale
                style={{
                  width: ACTA_PAGE_WIDTH,
                  height: ACTA_PAGE_HEIGHT,
                  transform: `scale(${escala})`,
                  transformOrigin: 'top center',
                }}
              >
                <div
                  data-acta-pagina
                  style={{
                    position: 'relative',
                    width: ACTA_PAGE_WIDTH,
                    height: ACTA_PAGE_HEIGHT,
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {/* Fondo full-bleed (proporción Carta vertical) */}
                  <img
                    src="/margenvertical.jpg"
                    alt=""
                    aria-hidden="true"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                  {/* Contenido dentro de márgenes de 5mm */}
                  <div
                    style={{
                      position: 'relative',
                      padding: ACTA_PAGE_PADDING,
                      boxSizing: 'border-box',
                    }}
                  >
                    <EncabezadoPagina nombreCampamento={nombreCampamento} />
                    {/* El texto del acta lleva 1cm adicional de margen en cada lado */}
                    <div
                      style={{
                        paddingLeft: TEXTO_MARGEN_X,
                        paddingRight: TEXTO_MARGEN_X,
                      }}
                    >
                      {paginaIdx === 0 && tituloFinal && <TituloPagina titulo={tituloFinal} />}
                      {indices.map(bIdx => renderBloque(bloques[bIdx], lineas, filasFirmas))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={escenaRef} style={{ width: '100%' }}>
          <div className="py-8 text-center text-gray-400">
            <p className="font-medium">Preparando documento...</p>
          </div>
        </div>
      )}
    </div>
  );
}
