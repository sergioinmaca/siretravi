-- ================================================
-- SIRETRAVI - Migración: Función para listar fotos huérfanas
-- Ejecutar en el SQL Editor de Supabase
-- ================================================

-- Función RPC que retorna las fotos en Storage que NO están referenciadas
-- por ningún registro en la tabla refugiados (ni foto_url ni mascota_foto_url).
CREATE OR REPLACE FUNCTION listar_fotos_huerfanas()
RETURNS TABLE (
  storage_path text,
  campamento_id text,
  refugiado_id text,
  tipo text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH fotos_en_storage AS (
    SELECT
      o.name AS storage_path,
      split_part(o.name, '/', 1) AS campamento_id,
      split_part(o.name, '/', 2) AS refugiado_id,
      CASE WHEN o.name LIKE '%/mascota/%' THEN 'mascota' ELSE 'persona' END AS tipo
    FROM storage.objects o
    WHERE o.bucket_id = 'fotos-integrantes'
      AND o.name LIKE '%/%'
  ),
  rutas_referenciadas AS (
    SELECT substring(r.foto_url FROM '/fotos-integrantes/([^?#]+)') AS ruta
    FROM refugiados r
    WHERE r.foto_url IS NOT NULL
    UNION
    SELECT substring(r.mascota_foto_url FROM '/fotos-integrantes/([^?#]+)') AS ruta
    FROM refugiados r
    WHERE r.mascota_foto_url IS NOT NULL
  )
  SELECT
    f.storage_path,
    f.campamento_id,
    f.refugiado_id,
    f.tipo
  FROM fotos_en_storage f
  WHERE f.storage_path NOT IN (
    SELECT ruta FROM rutas_referenciadas WHERE ruta IS NOT NULL
  )
  ORDER BY f.storage_path;
$$;
