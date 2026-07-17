export function formatCedula(cedula: number | undefined | null): string | null {
  if (cedula == null) return null;
  return cedula.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
