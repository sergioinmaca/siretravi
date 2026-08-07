# Spec: Filtrado de Retirados en Exportaciones + Informe de Retirados

**Fecha:** 2026-08-06
**Módulos:** Refugiados, Reportes

## 1. Propósito

Excluir a los integrantes con estatus RETIRADO de todas las exportaciones (PDF y XLSX) de integrantes activos, y agregar un nuevo reporte dedicado exclusivamente a retirados en el módulo de Reportes.

## 2. Regla de negocio

```
SI hogar_solidario === "RETIRADO"
  → NO aparece en exportaciones de integrantes activos (PDF, XLSX)
  → SÍ aparece en el nuevo reporte "Informe de Retirados"
```

Se reutiliza `esRetirado()` de `src/lib/retiredFilter.ts` (ya implementada).

## 3. Función compartida de XLSX

**Archivo nuevo:** `src/lib/exportRefugiadosXLSX.ts`

Extrae la lógica de 14 columnas del `handleExportXLSX` actual de Refugiados.tsx y la parametriza.

**Firma:**
```ts
export function exportarRefugiadosXLSX(
  refugiados: Refugiado[],
  familias: Familia[],
  historiasMap: Record<string, string>,
  nombreCamp: string,
  prefijo: string
): void
```

**Comportamiento:**
- **Columnas (14):** Código, Cédula, Género, Apellidos, Nombres, Fecha de Nacimiento, Edad (Valor), Edad (Unidad), Jerarquía, Cama, Estatus, Teléfono, Parentesco, Observaciones
- **Sorting:** familia → jefe → código (idéntico al XLSX actual de Refugiados)
- **Sheet name:** `'Integrantes'` si `prefijo === 'integrantes'`, `'Retirados'` si `prefijo === 'retirados'`
- **Filename:** `{prefijo}-{nombreCamp}-{fecha}.xlsx`
- **Jerarquía:** "Jefe de Familia" o "Miembro (NombreFamilia)"
- **Edad:** dos columnas separadas (valor + unidad) vía `formatAgeParts`
- **Observaciones:** concatenación de discapacidad + enfermedades crónicas desde `historiasMap`
- **Async:** requiere obtener `obtenerHistoriasClinicas()` antes de llamar

**Dependencias:** `xlsx`, `formatAgeParts`, `formatCedula`, `obtenerHistoriasClinicas`

## 4. Refugiados.tsx

### 4.1 PDF (`handleExportPDF`)

- Línea ~170: la data se construye con `refugiados.filter(r => r.campamento_id === campamentoSeleccionado?.id)`
- **Cambio:** agregar `.filter(r => !esRetirado(r))` en el pipeline (o usar `filtrarActivos()`)

### 4.2 XLSX (`handleExportXLSX`)

- Líneas ~290-377: reemplazar toda la lógica inline por llamada a `exportarRefugiadosXLSX()`
- Antes de llamar, filtrar: `const activos = filtrarActivos(refugiadosDelCampamento)`
- Llamada: `exportarRefugiadosXLSX(activos, familias, historiasMap, nombreCamp, 'integrantes')`
- Mantener el `setExportandoXLSX` y el `try/catch` wrapper

## 5. Reportes.tsx

### 5.1 Card "Exportar Integrantes" (existente, ~línea 1309)

- `handleExportRefugiadosXLSX` (~línea 505): mismo cambio que Refugiados — usar `exportarRefugiadosXLSX()` con `filtrarActivos()`

### 5.2 Nueva card "Informe de Retirados"

**Ubicación:** en el grid de cards, al lado derecho de "Exportar Integrantes" (ambas comparten fila en md:grid-cols-2).

**Condición de visibilidad:** `tienePermisoReporte('retirados', campamentoSeleccionado?.id || '')`

**Estructura (patrón de card de Reportes):**
```
bg-white rounded-3xl p-6 border border-slate-100 shadow-sm min-h-[220px]

Título:    "Informe de Retirados" (h3, text-lg, font-bold, text-slate-800)
Descripción: "Listado de integrantes con estatus RETIRADO del campamento.
             Incluye datos completos con el mismo formato que el listado
             de integrantes activos." (p, text-sm, text-slate-500)

Botón:     Solo XLSX
           bg-emerald-600 hover:bg-emerald-700 (verde, igual que otras cards XLSX)
           Ícono: FileDown
           Texto: "Exportar XLSX"
           Disabled: !campamentoSeleccionado || isGenerating
```

**Nueva función `handleExportRetiradosXLSX`:**
```ts
const refugiadosRetirados = refugiadosDelCampamento.filter(r => esRetirado(r));
exportarRefugiadosXLSX(refugiadosRetirados, familiasDelCampamento, historiasMap, nombreCamp, 'retirados');
```

### 5.3 Cambios de estado

- Nuevo `useState`: `const [exportandoRetirados, setExportandoRetirados] = useState(false);`
- `isGenerating` debe incluir `exportandoRetirados` en su condición

### 5.4 Imports nuevos en Reportes.tsx

```ts
import { esRetirado } from '../lib/retiredFilter';
import { exportarRefugiadosXLSX } from '../lib/exportRefugiadosXLSX';
```

Se eliminan imports que queden sin uso tras migrar a la función compartida (`formatAgeParts`, `formatCedula`, `obtenerHistoriasClinicas` si ya no se usan directamente).

## 6. Tipos: REPORTES_DISPONIBLES

**Archivo:** `src/types/index.ts` (~línea 44)

Agregar entrada:
```ts
{ clave: 'retirados', nombre: 'Informe de Retirados' },
```

Insertar después de `'integrantes'` para mantener agrupación lógica.

## 7. Edge cases

| Caso | Comportamiento |
|---|---|
| Campamento sin retirados | La card "Informe de Retirados" se muestra igual. El XLSX se exporta vacío (solo headers). |
| Sin `campamentoSeleccionado` | Botón disabled. No se ejecuta export. |
| Error en `obtenerHistoriasClinicas` | El `try/catch` del wrapper captura el error. `historiasMap` vacío = columna Observaciones vacía. |
| Permisos: usuario sin permiso `'retirados'` | La card no se renderiza (condición `tienePermisoReporte`). |
