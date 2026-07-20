# Contexto — Entorno de Base de Datos de Prueba

## Objetivo
Crear un entorno de base de datos de prueba (dev/test) independiente de la base de datos de producción, para poder hacer cambios de esquema (migraciones SQL) sin comprometer los datos reales. Este entorno se usará automáticamente en ramas que no sean `main`.

## Stack
- **BD actual:** Supabase Cloud (PostgreSQL) — proyecto `tnosurbowdghydtnfael.supabase.co`
- **Cliente:** `@supabase/supabase-js` v`^2.110.1` en `src/lib/supabase.ts`
- **Migraciones:** Archivos SQL planos ejecutados manualmente desde el SQL Editor
- **Autenticación:** Supabase Auth (email/contraseña mapeado a nickname)

## Migraciones existentes (orden de ejecución)

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `supabase_schema.sql` | Schema principal: campamentos, carpas, familias, refugiados, usuarios, módulos, acciones, permisos + seeds |
| 2 | `supabase_migration_rls_security.sql` | Refuerzo de RLS para todas las tablas |
| 3 | `supabase_migration_eventos.sql` | Tabla `eventos` + módulo Agenda |
| 4 | `supabase_migration_categorias_evento.sql` | Tabla `categorias_evento` + seed de 6 categorías |
| 5 | `supabase_migration_foto.sql` | Columna `foto_url` en refugiados + RLS Storage |
| 6 | `supabase_migration_mascotas_table.sql` | Tabla independiente `mascotas` con relación 1:N |
| 7 | `supabase_migration_observaciones_generales.sql` | Columna `observaciones_generales` en refugiados |
| 8 | `supabase/migrations/00003_actas.sql` | Módulo Actas: tipo_acta, actas, contadores_actas + RLS granular |

## Archivos de configuración actuales

| Archivo | Contenido |
|---------|-----------|
| `.env.local` | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` de producción (gitignorado por `*.local`) |
| `.env.example` | Placeholders `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=` |
| `src/lib/supabase.ts` | `createClient` usando `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |
| `vite.config.ts` | Solo plugins `react()` y `optimizeDeps` con `dayjs/locale/es` |

## Decisión de arquitectura

**Opción seleccionada:** Segundo proyecto Supabase gratuito + detección automática de rama en `vite.config.ts`.

**Razones:**
- Aislamiento total de datos
- Sin necesidad de Docker
- Sin costo (free tier de Supabase)
- Mínimo cambio en tooling existente

**Descartado:**
- Supabase CLI + Docker (requiere 16 GB RAM, overhead innecesario)
- Database Branching de Supabase (requiere plan Team pago)

## Plan de implementación acordado

### 1. Crear proyecto Supabase dev (manual)
- Ir a supabase.com → New project → nombre: `siretravi-dev`
- Copiar URL y anon key

### 2. Aplicar migraciones iniciales al proyecto dev (manual)
- Usar SQL Editor del proyecto dev
- Ejecutar los 8 archivos SQL en orden (de `supabase_schema.sql` a `00003_actas.sql`)

### 3. Modificar `.env.local`
Agregar credenciales del proyecto dev:
```env
VITE_SUPABASE_URL=https://tnosurbowdghydtnfael.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...prod
VITE_DEV_SUPABASE_URL=https://ref-dev.supabase.co
VITE_DEV_SUPABASE_ANON_KEY=eyJ...dev
```

### 4. Modificar `vite.config.ts`
Agregar detección de rama git. Si no está en `main`, usar `VITE_DEV_SUPABASE_URL` y `VITE_DEV_SUPABASE_ANON_KEY` mediante `define`.

### 5. Crear datos de prueba en proyecto dev (manual)
- Insertar campamentos, familias y refugiados de prueba desde la UI o con INSERTs en SQL Editor
- **No se sincronizan datos reales** por privacidad y para evitar alteraciones accidentales

## Flujo de trabajo (workflow)

```
main ────→ .env.local (VITE_SUPABASE_*) → BD producción
  │
  └── dev ───→ .env.local (VITE_DEV_SUPABASE_*) → BD dev/test
        │
        ├── feature/nueva-tabla      → BD dev/test
        └── feature/refactor-bd      → BD dev/test
```

### Ciclo de vida de una migración

1. En `feature/nueva-tabla` se crea `supabase_migration_nueva_tabla.sql`
2. Se ejecuta en SQL Editor del proyecto dev
3. Se prueba el funcionamiento contra BD dev
4. `git commit` + `git push` del archivo `.sql`
5. `git merge feature/nueva-tabla → dev`
6. El archivo `.sql` llega a `dev` por git
7. `git merge dev → main`
8. El archivo `.sql` llega a `main` por git
9. **TÚ ejecutas ese `.sql` en producción** (SQL Editor) — paso manual necesario

### Punto clave
**Git merge NO aplica cambios de BD.** Solo mueve el archivo SQL. La ejecución del SQL contra cada base de datos es siempre manual a través del SQL Editor de Supabase.

## Sincronización de datos entre entornos

| Tipo de dato | ¿Sincronizar? | Método |
|-------------|:------------:|--------|
| Esquema (tablas, columnas) | ✅ | Migraciones SQL ejecutadas en ambos entornos |
| Datos maestros (módulos, categorías) | ✅ | Embbeded en los SQL seeds |
| Datos de operación (refugiados, familias) | ❌ | Solo datos de prueba creados manualmente |

## Archivos involucrados (a crear/modificar)

| Archivo | Acción |
|---------|--------|
| `.env.local` | Agregar `VITE_DEV_SUPABASE_URL` y `VITE_DEV_SUPABASE_ANON_KEY` |
| `vite.config.ts` | Agregar `execSync` para detectar rama y `define` para inyectar vars |
| `contexto.md` | Documentar nuevo flujo |

## Resumen del último plan de implementación

**Objetivo:** Establecer un entorno de base de datos de prueba (dev/test) independiente de producción para SIRETRAVI, usando un segundo proyecto Supabase gratuito con detección automática de rama git en `vite.config.ts`.

**Alcance:**
- Crear proyecto Supabase `siretravi-dev`
- Aplicar las 8 migraciones SQL existentes al proyecto dev
- Configurar `.env.local` con credenciales de ambos entornos (`VITE_SUPABASE_*` para prod, `VITE_DEV_SUPABASE_*` para dev)
- Modificar `vite.config.ts` para que detecte la rama git actual y use automáticamente las credenciales dev si no está en `main`
- Establecer el flujo de trabajo: migraciones SQL viajan por git, pero se ejecutan manualmente en cada entorno
- No se sincronizan datos de operación por privacidad; solo datos de prueba
