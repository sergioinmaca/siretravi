# Contexto — Indicadores del Inicio

## Objetivo
Refactorizar los cards de indicadores demográficos en la página de Inicio (`src/pages/Inicio.tsx`) y corregir la fuente de datos del card "Camas Disponibles" para que refleje los conteos reales del croquis.

## Stack
- React + TypeScript, Tailwind CSS, lucide-react (íconos)
- Supabase: tablas `campamentos`, `carpas`, `refugiados`, `familias`
- Datos vía `CampamentoContext`

---

## Cambios realizados

### 1. Cards demográficos — desglose de Niñez y nuevo card Adultos

**Rangos etarios:**
| Card | Rango | Ícono |
|---|---|---|
| Niños (card padre) | 0-12 | `Baby` |
| Niños Lactantes (sub-card) | 0-3 | `Milk` |
| No Lactantes (sub-card) | 4-12 | `Baby` |
| Adolescentes | 13-17 | `Sparkles` |
| Adultos (nuevo) | H:18-59 / M:18-54 | `UserCheck` |
| Adulto Mayor | H≥60 / M≥55 | `Heart` |

**Layout:**
- Fila 1: Niños — ancho completo, actúa como resumen
- Fila 2: Lactantes | No Lactantes — 2 cols con borde izquierdo naranja (`border-l-4 border-l-orange-400/300`)
- Fila 3: Adolescentes | Adultos | Adulto Mayor — 3 cols

**Cálculos agregados** (`Inicio.tsx`):
```typescript
lactantes = refugiadosConEdad.filter(r => r.edad >= 0 && r.edad <= 3)
noLactantes = refugiadosConEdad.filter(r => r.edad >= 4 && r.edad <= 12)
adultos = refugiadosConEdad.filter(r =>
  (r.genero === true && r.edad >= 18 && r.edad < 60) ||
  (r.genero === false && r.edad >= 18 && r.edad < 55)
)
```

### 2. Corrección de `capacidad_maxima` — fuente única de verdad en el croquis

**Problema:** `capacidad_maxima` se guardaba en BD al crear/editar el campamento usando los campos manuales `literas`, `camas_individuales`, `camas_duplex` del formulario (`CrearRefugioModal.tsx:89`). Si luego se modificaba el croquis, esos campos no se actualizaban y `capacidad_maxima` quedaba desincronizada.

**Solución:**
1. **Nueva función `contarTiposDesdeCroquis`** en `CroquisViewer.tsx` — parsea el JSON del croquis y devuelve `{ literas, individuales, duplex }`.
2. **`calcularCapacidadTotal()`** en `CrearRefugioModal.tsx` — ahora usa `countElements(croquis_data, tipoContabilizacion)` en vez de los campos manuales.
3. **`onChange` del CroquisEditor** — al modificar el croquis, sincroniza los campos manuales (`literas`, `camas_individuales`, `camas_duplex`) con los conteos reales del JSON.
4. **Encabezado del acordeón** — muestra conteos reales desde el croquis usando `contarTiposDesdeCroquis` y `countElements`.
5. **`Inicio.tsx`** — eliminada función inline `contarTiposDesdeCroquis` duplicada; ahora importa la compartida.

### 3. Card "Camas Disponibles" — ahora desde el croquis

**Antes:** `disponibles = max(0, capacidad_maxima - totalRefugiados)`
**Ahora:** usa las mismas variables que el span de "Distribución del Campamento":
- Disponibles: `disponiblesCroquis = max(0, totalCamasCroquis - uniqueOccupiedBedsSet.size)`
- Ocupadas: `uniqueOccupiedBedsSet.size` (camas únicas asignadas, no total de refugiados)
- Totales: `totalCamasCroquis` (conteo real del croquis según `tipo_contabilizacion`)

**Nota:** `uniqueOccupiedBedsSet.size` puede diferir de `totalRefugiados` porque múltiples refugiados pueden compartir el mismo `nro_cama`.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Inicio.tsx` | Cards demográficos reorganizados + card Camas Disponibles desde croquis + import compartido |
| `src/components/constructor/CroquisViewer.tsx` | Nueva función exportada `contarTiposDesdeCroquis` |
| `src/components/constructor/CrearRefugioModal.tsx` | `calcularCapacidadTotal` desde croquis + sincronización onChange + header actualizado |

## Matemática de indicadores (resumen)

| Indicador | Fórmula | Fuente |
|---|---|---|
| Total Integrantes | `refugiados.length` | `refugiados` array filtrado por campamento |
| Hombres / Mujeres | `genero === true` / `genero === false` | campo booleano |
| Familias | `familias.filter(camp).length` | `familias` array |
| Camas Disponibles | `totalCamasCroquis - uniqueOccupiedBedsSet.size` | `croquis_data` JSON |
| Carpas Activas | `campamento.carpas.length` | relación en BD |
| Edad | `hoy.getFullYear() - nacimiento.getFullYear()` ajustado por mes/día | `fecha_nacimiento` |
| Niños Lactantes | `0 <= edad <= 3` | edad calculada |
| No Lactantes | `4 <= edad <= 12` | edad calculada |
| Adolescentes | `13 <= edad <= 17` | edad calculada |
| Adultos | H: `18 <= edad < 60` / M: `18 <= edad < 55` | edad + género |
| Adulto Mayor | H: `edad >= 60` / M: `edad >= 55` | edad + género |
| Ranking Procedencias | agrupación por `procedencia`, orden descendente | `procedencia` campo texto |
| Croquis Total Camas | `literas*2 + individuales + duplex` (modo `cama`) o suma simple (modo `elemento`) | `croquis_data` JSON |
