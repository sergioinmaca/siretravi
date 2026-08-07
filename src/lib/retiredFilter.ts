export function esRetirado(r: { hogar_solidario?: string | null }): boolean {
  return ((r.hogar_solidario || '').trim().toUpperCase()) === 'RETIRADO';
}

export function filtrarActivos<T extends { hogar_solidario?: string | null }>(refugiados: T[]): T[] {
  return refugiados.filter(r => !esRetirado(r));
}

export function camasDeActivos(refugiados: { hogar_solidario?: string | null; nro_cama?: string }[]): string[] {
  return refugiados
    .filter(r => !esRetirado(r))
    .map(r => r.nro_cama)
    .filter((cama): cama is string => !!cama);
}
