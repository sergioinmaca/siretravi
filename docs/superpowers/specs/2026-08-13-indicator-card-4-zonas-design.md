# Spec: Cards de indicadores con 4 zonas (Título / Total / Presentes / Hogar solidario)

**Fecha:** 2026-08-13
**Módulo:** Inicio (Dashboard)
**Alcance:** Solo front responsive de PC y tablets (horizontal), es decir `md+`. El layout móvil actual (`max-md`) no se modifica.

## 1. Propósito

Rediagramar las cards de indicadores del Dashboard. Hoy cada card es un rectángulo horizontal que muestra un único dato. La nueva card mantiene el formato rectangular y el borde 3D, pero se divide en **4 zonas** separadas por líneas divisoras, mostrando el total del indicador y su desglose por estatus (Presentes / Hogar solidario), cada uno con su desglose por género (M / F).

## 2. Layout de la card (4 zonas)

```
┌──────────────────────────────────────────┐
│   [Icono]  Título                        │  ← Zona 1: fila superior (todo el ancho)
├───────────────┬──────────────────────────┤
│    Total      │  238   Presentes         │  ← Zona 2 (izq) │ Zona 3 (der, fila 1)
│     277       │        M · F             │
│   M · F       ├──────────────────────────┤
│               │  33    Hogar solidario   │  ← Zona 4 (der, fila 2)
│               │        M · F             │
└───────────────┴──────────────────────────┘
```

### 2.1 Detalle por zona

- **Zona 1 — Título:** fila superior que abarca todo el ancho. Icono + título de la card.
- **Zona 2 — Total:** número total del indicador, con tipografía más grande que las zonas 3 y 4. Etiqueta "Total" encima del número; desglose `M · F` debajo.
- **Zona 3 — Presentes:** número a la izquierda, etiqueta "Presentes" a su derecha, desglose `M · F` debajo.
- **Zona 4 — Hogar solidario:** número a la izquierda, etiqueta "Hogar solidario" a su derecha, desglose `M · F` debajo.

### 2.2 Alineación

En cada zona, el número y los elementos que lo acompañan (etiqueta y M/F) comparten el mismo eje X (alineación izquierda común dentro de la celda).

### 2.3 Estilo

- Borde 3D conservado con el color propio de cada card (igual que hoy).
- Altura dinámica (las cards crecen según contenido).
- Líneas divisoras entre zonas.
- M en azul, F en rosa (convención actual: `text-blue-600` / `text-pink-600`).

## 3. Semántica de datos

| Zona | Cálculo |
|---|---|
| Total | Activos = `PRESENTE` + `HOGAR SOLIDARIO` (excluye `RETIRADO`) |
| Presentes | Integrantes con estatus `PRESENTE` |
| Hogar solidario | Integrantes con estatus `HOGAR SOLIDARIO` |

Cada zona incluye su propio desglose M/F. El género se obtiene de `r.genero` (`true` = Masculino, `false` = Femenino).

El estatus se normaliza igual que hoy en `Inicio.tsx`:
```ts
const estatus = ((r.hogar_solidario || '').trim().toUpperCase() || 'PRESENTE');
```

## 4. Nuevo componente: IndicatorCard

**Archivo:** `src/components/inicio/IndicatorCard.tsx`

### 4.1 Props

```ts
interface IndicatorCardProps {
  titulo: string;
  icono: ReactNode;
  color: string;        // color del borde 3D / acento
  grupo: Refugiado[];   // población base de la card (ya filtrada por la categoría)
  esFamilia?: boolean;  // modo especial para "Total de Familias" (sin M/F)
  onAbrirLista: (titulo: string, datos: Refugiado[]) => void;
}
```

### 4.2 Lógica interna

Un helper `desglosar(grupo)` devuelve:

```ts
{
  total: number;  totalM: number;  totalF: number;
  presentes: number; presentesM: number; presentesF: number;
  hogar: number; hogarM: number; hogarF: number;
  datosTotal: Refugiado[]; datosPresentes: Refugiado[]; datosHogar: Refugiado[];
}
```

- `datosTotal` = grupo activo (`PRESENTE` + `HOGAR SOLIDARIO`, excluye `RETIRADO`).
- `datosPresentes` = subconjunto con estatus `PRESENTE`.
- `datosHogar` = subconjunto con estatus `HOGAR SOLIDARIO`.
- M/F se cuentan sobre cada subconjunto.

### 4.3 Modo `esFamilia`

Para "Total de Familias" no hay desglose M/F. El componente recibe como `grupo` los **jefes de familia activos**, y cuenta `familia_id` únicos por estatus:

- `Total` = `familia_id` únicos entre jefes activos.
- `Presentes` = `familia_id` únicos entre jefes con estatus `PRESENTE`.
- `Hogar solidario` = `familia_id` únicos entre jefes con estatus `HOGAR SOLIDARIO`.

En modo `esFamilia`, las celdas no muestran `M · F`.

### 4.4 Interacción

Cada zona (Total, Presentes, Hogar solidario) es clicable. Al hacer clic ejecuta `onAbrirLista(tituloZona, datosZona)`, que en `Inicio.tsx` reutiliza el `abrirLista` existente para abrir `ListaIntegrantesModal`.

Si una zona tiene 0 integrantes, esa zona no es clicable (evita abrir lista vacía).

## 5. Cambios en Inicio.tsx

### 5.1 Sustitución de cards

Se reemplazan las 10 cards de personas por `<IndicatorCard>`:

| Card | `titulo` | `grupo` | `esFamilia` |
|---|---|---|---|
| Total de Personas | "Total de Personas" | `refugiadosActivos` | no |
| Total de Familias | "Total de Familias" | `jefesActivos` | sí |
| Embarazadas | "Embarazadas" | `embarazadasArray` | no |
| Discapacitados | "Discapacitados" | `discapacitadosArray` | no |
| Niños | "Niños" | `ninos` | no |
| Niños Lactantes | "Niños Lactantes" | `lactantes` | no |
| No Lactantes | "No Lactantes" | `noLactantes` | no |
| Adolescentes | "Adolescentes" | `adolescentes` | no |
| Adultos | "Adultos" | `adultos` | no |
| Adulto Mayor | "Adulto Mayor" | `adultoMayor` | no |

Notas:
- El título de la card principal cambia de "Total de Personas Presentes" a "Total de Personas".
- El componente recibe el array filtrado por categoría (ej. `ninos`, `adultos`, `embarazadasArray`). No importa si ese array ya excluye `RETIRADO` o no: internamente el componente excluye `RETIRADO` al calcular `datosTotal`/`total`, y deriva los tres subconjuntos (Total, Presentes, Hogar solidario). Así el cálculo es uniforme para todas las cards.
- Se mantiene el color de borde 3D actual de cada card.
- Cada zona clicable → `abrirLista('Total de Personas', datosTotal)`, `abrirLista('Presentes', datosPresentes)`, `abrirLista('Hogar solidario', datosHogar)`, etc.

### 5.2 Cards sin cambios

- **Módulos Activos**: no es una card de personas. Sin cambios.
- **Camas Disponibles**: no es una card de personas. Sin cambios.

### 5.3 Elementos no afectados

- Donut de Tenencia de Vivienda, Donut de Situación de Estatus, Ranking de Parroquias, `MenuDelDia`, `DistribucionGeografica` y el banner de nota: sin cambios.
- Layout móvil (`max-md`) de las cards: sin cambios.

## 6. Responsive

El nuevo layout de 4 zonas aplica solo en `md+` (768px en adelante, PC y tablets en horizontal). En móvil se conserva el diseño actual (`max-md`).

## 7. Verificación

No hay framework de tests. Verificar con:

```bash
npm run build   # tsc -b && vite build && node scripts/generate-version.js
npm run lint    # oxlint
```

Prueba manual:
1. Seleccionar un campamento con datos.
2. Verificar que cada card muestre las 4 zonas y que Total = Presentes + Hogar solidario.
3. Verificar desglose M/F en cada zona (azul/rosa).
4. Hacer clic en cada zona → abre `ListaIntegrantesModal` con el grupo correcto.
5. Verificar "Total de Familias" sin M/F y con conteo por `familia_id` único.
6. Reducir a tamaño móvil → se conserva el layout anterior.

## 8. Edge cases

| Caso | Comportamiento |
|---|---|
| Zona con 0 integrantes | No es clicable; se muestra con 0 y M/F en 0. |
| Campamento sin refugiados | Todas las cards en 0; zonas no clicables. |
| Género nulo/indefinido | Se cuenta como `false` (Femenino), igual que hoy. |
| `hogar_solidario` vacío | Se normaliza a `PRESENTE`. |
| Retirados | No aparecen en Total (solo cuentan en el donut de Situación de Estatus, sin cambios). |
