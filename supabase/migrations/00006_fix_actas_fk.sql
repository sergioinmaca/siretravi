-- ============================================================
-- MIGRACIÓN: Fix FK actas_created_by para permitir eliminar usuarios
-- ============================================================

-- Eliminar la constraint actual
ALTER TABLE public.actas 
DROP CONSTRAINT IF EXISTS actas_created_by_fkey;

-- Recrear con ON DELETE SET NULL
ALTER TABLE public.actas
ADD CONSTRAINT actas_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON DELETE SET NULL;
