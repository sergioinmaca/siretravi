-- ================================================
-- SIRETRAVI - Script de Creación de Base de Datos
-- Pegar en el SQL Editor de Supabase y ejecutar
-- ================================================

-- Tabla: campamentos
CREATE TABLE IF NOT EXISTS campamentos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  ubicacion   TEXT NOT NULL,
  capacidad_maxima INTEGER NOT NULL DEFAULT 0,
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  tipo_contabilizacion TEXT NOT NULL DEFAULT 'elemento' CHECK (tipo_contabilizacion IN ('cama', 'elemento')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Migración para bases de datos existentes (si la columna no existe)
ALTER TABLE campamentos ADD COLUMN IF NOT EXISTS tipo_contabilizacion TEXT NOT NULL DEFAULT 'elemento' CHECK (tipo_contabilizacion IN ('cama', 'elemento'));

-- Tabla: carpas (relacionada con campamentos)
CREATE TABLE IF NOT EXISTS carpas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id        UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  nombre               TEXT NOT NULL,
  literas              INTEGER NOT NULL DEFAULT 0,
  camas_individuales   INTEGER NOT NULL DEFAULT 0,
  camas_duplex         INTEGER NOT NULL DEFAULT 0,
  croquis_data         TEXT,              -- JSON serializado del canvas
  orden                INTEGER DEFAULT 0, -- Para mantener el orden de las carpas
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: familias
CREATE TABLE IF NOT EXISTS familias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: refugiados
CREATE TABLE IF NOT EXISTS refugiados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campamento_id   UUID NOT NULL REFERENCES campamentos(id) ON DELETE CASCADE,
  familia_id      UUID REFERENCES familias(id) ON DELETE SET NULL,
  nombres         TEXT NOT NULL,
  apellidos       TEXT NOT NULL,
  cedula          BIGINT,
  genero          BOOLEAN NOT NULL,      -- true = masculino, false = femenino
  fecha_nacimiento DATE NOT NULL,
  es_jefe_familia BOOLEAN NOT NULL DEFAULT false,
  nro_cama        TEXT,
  procedencia     TEXT,
  discapacidad    BOOLEAN NOT NULL DEFAULT false,
  tipo_discapacidad TEXT,
  embarazo        BOOLEAN NOT NULL DEFAULT false,
  tiempo_embarazo INTEGER,
  mascotas        BOOLEAN NOT NULL DEFAULT false,
  tipo_mascota    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ÍNDICES para mejorar rendimiento de consultas
-- ================================================
CREATE INDEX IF NOT EXISTS idx_carpas_campamento ON carpas(campamento_id);
CREATE INDEX IF NOT EXISTS idx_familias_campamento ON familias(campamento_id);
CREATE INDEX IF NOT EXISTS idx_refugiados_campamento ON refugiados(campamento_id);
CREATE INDEX IF NOT EXISTS idx_refugiados_familia ON refugiados(familia_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS) - Acceso abierto de lectura
-- y escritura para la anon key (ajustar según necesidades)
-- ================================================
ALTER TABLE campamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpas ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE refugiados ENABLE ROW LEVEL SECURITY;

-- Políticas que permiten acceso total al rol anon (público)
-- NOTA: En producción real, restringir con autenticación de usuarios
CREATE POLICY "Acceso total campamentos" ON campamentos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total carpas" ON carpas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total familias" ON familias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total refugiados" ON refugiados FOR ALL TO anon USING (true) WITH CHECK (true);

-- ================================================
-- Tablas del módulo de Usuarios y Permisos
-- ================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname        TEXT NOT NULL UNIQUE,
  nombres         TEXT NOT NULL,
  apellidos       TEXT NOT NULL,
  clave           TEXT NOT NULL,
  es_master       BOOLEAN NOT NULL DEFAULT false,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modulos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id       UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permisos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id       UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  acciones        TEXT[] NOT NULL DEFAULT '{}',
  campamentos     TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS idx_permisos_usuario ON permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON permisos(modulo_id);
CREATE INDEX IF NOT EXISTS idx_acciones_modulo ON acciones(modulo_id);

INSERT INTO modulos (nombre) VALUES
  ('Inicio'), ('Refugiados'), ('Familias'), ('Constructor'), ('Reportes'), ('Usuarios')
ON CONFLICT (nombre) DO NOTHING;

DO $$
DECLARE
  v_inicio_id UUID; v_refugiados_id UUID; v_familias_id UUID;
  v_constructor_id UUID; v_reportes_id UUID; v_usuarios_id UUID;
BEGIN
  SELECT id INTO v_inicio_id FROM modulos WHERE nombre = 'Inicio';
  SELECT id INTO v_refugiados_id FROM modulos WHERE nombre = 'Refugiados';
  SELECT id INTO v_familias_id FROM modulos WHERE nombre = 'Familias';
  SELECT id INTO v_constructor_id FROM modulos WHERE nombre = 'Constructor';
  SELECT id INTO v_reportes_id FROM modulos WHERE nombre = 'Reportes';
  SELECT id INTO v_usuarios_id FROM modulos WHERE nombre = 'Usuarios';

  INSERT INTO acciones (modulo_id, nombre) VALUES
    (v_inicio_id, 'Ver'),
    (v_refugiados_id, 'Ver'), (v_refugiados_id, 'Crear'), (v_refugiados_id, 'Modificar'), (v_refugiados_id, 'Eliminar'),
    (v_familias_id, 'Ver'),
    (v_constructor_id, 'Ver'), (v_constructor_id, 'Crear'), (v_constructor_id, 'Modificar'), (v_constructor_id, 'Eliminar'),
    (v_reportes_id, 'Ver'),
    (v_usuarios_id, 'Ver'), (v_usuarios_id, 'Crear'), (v_usuarios_id, 'Modificar'), (v_usuarios_id, 'Eliminar')
  ON CONFLICT DO NOTHING;
END $$;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total usuarios" ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total modulos" ON modulos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total acciones" ON acciones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total permisos" ON permisos FOR ALL TO anon USING (true) WITH CHECK (true);
