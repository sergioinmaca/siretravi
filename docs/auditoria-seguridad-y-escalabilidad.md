# Auditoría de Seguridad y Escalabilidad — SIRETRAVI

> **Fecha:** 14/07/2026
> **Propósito:** Identificar inconsistencias críticas en la arquitectura actual del sistema y proponer correcciones progresivas.

---

## 1. Comunicaciones Offline

**Estado actual:** No hay soporte offline de ningún tipo.

- No existe Service Worker, IndexedDB, PWA ni estrategia offline-first.
- Toda operación CRUD se ejecuta mediante `@supabase/supabase-js` contra la API de Supabase.
- El archivo `src/lib/supabase.ts` crea un cliente estándar sin mecanismo de retry, cola offline o caché local.
- En `src/context/CampamentoContext.tsx`, las funciones como `agregarRefugiado()`, `actualizarRefugiado()`, `eliminarRefugiado()`, etc., solo verifican `if (error) { console.error(...); return; }` sin lanzar alertas visibles al usuario.
- El bloque `catch` en `cargarDatos()` (línea 218) solo hace `console.error`, sin feedback visual.

**Riesgo concreto:** Un operador llena un formulario completo, hace clic en Guardar sin conexión, el sistema no muestra error, y los datos se pierden sin notificación.

**Referencias:**
- `src/lib/supabase.ts` — cliente Supabase sin configuración offline
- `src/context/CampamentoContext.tsx:218` — catch sin feedback
- `src/context/CampamentoContext.tsx:609-753` — funciones CRUD sin manejo de errores visible

---

## 2. Vulnerabilidad a Inspección y Robo de Datos

**Estado actual:** El sistema es extremadamente vulnerable.

### 2.1. Row Level Security (RLS) abierto al rol `anon`

En `supabase_schema.sql` (líneas 82-85 y 160-163), todas las tablas tienen RLS habilitado, pero las políticas permiten acceso TOTAL al rol anónimo:

```sql
CREATE POLICY "Acceso total campamentos" ON campamentos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total carpas" ON carpas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total familias" ON familias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total refugiados" ON refugiados FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total usuarios" ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total modulos" ON modulos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total acciones" ON acciones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total permisos" ON permisos FOR ALL TO anon USING (true) WITH CHECK (true);
```

La `supabaseAnonKey` está definida en `src/lib/supabase.ts` mediante `import.meta.env.VITE_SUPABASE_ANON_KEY` y se compila en el bundle de JavaScript. **Cualquier persona con DevTools puede extraerla y ejecutar consultas directamente contra Supabase desde la consola o Postman.**

### 2.2. Sin validación server-side de permisos

Las políticas RLS no verifican el rol del usuario ni el token de sesión de Supabase Auth. Aunque el frontend usa `permisos` en `AuthContext.tsx` para ocultar botones/rutas, un atacante puede saltarse esa lógica fácilmente accediendo directamente a la API de Supabase.

### 2.3. Código fuente completamente expuesto

Al ser una SPA de React con Vite, el bundle contiene:
- Toda la lógica de negocio
- Estructura completa de la base de datos (nombres de tablas, columnas, relaciones)
- Claves API (Supabase anon key)
- Rutas internas y endpoints

**Referencias:**
- `supabase_schema.sql:75-85,155-163` — políticas RLS abiertas
- `src/lib/supabase.ts:3-4` — anon key expuesta
- `src/context/AuthContext.tsx` — permisos solo en frontend

---

## 3. Escalabilidad para 20 Usuarios Concurrentes

**Estado actual:** La arquitectura presenta múltiples cuellos de botella que dificultan el escenario de 20 usuarios simultáneos (10 registrando refugiados, 5 consultando historias médicas, 5 exportando reportes).

### 3.1. Carga inicial masiva

En `src/context/CampamentoContext.tsx:78-86`, el `useEffect` de inicialización ejecuta **7 consultas `SELECT *` sin límite** que traen la totalidad de los registros de todas las tablas:

```typescript
const [{ data: campsData }, { data: carpasData }, { data: famData }, { data: refData }, { data: hcData }, { data: atData }, { data: trData }] = await Promise.all([
  supabase.from('campamentos').select('*').order(...),
  supabase.from('carpas').select('*').order(...),
  supabase.from('familias').select('*').order(...),
  supabase.from('refugiados').select('*').order(...),
  supabase.from('historias_clinicas').select('*').order(...),
  supabase.from('atenciones_medicas').select('*').order(...),
  supabase.from('tratamientos').select('*').order(...),
]);
```

No hay paginación, lazy loading ni límite de filas. Con miles de registros, esto degrada:
- Tiempo de carga inicial del dashboard
- Consumo de memoria RAM del navegador
- Rendimiento de re-renders de React (todo se almacena en `useState`)

### 3.2. Estado global inflado

Los 7 arreglos de datos se almacenan en `useState` dentro del `CampamentoProvider` y se distribuyen a todos los componentes mediante `useCampamento()`. Cualquier cambio en cualquier tabla provoca re-renders en toda la aplicación.

### 3.3. Suscripciones Realtime sin filtrar

En `CampamentoContext.tsx:267-413` se crea un único canal `campamentos-realtime` que escucha cambios en 5 tablas. Cada INSERT/UPDATE/DELETE de cualquier usuario:
1. Envía una notificación WebSocket a **todos los clientes conectados**
2. Dispara actualizaciones de estado en React
3. Causa re-renders en cascada

Con 20 usuarios operando simultáneamente, el tráfico Realtime es alto y el rendimiento se degrada.

### 3.4. Sin rate limiting ni protección contra abuso

No hay límite de consultas por usuario ni mecanismo de debouncing/throttling en las operaciones CRUD. En el plan gratuito de Supabase esto no es configurable directamente.

### 3.5. Sin paginación en tabla de refugiados

La página `Refugiados.tsx` filtra del lado del cliente todo el arreglo `refugiados`. Con miles de registros, el filtrado y renderizado de la tabla se vuelve lento.

### 3.6. Exportación de reportes

La generación de PDF/PPTX usa `html2canvas` + `jsPDF`/`pptxgenjs`, procesándose 100% en el cliente. No afecta al servidor, pero es intensivo en CPU del navegador. Múltiples exportaciones simultáneas pueden congelar la pestaña del usuario.

**Referencias:**
- `src/context/CampamentoContext.tsx:73-86` — carga inicial masiva
- `src/context/CampamentoContext.tsx:267-413` — Realtime sin filtrar
- `src/context/CampamentoContext.tsx:62-70` — estado global inflado
- `src/pages/Refugiados.tsx:33-44` — filtrado cliente-side
- `src/pages/Reportes.tsx:201-259` — exportación cliente-side

---

## Prioridad de Corrección Sugerida

| Prioridad | Punto | Acción |
|-----------|-------|--------|
| **Alta** | 2.1 | Corregir políticas RLS en Supabase para restringir acceso según autenticación |
| **Alta** | 3.1 | Limitar carga inicial y agregar paginación |
| **Alta** | 3.5 | Implementar paginación server-side en tabla refugiados |
| **Media** | 3.2 | Migrar a consultas por módulo (TanStack Query o hooks simples) |
| **Media** | 3.3 | Reducir canales Realtime |
| **Baja** | 1 | Implementar estrategia offline-first (Service Worker + IndexedDB) |
