# Excluir RETIRADO de los contadores del Dashboard (Inicio)

**Fecha:** 2026-07-30
**Ámbito:** `src/pages/Inicio.tsx`

---

## 1. Contexto

El campo `refugiados.hogar_solidario` almacena el estatus: `'PRESENTE'`, `'HOGAR SOLIDARIO'`, o `'RETIRADO'`. Actualmente el dashboard cuenta a todos por igual en todos los indicadores, sin distinguir el estatus.

## 2. Comportamiento deseado

Los integrantes con estatus `'RETIRADO'` deben **excluirse** de todos los contadores del dashboard de Inicio. La dona de Situación de Estatus sigue mostrando el breakdown completo (incluyendo RETIRADO) para transparencia histórica.

### 2.1 Indicadores que excluyen RETIRADO

| Indicador | Comportamiento |
|---|---|
| Total de Personas | Sin RETIRADO |
| Hombres / Mujeres | Sin RETIRADO |
| Niños (0-11) | Sin RETIRADO |
| Lactantes (0-2) | Sin RETIRADO |
| No Lactantes (3-11) | Sin RETIRADO |
| Adolescentes (12-17) | Sin RETIRADO |
| Adultos | Sin RETIRADO |
| Adulto Mayor | Sin RETIRADO |
| Total de Familias | Solo familias con jefe activo (no RETIRADO) |
| Tenencia de Vivienda | Solo jefes activos |
| Ranking de Procedencias | Solo jefes activos |

### 2.2 Indicadores que NO cambian

| Indicador | Razón |
|---|---|
| Dona Situación de Estatus | Debe mostrar el desglose completo de los 3 estados |
| Camas Disponibles / Ocupadas | Las camas se desasignan manualmente, no por código |
| Módulos Activos | No usa datos de refugiados |
| Planos / Croquis | No usa datos de refugiados |

## 3. Implementación

### 3.1 Estrategia: variables filtradas aguas arriba

En lugar de filtrar repetidamente en cada contador, se crean dos variables derivadas una sola vez:

```tsx
// Excluye RETIRADO de todos los cálculos demográficos
const refugiadosActivos = refugiadosDelCampamento.filter(
  r => (r.hogar_solidario || '').toUpperCase() !== 'RETIRADO'
);

// Jefes de familia activos (para tenencia, procedencias, total familias)
const jefesActivos = refugiadosActivos.filter(r => r.es_jefe_familia === true);
```

### 3.2 Asignación de variables

| Variable actual | Reemplazar por |
|---|---|
| `refugiadosDelCampamento` (en totalRefugiados) | `refugiadosActivos` |
| `refugiadosDelCampamento` (en totalHombres/totalMujeres) | `refugiadosActivos` |
| `refugiadosDelCampamento` (en refugiadosConEdad) | `refugiadosActivos` |
| `refugiadosDelCampamento` (en jefesFamilia) | `refugiadosActivos` |
| `jefesFamilia` | `jefesActivos` |
| `refugiadosDelCampamento` (en estatusData) | Se mantiene sin filtrar |
| `refugiadosDelCampamento` (en occupiedBeds) | Se mantiene sin filtrar |

### 3.3 Total de Familias

Actualmente cuenta `familia_id` únicos directamente de la lista global de `refugiados`:

```tsx
// Antes
const totalFamilias = new Set(
  refugiados.filter(r => r.campamento_id === campamentoSeleccionado.id && r.familia_id)
    .map(r => r.familia_id)
).size;

// Después: usa jefesActivos
const totalFamilias = new Set(
  jefesActivos.filter(r => r.familia_id).map(r => r.familia_id)
).size;
```

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Inicio.tsx` | Agregar `refugiadosActivos` y `jefesActivos`, reasignar variables según tabla 3.2 |

## 5. No aplica

- No hay cambios en base de datos
- No hay cambios en la API de Supabase
- No hay nuevos componentes ni rutas
- No afecta a otros módulos (Refugiados, Reportes, Actas, etc.)
