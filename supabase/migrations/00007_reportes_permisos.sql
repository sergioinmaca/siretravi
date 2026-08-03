-- ============================================================
-- MIGRACIÓN: Agregar reportes a la tabla permisos
-- ============================================================

ALTER TABLE public.permisos 
ADD COLUMN IF NOT EXISTS reportes TEXT[];
