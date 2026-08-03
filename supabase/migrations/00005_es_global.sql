-- ============================================================
-- MIGRACIÓN: Agregar es_global a usuarios
-- ============================================================

ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT FALSE;
