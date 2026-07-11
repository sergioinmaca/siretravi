export function formatAge(fechaNacimiento: Date): string {
  const birth = new Date(fechaNacimiento);
  const today = new Date();

  const totalDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return '';

  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;

  const weeks = Math.floor(totalDays / 7);

  if (years >= 1) return `${years} año${years !== 1 ? 's' : ''}`;
  if (months >= 1) return `${months} mes${months !== 1 ? 'es' : ''}`;
  if (weeks >= 1) return `${weeks} semana${weeks !== 1 ? 's' : ''}`;
  return `${totalDays} día${totalDays !== 1 ? 's' : ''}`;
}
