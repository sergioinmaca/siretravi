-- ============================================================
-- MIGRACIÓN: Agregar campamento_hogar a usuarios
-- ============================================================

ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS campamento_hogar UUID REFERENCES public.campamentos(id) ON DELETE SET NULL;
