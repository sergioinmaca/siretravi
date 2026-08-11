-- Migración: Módulo Cocina — tablas cocina_slots y cocina_menu
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS cocina_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('desayuno','merienda_1','almuerzo','merienda_2','cena','merienda_3')),
  activo        BOOLEAN NOT NULL DEFAULT false,
  hora_servicio TIME NOT NULL DEFAULT '07:00',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campamento_id, tipo)
);

CREATE TABLE IF NOT EXISTS cocina_menu (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('desayuno','merienda_1','almuerzo','merienda_2','cena','merienda_3')),
  menu          TEXT NOT NULL,
  raciones      INTEGER NOT NULL DEFAULT 0,
  hora_servicio TIME NOT NULL,
  responsable   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campamento_id, fecha, tipo)
);

CREATE INDEX IF NOT EXISTS idx_cocina_menu_camp_fecha ON cocina_menu(campamento_id, fecha);

ALTER TABLE cocina_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocina_menu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total cocina_slots" ON cocina_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total cocina_menu" ON cocina_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertar módulo Cocina y sus acciones
INSERT INTO modulos (nombre) VALUES ('Cocina') ON CONFLICT (nombre) DO NOTHING;

DO $$
DECLARE
  v_cocina_id UUID;
BEGIN
  SELECT id INTO v_cocina_id FROM modulos WHERE nombre = 'Cocina';
  INSERT INTO acciones (modulo_id, nombre) VALUES
    (v_cocina_id, 'Ver'), (v_cocina_id, 'Crear'), (v_cocina_id, 'Modificar'), (v_cocina_id, 'Eliminar')
  ON CONFLICT DO NOTHING;
END $$;
