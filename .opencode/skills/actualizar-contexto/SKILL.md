---
name: actualizar-contexto
description: Detecta cambios estructurales en el proyecto y actualiza contexto.md con aprobación del usuario
---

## Reglas inviolables

### Lo que SÍ puedes modificar sin preguntar (secciones seguras):
- Sección 3 (Modelo de Datos) — agregar/renovar campos de entidades existentes
- Sección 5 (Módulos) — agregar nuevas páginas detectadas
- Sección 2 (Stack) — actualizar versiones y dependencias
- Sección 4 (Constructor) — si cambia la implementación del canvas
- Sección 7 (Arquitectura) — sync automático del diagrama

### Lo que NUNCA debes modificar sin preguntar al usuario:
- Sección 1 (Descripción General) — texto de negocio
- Sección 6 (Diseño UI/UX) — descripción cualitativa
- Ejemplos dentro del modelo de datos (texto entre paréntesis como "Ej. CARPA A")
- Redacción narrativa, metáforas o explicaciones del dominio

### Lo que DEBES preguntar siempre:
- ¿Hay que agregar una entidad completamente nueva?
- ¿Hay que eliminar una entidad existente?
- Cualquier cambio que no encaje en las reglas de arriba

## Instrucciones de ejecución

Cuando el usuario diga "actualiza al contexto" o "actualiza el contexto":

### Fase 1: Leer contexto.md actual
Leé el archivo `contexto.md` completo. Identificá cada sección (1 a 7) y sus contenidos.

### Fase 2: Escanear el código fuente
Ejecutá estas verificaciones en orden:

#### 2a. Tipos (types/index.ts)
- Leé cada interfaz: `Campamento`, `Carpa`, `Refugiado`, `Familia`, `Usuario`, `Permiso`, `Modulo`, `Accion`
- Para cada interfaz, extraé la lista de campos
- Compará contra la Sección 3 del contexto.md
- Listá: campos nuevos, campos eliminados, cambios de tipo

#### 2b. Páginas (pages/*.tsx)
- Listá todos los archivos en `src/pages/`
- Compará contra la Sección 5 del contexto.md
- Detectá: páginas nuevas, páginas eliminadas

#### 2c. Componentes (components/**/*.tsx)
- Rastreá todos los componentes y su estructura
- Detectá si hay nuevos directorios de componentes
- Compará contra la Sección 7 (Arquitectura)

#### 2d. Dependencias (package.json)
- Extraé `dependencies` y `devDependencies`
- Compará contra la Sección 2 del contexto.md
- Listá: nuevas dependencias, eliminadas, cambios de versión significativos

#### 2e. Schema SQL (supabase_schema.sql)
- Leé el archivo SQL
- Verificá si hay nuevas tablas o columnas que no estén en el contexto.md
- Compará contra la Sección 3

#### 2f. Contextos (context/*.tsx)
- Verificá si hay nuevos archivos de contexto
- Verificá si los contextos existentes tienen nuevos métodos o estados
- Compará contra la Sección 7

### Fase 3: Generar reporte de discrepancias
Producí un resumen estructurado como este:

```
╔═══ REPORTE DE DISCREPANCIAS ═══╗

[SECCIÓN 3 - Modelo de Datos]
  ┌ Refugiado: campos nuevos detectados → [lista]
  └ Refugiado: campos en contexto.md que ya no existen → [lista]

[SECCIÓN 5 - Módulos]
  ┌ Páginas nuevas en src/pages/ → [lista]
  └ Páginas en contexto.md que ya no existen → [lista]

[SECCIÓN 2 - Stack]
  ┌ Nuevas dependencias → [lista]
  └ Dependencias eliminadas → [lista]

[SECCIÓN 7 - Arquitectura]
  ┌ Nuevos componentes detectados → [lista]
  └ Nuevos contextos detectados → [lista]

═══ Cambios seguros (aplicación directa) ═══
→ [lista de cambios que aplican las reglas]

═══ Cambios que requieren aprobación ═══
→ [lista de cambios que necesitan consulta]
```

Mostrá este reporte al usuario.

### Fase 4: Solicitar aprobación
Preguntale al usuario:
"Encontré X discrepancias. ¿Querés que aplique los cambios seguros automáticamente y te consulte los que requieren aprobación?"

### Fase 5: Ejecutar actualizaciones
Si el usuario acepta:
1. Aplicá los cambios seguros editando las secciones correspondientes del contexto.md
2. Para cada ítem que requiere aprobación, preguntá individualmente
3. NO reescribas el archivo completo — usá ediciones quirúrgicas
4. Si el usuario rechaza, no hagas ningún cambio
