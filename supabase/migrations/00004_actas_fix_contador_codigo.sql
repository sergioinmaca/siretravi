-- ============================================================
-- MIGRACIÓN: Fix módulo Actas — contador atómico y unicidad por campamento
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

-- ============================================================
-- 1. RPC atómica para generar el código secuencial del acta.
--    Usa INSERT ... ON CONFLICT ... DO UPDATE para un incremento
--    atómico a nivel de fila (mismo patrón que obtener_siguiente_codigo
--    del módulo de refugiados). Dos llamadas concurrentes nunca
--    obtendrán el mismo código.
-- ============================================================
CREATE OR REPLACE FUNCTION obtener_siguiente_codigo_acta(p_campamento_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secuencia INT;
BEGIN
  INSERT INTO contadores_actas (campamento_id, ultimo_secuencia)
  VALUES (p_campamento_id, 1)
  ON CONFLICT (campamento_id)
  DO UPDATE SET ultimo_secuencia = contadores_actas.ultimo_secuencia + 1
  RETURNING ultimo_secuencia INTO v_secuencia;

  RETURN 'ACT-' || LPAD(v_secuencia::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- 2. Saneamiento: re-sincronizar los contadores con el máximo
--    código REAL de cada campamento. Los intentos fallidos
--    (409 por colisión de código) quemaron números del contador
--    sin insertar actas.
-- ============================================================
UPDATE contadores_actas AS c
SET ultimo_secuencia = COALESCE(
  (SELECT MAX(SUBSTRING(a.codigo FROM 'ACT-([0-9]+)')::INT)
   FROM actas AS a
   WHERE a.campamento_id = c.campamento_id),
  0
);

-- Asegurar fila de contador para campamentos que aún no tienen una
INSERT INTO contadores_actas (campamento_id, ultimo_secuencia)
SELECT id, 0 FROM campamentos
WHERE NOT EXISTS (SELECT 1 FROM contadores_actas WHERE campamento_id = campamentos.id);

-- ============================================================
-- 3. Unicidad por campamento: cada campamento tendrá su propia
--    serie ACT-####. Se elimina el UNIQUE global sobre codigo
--    (que provocaba el 409) y se crea UNIQUE(campamento_id, codigo).
-- ============================================================
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  -- Elimina cualquier constraint UNIQUE de actas que NO incluya campamento_id
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid = 'actas'::regclass
    AND c.contype = 'u'
    AND NOT EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = 'actas'::regclass
        AND a.attname = 'campamento_id'
        AND a.attnum = ANY (c.conkey)
    );

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE actas DROP CONSTRAINT %I', v_conname);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'actas'::regclass AND conname = 'uq_actas_campamento_codigo'
  ) THEN
    ALTER TABLE actas ADD CONSTRAINT uq_actas_campamento_codigo UNIQUE (campamento_id, codigo);
  END IF;
END $$;
