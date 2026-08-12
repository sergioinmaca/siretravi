import jsPDF from 'jspdf';
import dayjs from './dayjs';
import { NOMBRE_TIPO_COMIDA } from '../types';
import type { CocinaSlot, ComidaMenu } from '../types';
import { formatTime12h } from './formatTime';
import { dividirNombreComida } from './cocina';

interface ExportarMenuSemanalArgs {
  campamentoNombre: string;
  slots: CocinaSlot[];
  comidas: ComidaMenu[];
  dias: dayjs.Dayjs[];
}

const loadImageAsDataUrl = (src: string, maxW?: number, maxH?: number): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (maxW && w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
      if (maxH && h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const sanitizar = (texto: string): string =>
  texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('')
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 0x0a) return true;
      return c > 0x1f && c !== 0x7f && c <= 0xff;
    })
    .join('');

const limpiarNombreCampamento = (nombre: string): string => {
  const limpio = nombre.replace(/^\s*campamento\s+transitorio\s*/i, '').trim();
  return limpio || nombre.trim();
};

const slug = (nombre: string): string =>
  limpiarNombreCampamento(nombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'campamento';

export async function exportarMenuSemanalPDF(args: ExportarMenuSemanalArgs): Promise<void> {
  const { campamentoNombre, slots, comidas, dias } = args;

  if (slots.length === 0) {
    throw new Error('No hay comidas activas para exportar');
  }

  const [logoIzq, logoDer] = await Promise.all([
    loadImageAsDataUrl('/logovererojo.png'),
    loadImageAsDataUrl('/logoalcadia.png'),
  ]);

  const pdf = new jsPDF('l', 'mm', 'letter');
  const pageW = 279.4;

  const mapa = new Map<string, ComidaMenu>();
  comidas.forEach((c) => mapa.set(`${c.fecha}|${c.tipo}`, c));

  // ── Geometría (replicando la plantilla) ──────────────────────────────────
  const margen = 5.29;
  const tableW = 267.7;
  const colDiaW = 16.7;
  const mealW = (tableW - colDiaW) / slots.length;

  const colX: number[] = [margen];
  let acc = margen + colDiaW;
  for (let i = 0; i < slots.length; i++) {
    colX.push(acc);
    acc += mealW;
  }
  colX.push(margen + tableW);

  const bandaAzulY = 4.3;
  const bandaAzulH = 15.9;
  const bandaRojaY = 22.0;
  const bandaRojaH = 9.3;
  const yTabla = 31.5;
  const headerH = 13.4;
  const rowHeights = [25.0, 25.0, 25.0, 23.1, 25.0, 20.5, 25.0];

  const rowYs: number[] = [];
  let yRow = yTabla + headerH;
  for (let i = 0; i < 7; i++) {
    rowYs.push(yRow);
    yRow += rowHeights[i];
  }
  const yTablaFin = yRow;

  // ── Banda azul ───────────────────────────────────────────────────────────
  pdf.setFillColor(47, 85, 151);
  pdf.rect(32, bandaAzulY, pageW - 64, bandaAzulH, 'F');
  pdf.setDrawColor(23, 44, 81);
  pdf.setLineWidth(0.4);
  pdf.rect(32, bandaAzulY, pageW - 64, bandaAzulH, 'S');

  if (logoIzq) {
    const logoH = 13;
    const logoW = logoH * 1.35;
    pdf.addImage(logoIzq, 'PNG', 8, bandaAzulY + (bandaAzulH - logoH) / 2, logoW, logoH);
  }
  if (logoDer) {
    const logoH = 13;
    const logoW = logoH * 0.75;
    pdf.addImage(logoDer, 'PNG', pageW - 8 - logoW, bandaAzulY + (bandaAzulH - logoH) / 2, logoW, logoH);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('CAMPAMENTO TRANSITORIO', pageW / 2, bandaAzulY + 6, { align: 'center' });
  pdf.setFontSize(18);
  pdf.text(`\u201C${sanitizar(limpiarNombreCampamento(campamentoNombre))}\u201D`, pageW / 2, bandaAzulY + 13.5, { align: 'center' });

  // ── Banda roja ───────────────────────────────────────────────────────────
  pdf.setFillColor(192, 0, 0);
  pdf.rect(margen, bandaRojaY, tableW, bandaRojaH, 'F');
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  pdf.line(margen, bandaRojaY, margen + tableW, bandaRojaY);
  pdf.line(margen, bandaRojaY + bandaRojaH, margen + tableW, bandaRojaY + bandaRojaH);

  const tituloRojo = `MEN\u00DA SEMANAL DEL ${dias[0].format('DD/MM/YYYY')} AL ${dias[6].format('DD/MM/YYYY')}`;
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(15.35);
  pdf.setTextColor(255, 255, 255);
  pdf.text(tituloRojo, pageW / 2, bandaRojaY + 6.4, { align: 'center' });

  // ── Cabecera de la tabla ─────────────────────────────────────────────────
  pdf.setFillColor(165, 165, 165);
  pdf.rect(margen, yTabla, tableW, headerH, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('Helvetica', 'bold');
  pdf.text('D\u00CDA', colX[0] + colDiaW / 2, yTabla + 7.2, { align: 'center' });

  slots.forEach((slot, i) => {
    const cx = colX[i + 1] + mealW / 2;
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(sanitizar(dividirNombreComida(NOMBRE_TIPO_COMIDA[slot.tipo]).titulo).toUpperCase(), cx, yTabla + 6, { align: 'center' });
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`HORA: ${formatTime12h(slot.hora_servicio)}`, cx, yTabla + 11.4, { align: 'center' });
  });

  // ── Filas de días ────────────────────────────────────────────────────────
  rowHeights.forEach((rh, i) => {
    const rowY = rowYs[i];
    const fill = i % 2 === 0 ? [225, 225, 225] : [240, 240, 240];
    pdf.setFillColor(fill[0], fill[1], fill[2]);
    pdf.rect(margen, rowY, tableW, rh, 'F');

    const nombreDia = dias[i].format('dddd').toUpperCase();
    const fechaDia = dias[i].format('DD/MM');
    const fontSizeDia = Math.min(11, ((rh - 3) * 2.835) / (nombreDia.length * 0.55));
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(fontSizeDia);
    pdf.setTextColor(0, 0, 0);
    const anchoDia = pdf.getTextWidth(nombreDia);
    const altoDia = fontSizeDia * 0.3528;
    const offsetX = 4;
    const xDia = colX[0] + 2 + altoDia / 2 + offsetX;
    pdf.text(nombreDia, xDia, rowY + rh / 2 + anchoDia / 2, { angle: 90 });

    pdf.setFontSize(8);
    const fechaAncho = pdf.getTextWidth(fechaDia);
    const altoFecha = 8 * 0.3528;
    const xFecha = xDia + altoDia / 2 + 1.5 + altoFecha / 2;
    pdf.text(fechaDia, xFecha, rowY + rh / 2 + fechaAncho / 2, { angle: 90 });

    const fecha = dias[i].format('YYYY-MM-DD');
    const padding = 2;
    const dibujarTexto = (texto: string, cellX: number, cellW: number, ty: number): number => {
      const parrafos = sanitizar(texto).split('\n');
      for (const parrafo of parrafos) {
        const lineas = pdf.splitTextToSize(parrafo, cellW);
        for (const ln of lineas) {
          if (ty > rowY + rh - 2.5) return ty;
          pdf.text(ln, cellX, ty);
          ty += 3.4;
        }
      }
      return ty;
    };
    slots.forEach((slot, j) => {
      const comida = mapa.get(`${fecha}|${slot.tipo}`);
      if (!comida) return;
      const cellX = colX[j + 1] + padding;
      const cellW = mealW - padding * 2;
      let ty = rowY + padding + 3;
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      ty = dibujarTexto(comida.menu, cellX, cellW, ty);
      if (comida.bebida) {
        ty = dibujarTexto(comida.bebida, cellX, cellW, ty);
      }
    });
  });

  // ── Separadores ──────────────────────────────────────────────────────────
  pdf.setFillColor(255, 255, 255);
  pdf.rect(margen, yTabla - 0.3, tableW, 0.6, 'F');
  for (let i = 0; i <= 7; i++) {
    const by = yTabla + headerH + rowHeights.slice(0, i).reduce((a, b) => a + b, 0);
    pdf.rect(margen, by - 0.3, tableW, 0.6, 'F');
  }
  pdf.rect(margen, yTablaFin - 0.3, tableW, 0.6, 'F');

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);
  for (let i = 0; i < colX.length; i++) {
    pdf.line(colX[i], yTabla, colX[i], yTablaFin);
  }

  const fechaArchivo = dias[0].format('YYYYMMDD');
  pdf.save(`menu-semanal-${slug(campamentoNombre)}-${fechaArchivo}.pdf`);
}
