export interface Parroquia {
  nombre: string;
}

export interface Municipio {
  nombre: string;
  parroquias: Parroquia[];
}

export interface Estado {
  nombre: string;
  municipios: Municipio[];
}

export const ESTADOS: Estado[] = [
  {
    nombre: 'DISTRITO CAPITAL',
    municipios: [
      {
        nombre: 'LIBERTADOR',
        parroquias: [
          { nombre: '23 DE ENERO' },
          { nombre: 'ALTAGRACIA' },
          { nombre: 'ANTIMANO' },
          { nombre: 'CARICUAO' },
          { nombre: 'CATEDRAL' },
          { nombre: 'COCHE' },
          { nombre: 'EL JUNQUITO' },
          { nombre: 'EL PARAISO' },
          { nombre: 'EL RECREO' },
          { nombre: 'EL VALLE' },
          { nombre: 'LA CANDELARIA' },
          { nombre: 'LA PASTORA' },
          { nombre: 'LA VEGA' },
          { nombre: 'MACARAO' },
          { nombre: 'SAN AGUSTIN' },
          { nombre: 'SAN BERNARDINO' },
          { nombre: 'SAN JOSE' },
          { nombre: 'SAN JUAN' },
          { nombre: 'SAN PEDRO' },
          { nombre: 'SANTA ROSALIA' },
          { nombre: 'SANTA TERESA' },
          { nombre: 'SUCRE' },
        ],
      },
    ],
  },
  {
    nombre: 'LA GUAIRA',
    municipios: [
      {
        nombre: 'VARGAS',
        parroquias: [
          { nombre: 'CARABALLEDA' },
          { nombre: 'CARAYACA' },
          { nombre: 'CARLOS SOUBLETTE' },
          { nombre: 'CARUAO' },
          { nombre: 'CATIA LA MAR' },
          { nombre: 'EL JUNKO' },
          { nombre: 'LA GUAIRA' },
          { nombre: 'MACUTO' },
          { nombre: 'MAIQUETIA' },
          { nombre: 'NAIGUATA' },
          { nombre: 'URIMARE' },
        ],
      },
    ],
  },
  {
    nombre: 'MIRANDA',
    municipios: [
      {
        nombre: 'ACEVEDO',
        parroquias: [
          { nombre: 'ARAGUITA' },
          { nombre: 'AREVALO GONZALEZ' },
          { nombre: 'CAPAYA' },
          { nombre: 'CAUCAGUA' },
          { nombre: 'EL CAFE' },
          { nombre: 'MARIZAPA' },
          { nombre: 'PANAQUIRE' },
          { nombre: 'RIBAS' },
        ],
      },
      {
        nombre: 'ANDRES BELLO',
        parroquias: [
          { nombre: 'CUMBO' },
          { nombre: 'SAN JOSE DE BARLOVENTO' },
        ],
      },
      {
        nombre: 'BARUTA',
        parroquias: [
          { nombre: 'BARUTA' },
          { nombre: 'EL CAFETAL' },
          { nombre: 'LAS MINAS' },
        ],
      },
      {
        nombre: 'BRION',
        parroquias: [
          { nombre: 'HIGUEROTE' },
          { nombre: 'CURIEPE' },
          { nombre: 'TACARIGUA' },
        ],
      },
      {
        nombre: 'BUROZ',
        parroquias: [
          { nombre: 'MAMPORAL' },
        ],
      },
      {
        nombre: 'CARRIZAL',
        parroquias: [
          { nombre: 'CARRIZAL' },
        ],
      },
      {
        nombre: 'CHACAO',
        parroquias: [
          { nombre: 'CHACAO' },
        ],
      },
      {
        nombre: 'CRISTOBAL ROJAS',
        parroquias: [
          { nombre: 'CHARALLAVE' },
          { nombre: 'LAS BRISAS' },
        ],
      },
      {
        nombre: 'EL HATILLO',
        parroquias: [
          { nombre: 'EL HATILLO' },
        ],
      },
      {
        nombre: 'GUAICAIPURO',
        parroquias: [
          { nombre: 'LOS TEQUES' },
          { nombre: 'SAN PEDRO DE LOS ALTOS' },
          { nombre: 'PARACOTOS' },
          { nombre: 'TACATA' },
          { nombre: 'ALTAGRACIA DE LA MONTAÑA' },
          { nombre: 'CECILIO ACOSTA' },
          { nombre: 'EL JARILLO' },
        ],
      },
      {
        nombre: 'INDEPENDENCIA',
        parroquias: [
          { nombre: 'EL CARTANAL' },
          { nombre: 'SANTA TERESA DEL TUY' },
        ],
      },
      {
        nombre: 'LOS SALIAS',
        parroquias: [
          { nombre: 'SAN ANTONIO DE LOS ALTOS' },
        ],
      },
      {
        nombre: 'PAEZ',
        parroquias: [
          { nombre: 'RIO CHICO' },
          { nombre: 'PAPARO' },
          { nombre: 'TACARIGUA DE LA LAGUNA' },
          { nombre: 'EL GUAPO' },
          { nombre: 'SAN FERNANDO DEL GUAPO' },
        ],
      },
      {
        nombre: 'PAZ CASTILLO',
        parroquias: [
          { nombre: 'SANTA LUCIA DEL TUY' },
        ],
      },
      {
        nombre: 'PEDRO GUAL',
        parroquias: [
          { nombre: 'CUPIRA' },
          { nombre: 'MACHURUCUTO' },
        ],
      },
      {
        nombre: 'PLAZA',
        parroquias: [
          { nombre: 'GUARENAS' },
        ],
      },
      {
        nombre: 'SIMON BOLIVAR',
        parroquias: [
          { nombre: 'SAN FRANCISCO DE YARE' },
          { nombre: 'SAN ANTONIO DE YARE' },
        ],
      },
      {
        nombre: 'SUCRE',
        parroquias: [
          { nombre: 'PETARE' },
          { nombre: 'LEONCIO MARTINEZ' },
          { nombre: 'CAUCAGUITA' },
          { nombre: 'FILAS DE MARICHE' },
          { nombre: 'LA DOLORITA' },
        ],
      },
      {
        nombre: 'TOMAS LANDER',
        parroquias: [
          { nombre: 'OCUMARE DEL TUY' },
          { nombre: 'LA DEMOCRACIA' },
          { nombre: 'SANTA BARBARA' },
        ],
      },
      {
        nombre: 'URDANETA',
        parroquias: [
          { nombre: 'CUA' },
          { nombre: 'NUEVA CUA' },
        ],
      },
      {
        nombre: 'ZAMORA',
        parroquias: [
          { nombre: 'GUATIRE' },
          { nombre: 'BOLIVAR' },
        ],
      },
    ],
  },
];

export const ESTADOS_ORDEANDOS = ESTADOS.map(e => e.nombre).sort();

export const MUNICIPIOS_POR_ESTADO: Record<string, string[]> = {};
ESTADOS.forEach(estado => {
  MUNICIPIOS_POR_ESTADO[estado.nombre] = estado.municipios
    .map(m => m.nombre)
    .sort();
});

export const PARROQUIAS_POR_MUNICIPIO: Record<string, string[]> = {};
ESTADOS.forEach(estado => {
  estado.municipios.forEach(municipio => {
    PARROQUIAS_POR_MUNICIPIO[municipio.nombre] = municipio.parroquias
      .map(p => p.nombre)
      .sort();
  });
});
