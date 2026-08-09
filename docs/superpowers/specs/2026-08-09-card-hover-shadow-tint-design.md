# Hover en cards de indicadores — preservar sombra de color + tint sutil en cards clickeables

**Fecha:** 2026-08-09
**Ámbito:** `src/pages/Inicio.tsx`

---

## 1. Contexto

Tras implementar la sombra de color desplazada (`-5px 5px 0 0 {hex}`), se detectó que al hacer hover la sombra de color desaparece. Esto ocurre porque `hover:shadow-md` pisa la variable CSS `--tw-shadow`, reemplazando la sombra base (que contiene tanto `shadow-sm` como la sombra de color) por solo `shadow-md`.

Adicionalmente, se quiere que las cards **clickeables** (las que abren una lista de refugiados al hacer clic) se tiñan sutilmente de su color acento al hacer hover.

### 1.1 Cards no clickeables (4)

Modulos Activos, Camas Ocupadas, Total Personas, Total Familias. Solo muestran datos; no navegan.

### 1.2 Cards clickeables (8)

Mujeres embarazadas, Discapacitados, Niños (0-11), Lactantes (0-2), No Lactantes (3-11), Adolescentes (12-17), Adultos, Adulto Mayor. Abren `ListaIntegrantesModal` al hacer clic.

---

## 2. Comportamiento deseado

- **Hover (todas las cards):** la sombra de elevación (`shadow-md`) aparece SIN que desaparezca la sombra de color desplazada.
- **Hover (solo cards clickeables):** el fondo de la card se tiñe sutilmente del color acento con 10% de opacidad.
- **Mobile:** sin cambios (las cards en mobile ya usan `max-md:shadow-none` y `max-md:bg-{color}` sólido).
- **Transición:** suave en hover (`transition-shadow` ya existe; se agrega `transition-colors` para el tint).

---

## 3. Implementación

### 3.1 Cards no clickeables (1-4)

Cambiar `hover:shadow-md` por un valor arbitrario que combine `shadow-md` + sombra de color:

**Antes:**
```
hover:shadow-md
```

**Después:**
```
hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_{hex}]
```

| # | Card | Hex |
|---|------|-----|
| 1 | Modulos Activos | `#0033A0` |
| 2 | Camas Ocupadas | `#007229` |
| 3 | Total Personas | `#bc2f4a` |
| 4 | Total Familias | `#6366f1` |

### 3.2 Cards clickeables (5-12)

Mismo cambio de `hover:shadow-md` + agregar `hover:bg-{color}/10` y `transition-colors`:

**Antes:**
```
hover:shadow-md transition-shadow cursor-pointer
```

**Después:**
```
hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1),-5px_5px_0_0_{hex}] transition-shadow transition-colors cursor-pointer hover:bg-{color}/10
```

| # | Card | Hex | Hover bg |
|---|------|-----|----------|
| 5 | Mujeres embarazadas | `#ec4899` | `hover:bg-pink-500/10` |
| 6 | Discapacitados | `#a855f7` | `hover:bg-purple-500/10` |
| 7 | Niños (0-11) | `#fb923c` | `hover:bg-orange-400/10` |
| 8 | Lactantes (0-2) | `#fb923c` | `hover:bg-orange-400/10` |
| 9 | No Lactantes (3-11) | `#f97316` | `hover:bg-orange-500/10` |
| 10 | Adolescentes (12-17) | `#f59e0b` | `hover:bg-amber-500/10` |
| 11 | Adultos | `#34d399` | `hover:bg-emerald-400/10` |
| 12 | Adulto Mayor | `#fb7185` | `hover:bg-rose-400/10` |

---

## 4. Archivos afectados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/pages/Inicio.tsx` | Modificado | 12 cards: reemplazar `hover:shadow-md` + agregar `hover:bg-*` y `transition-colors` en las 8 clickeables |

---

## 5. Casos de prueba

| # | Caso | Esperado |
|---|---|---|
| 1 | Hover sobre card no clickeable (Modulos Activos) | Sombra de elevación aparece, sombra de color azul se mantiene visible |
| 2 | Hover sobre card clickeable (Niños 0-11) | Sombra de elevación + sombra naranja + fondo se tiñe naranja al 10% |
| 3 | Quitar hover | Vuelve al estado base (solo sombra gris + sombra de color) |
| 4 | Mobile (<768px) | Sin cambios: cards usan `max-md:shadow-none`, sin tint de hover |
