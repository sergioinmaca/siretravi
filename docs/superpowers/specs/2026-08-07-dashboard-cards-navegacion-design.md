# Spec: Cards clickeables en Dashboard + Navegación cross-module con URL params

**Fecha:** 2026-08-07
**Módulos:** Inicio, Refugiados, Familias

## 1. Propósito

Convertir las cards y gráficos demográficos del Dashboard en elementos interactivos que abren un modal con el listado detallado de las personas correspondientes. Desde ese listado, permitir navegar al detalle individual del integrante y —desde ahí— saltar al módulo de Refugiados o Familias con búsqueda pre-llenada y detalle abierto.

## 2. Elementos clickeables

| Elemento | Sección | ¿Click en qué? |
|---|---|---|
| Embarazadas | Card | Card entera |
| Discapacitados | Card | Card entera |
| Niños (0-11) | Card | Card entera |
| Niños Lactantes (0-2) | Card | Card entera |
| No Lactantes (3-11) | Card | Card entera |
| Adolescentes (12-17) | Card | Card entera |
| Adultos | Card | Card entera |
| Adulto Mayor | Card | Card entera |
| Tenencia de Vivienda | Donut chart | Etiqueta de cada categoría |
| Situación de Estatus | Donut chart | Etiquetas "Hogar Solidario" y "Retirado" (NO "Presente") |
| Ranking de Procedencias | Barras | Cada barra del ranking |

## 3. Nuevo componente: ListaIntegrantesModal

**Archivo:** `src/components/ui/ListaIntegrantesModal.tsx`

### 3.1 Props

```ts
interface ListaIntegrantesModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  datos: Refugiado[];
  familias: Familia[];
  onVerDetalle: (refugiado: Refugiado) => void;
}
```

### 3.2 Estructura

- **Header:** ícono Users + título (ej. "Embarazadas", "Tenencia: Propia", "Estatus: Retirado")
- **Body:** tabla con columnas: Nombres, Apellidos, Género, Edad, Jerarquía
  - Género: "M" / "F"
  - Edad: calculada desde `fecha_nacimiento`
  - Jerarquía: "Jefe de Familia" o "Miembro — [NombreFamilia]"
- **Acción por fila:** botón Eye "Ver detalle" → ejecuta `onVerDetalle(refugiado)`
- **Paginación:** `PaginationControls` (15 por página)
- **Tamaño:** `max-w-2xl`, altura fija con `flex flex-col` estilo HistorialAtencionesModal

## 4. Cambios en Inicio.tsx

### 4.1 Cards demográficas

Las 8 cards (Embarazadas a Adulto Mayor) reciben:
- `onClick={() => abrirLista(titulo, datos)}`
- `className` agregado: `cursor-pointer`
- Para Embarazadas y Discapacitados, se cambia el cálculo de `.length` a guardar también el array completo:
  ```ts
  const embarazadasArray = refugiadosActivos.filter(r => r.genero === false && r.embarazo === true);
  const totalEmbarazadas = embarazadasArray.length;
  ```

### 4.2 Tenencia de Vivienda — labels clickeables

Cada `<span>` de color + texto de categoría en la leyenda del donut se vuelve clickeable con `cursor-pointer`. Al hacer clic, abre `ListaIntegrantesModal` con los jefes de esa tenencia. Título: "Tenencia: Propia", "Tenencia: Alquilada", etc.

Requiere derivar el array de jefes por tenencia:
```ts
const jefesPorTenencia = useMemo(() => {
  const map = new Map<string, Refugiado[]>();
  jefesActivos.forEach(j => {
    const t = j.tenencia_vivienda?.trim() || 'Sin especificar';
    if (!map.has(t)) map.set(t, []);
    map.get(t)!.push(j);
  });
  return map;
}, [jefesActivos]);
```

### 4.3 Situación de Estatus — labels clickeables

Solo "Hogar Solidario" y "Retirado" tienen `cursor-pointer` y `onClick`. "Presente" permanece sin interacción. Título: "Estatus: Hogar Solidario", "Estatus: Retirado".

Array ya existe: `refugiadosDelCampamento.filter(r => estatus === 'HOGAR SOLIDARIO'/'RETIRADO')`.

### 4.4 Ranking de Procedencias — barras clickeables

Cada barra recibe `onClick` y `cursor-pointer`. Título: "Procedencia: [nombre]".

Requiere derivar el array de jefes por procedencia:
```ts
const jefesPorProcedencia = useMemo(() => {
  const map = new Map<string, Refugiado[]>();
  jefesActivos.forEach(j => {
    const proc = j.procedencia?.trim() || 'SIN ESPECIFICAR';
    if (!map.has(proc)) map.set(proc, []);
    map.get(proc)!.push(j);
  });
  return map;
}, [jefesActivos]);
```

### 4.5 State y flujo

Nuevos estados en Inicio.tsx:
```ts
const [listaModalOpen, setListaModalOpen] = useState(false);
const [listaTitulo, setListaTitulo] = useState('');
const [listaDatos, setListaDatos] = useState<Refugiado[]>([]);
const [fichaDesdeDashboard, setFichaDesdeDashboard] = useState<Refugiado | null>(null);
const [fichaModalOpen, setFichaModalOpen] = useState(false);
```

Flujo:
```
Card click → abrirLista(titulo, datos) → ListaIntegrantesModal
  → Eye en fila → openFicha(ref) → FichaRefugiadoModal (reutilizado, con prop extra)
    → "Ver en el Módulo de Integrantes" → navigate con search params
```

### 4.6 Reutilización de FichaRefugiadoModal

Inicio.tsx importa y renderiza `FichaRefugiadoModal` con una prop adicional `showNavButton?: boolean` que controla si se muestra el botón "Ver en el Módulo de Integrantes" en el footer.

## 5. Botón "Ver en el Módulo de Integrantes/Familias"

### 5.1 FichaRefugiadoModal.tsx

**Nueva prop opcional:**
```ts
showNavButton?: boolean;
onNavigateToModule?: () => void;
```

Cuando `showNavButton === true`, se agrega un botón en el footer (desktop y mobile):
```tsx
<button onClick={onNavigateToModule}
  className="flex items-center gap-2 bg-caracas-blue hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
  <ExternalLink size={16} />
  Ver en el Módulo de Integrantes
</button>
```

Se ubica a la izquierda de "Exportar PDF" y "Cerrar", o debajo de los botones de paginación si están presentes.

**En Inicio.tsx**, `onNavigateToModule` cierra los modales y navega:
```ts
const handleNavigateToRefugiados = () => {
  setFichaModalOpen(false);
  setFichaDesdeDashboard(null);
  const nombre = `${fichaDesdeDashboard!.apellidos} ${fichaDesdeDashboard!.nombres}`;
  navigate(`/refugiados?buscar=${encodeURIComponent(nombre)}&verFicha=${fichaDesdeDashboard!.id}`);
};
```

### 5.2 DetalleFamiliaModal.tsx

Mismas props y botón. El callback navega:
```ts
navigate(`/familias?buscar=${encodeURIComponent(familia.nombre)}&verFamilia=${familia.id}`);
```

## 6. Lectura de URL params en Refugiados.tsx

### 6.1 Import y hook
```ts
import { useSearchParams } from 'react-router-dom';
const [searchParams, setSearchParams] = useSearchParams();
```

### 6.2 useEffect al montar

```ts
useEffect(() => {
  const buscar = searchParams.get('buscar');
  const verFicha = searchParams.get('verFicha');

  if (buscar || verFicha) {
    if (buscar) {
      setSearchInput(buscar);
      setDebouncedSearch(buscar);
    }
    if (verFicha) {
      setFichaPorId(verFicha);
    }
    // Limpiar params de la URL
    setSearchParams({}, { replace: true });
  }
}, []); // solo al montar
```

### 6.3 Apertura de ficha por ID

Nuevo estado `fichaPorId: string | null`. En el `useEffect` que observa `paginados`:
```ts
useEffect(() => {
  if (fichaPorId && paginados.length > 0) {
    const ref = paginados.find(r => r.id === fichaPorId);
    if (ref) {
      setFichaRefugiado(ref);
      setIsFichaOpen(true);
      setFichaPorId(null);
    }
  }
}, [paginados, fichaPorId]);
```

### 6.4 Búsqueda pre-llenada

Al setear `searchInput` y `debouncedSearch`, el sistema de debounce existente (400ms) dispara `refetch()` que trae los resultados del backend con ese término. El `searchInput` se setea al valor de `buscar` y el input del buscador lo muestra automáticamente.

El formato del valor `buscar` es `"APELLIDOS NOMBRES"` (en mayúsculas, separado por espacio), que es exactamente lo que el buscador espera.

## 7. Lectura de URL params en Familias.tsx

### 7.1 Mismo patrón

```ts
useEffect(() => {
  const buscar = searchParams.get('buscar');
  const verFamilia = searchParams.get('verFamilia');

  if (buscar || verFamilia) {
    if (buscar) {
      setSearchTerm(buscar);
    }
    if (verFamilia) {
      const fam = familiasDelCampamento.find(f => f.id === verFamilia);
      if (fam) {
        setSelectedFamilia(fam);
        setIsModalOpen(true);
      }
    }
    setSearchParams({}, { replace: true });
  }
}, []); // solo al montar
```

### 7.2 Particularidad

A diferencia de Refugiados (server-side pagination), Familias filtra client-side. Al setear `searchTerm`, el `useMemo` de `familiasDelCampamento` filtra inmediatamente y la familia buscada aparece si el nombre coincide. Si se pasó `verFamilia`, se busca por ID directamente sin depender del filtro.

## 8. Edge cases

| Caso | Comportamiento |
|---|---|
| Card con 0 integrantes | No se abre el modal (no tiene sentido mostrar lista vacía). |
| URL params inválidos (refugiado no encontrado) | Se ignora `verFicha`, no se abre ningún modal. |
| Navegación desde dashboard con familia sin jefe | `ListaIntegrantesModal` muestra miembros normalmente; Jerarquía muestra "Miembro — [Familia]". |
| Doble navegación (params ya procesados) | Se limpian de la URL después del primer procesamiento (`setSearchParams({}, { replace: true })`). |
| `showNavButton` en Refugiados/Familias normales | Es `false` por defecto. No aparece el botón en uso normal del módulo. |
| Mobile | El botón "Ver en el Módulo de Integrantes" aparece también en la sección de acciones mobile del modal. |
