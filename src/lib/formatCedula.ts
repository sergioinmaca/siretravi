export function formatCedula(cedula: number | undefined | null, nacionalidad?: string | null): string | null {
  if (cedula == null) return null;
  const prefijo = nacionalidad ? `${nacionalidad}-` : '';
  return prefijo + cedula.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
