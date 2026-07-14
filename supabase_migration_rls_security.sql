-- ================================================
-- MIGRACIÓN: SEGURIDAD RLS — BLOQUEAR ACCESO ANÓNIMO
-- ================================================
-- Pegar en el SQL Editor de Supabase y ejecutar.
-- Esta migración elimina las políticas que permiten
-- acceso total al rol "anon" (público) y las reemplaza
-- por políticas que SOLO permiten acceso a usuarios
-- autenticados con sesión (rol "authenticated").
--
-- ¿Por qué? La anon key está en el bundle de JavaScript
-- del frontend. Cualquiera puede extraerla con DevTools.
-- Las RLS abiertas a "anon" permiten leer, insertar,
-- modificar o borrar TODOS los datos sin necesidad de
-- iniciar sesión.
-- ================================================

-- ───────────────────────────────────────────────────
-- 1. TABLAS PRINCIPALES (schema original)
-- ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Acceso total campamentos" ON campamentos;
CREATE POLICY "auth_all_campamentos" ON campamentos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total carpas" ON carpas;
CREATE POLICY "auth_all_carpas" ON carpas
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total familias" ON familias;
CREATE POLICY "auth_all_familias" ON familias
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total refugiados" ON refugiados;
CREATE POLICY "auth_all_refugiados" ON refugiados
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────
-- 2. MÓDULO DE AGENDA (migraciones eventos)
-- ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Acceso total eventos" ON eventos;
CREATE POLICY "auth_all_eventos" ON eventos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total categorias" ON categorias_evento;
CREATE POLICY "auth_all_categorias_evento" ON categorias_evento
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────
-- 3. MÓDULO DE USUARIOS Y PERMISOS
-- ───────────────────────────────────────────────────
-- NOTA: Estas tablas contienen la configuración del
-- sistema. Se mantienen abiertas para todos los
-- usuarios autenticados (el frontend ya controla qué
-- botones se muestran según permisos).
--
-- Para restringir SOLO a usuarios "master" en el
-- futuro, se necesitarían custom claims en el JWT
-- (auth.jwt() -> 'app_metadata' ->> 'is_master').
-- Eso evita el loop de RLS al consultar la misma
-- tabla "usuarios" desde su propia política.
-- ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Acceso total usuarios" ON usuarios;
CREATE POLICY "auth_all_usuarios" ON usuarios
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total modulos" ON modulos;
CREATE POLICY "auth_all_modulos" ON modulos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total acciones" ON acciones;
CREATE POLICY "auth_all_acciones" ON acciones
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total permisos" ON permisos;
CREATE POLICY "auth_all_permisos" ON permisos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────
-- 4. MÓDULO DE SALUD (pueden no tener RLS activado)
-- ───────────────────────────────────────────────────
-- Las tablas "historias_clinicas", "atenciones_medicas"
-- y "tratamientos" se crearon desde el código o desde
-- la UI de Supabase. Si no tienen RLS activado, están
-- abiertas a cualquier rol. Este bloque las asegura.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'historias_clinicas') THEN
    ALTER TABLE historias_clinicas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "auth_all_historias_clinicas" ON historias_clinicas;
    CREATE POLICY "auth_all_historias_clinicas" ON historias_clinicas
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'atenciones_medicas') THEN
    ALTER TABLE atenciones_medicas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "auth_all_atenciones_medicas" ON atenciones_medicas;
    CREATE POLICY "auth_all_atenciones_medicas" ON atenciones_medicas
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tratamientos') THEN
    ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "auth_all_tratamientos" ON tratamientos;
    CREATE POLICY "auth_all_tratamientos" ON tratamientos
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ───────────────────────────────────────────────────
-- 5. CONTADORES DE CÓDIGOS (puede no tener RLS)
-- ───────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campamento_contadores') THEN
    ALTER TABLE campamento_contadores ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "auth_all_campamento_contadores" ON campamento_contadores;
    CREATE POLICY "auth_all_campamento_contadores" ON campamento_contadores
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ================================================
-- VERIFICACIÓN
-- ================================================
-- Para comprobar que las políticas se aplicaron:
--
-- 1. Abrir la consola del navegador (F12) estando
--    en la página de Login (SIN iniciar sesión).
-- 2. Escribir:
--      const { data } = await supabase.from('refugiados').select('count');
--      console.log(data);
-- 3. Debe devolver un error o array vacío (no los datos).
-- 4. Iniciar sesión y repetir el paso 2 → debe funcionar.
-- ================================================
