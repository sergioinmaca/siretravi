-- Migración: Tabla de Eventos (Módulo Agenda)
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS eventos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_campamento UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE,
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('permanente', 'unico')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_campamento ON eventos(id_campamento);
CREATE INDEX IF NOT EXISTS idx_eventos_fechas ON eventos(id_campamento, fecha_inicio, fecha_fin);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total eventos" ON eventos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insertar módulo Agenda y sus acciones
INSERT INTO modulos (nombre) VALUES ('Agenda') ON CONFLICT (nombre) DO NOTHING;

DO $$
DECLARE
  v_agenda_id UUID;
BEGIN
  SELECT id INTO v_agenda_id FROM modulos WHERE nombre = 'Agenda';
  INSERT INTO acciones (modulo_id, nombre) VALUES
    (v_agenda_id, 'Ver'), (v_agenda_id, 'Crear')
  ON CONFLICT DO NOTHING;
END $$;
