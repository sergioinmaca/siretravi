-- ================================================
-- SIRETRAVI - Migración: Foto de Integrante
-- Ejecutar en el SQL Editor de Supabase
-- ================================================

-- 1. Agregar columna foto_url a la tabla refugiados
ALTER TABLE refugiados ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Políticas RLS para el bucket fotos-integrantes en Storage
--    (El bucket se crea desde Supabase Dashboard > Storage > New Bucket)
--    Nombre del bucket: fotos-integrantes
--    Público: NO
--    Tamaño máximo: 5 MB
--    Tipos MIME: image/jpeg, image/png, image/webp

DROP POLICY IF EXISTS "auth_read_fotos" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_fotos" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_fotos" ON storage.objects;

CREATE POLICY "auth_read_fotos"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-integrantes');

CREATE POLICY "auth_insert_fotos"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-integrantes');

CREATE POLICY "auth_delete_fotos"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-integrantes');
