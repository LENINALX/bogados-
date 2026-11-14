import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/** Generadores de archivos de exportación: una misma tabla sale como Excel o como PDF. */

export type ExportFormat = 'xlsx' | 'pdf';
export const EXPORT_FORMATS: ExportFormat[] = ['xlsx', 'pdf'];

export const EXPORT_MIME: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};
export const EXPORT_LABEL: Record<ExportFormat, string> = { xlsx: 'Excel', pdf: 'PDF' };

/** Las fechas viajan como AAAA-MM-DD ya en la hora de la firma: un archivo no tiene zona horaria. */
export type Cell = string | number | null;

export type ExportColumn = {
  header: string;
  /** Ancho: caracteres en Excel y proporción del ancho de la página en el PDF */
  width: number;
  kind?: 'text' | 'date' | 'number';
};

export type ExportTable = {
  /** «Casos», «Clientes» */
  title: string;
  firmName: string;
  /** Bajo el título: qué se exportó, con qué filtros, cuándo y quién */
  details: string[];
  columns: ExportColumn[];
  rows: Cell[][];
};

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Medianoche UTC de ese día: Excel guarda las fechas sin zona y así muestra el día correcto. */
function ymdToDate(ymd: string): Date | null {
  const m = YMD.exec(ymd);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

function ymdToText(ymd: string): string {
  const m = YMD.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

// ─── Excel ──────────────────────────────────────────────────────────────────

/**
 * Una hoja con cabecera fija y filtros, y otra con los datos de la exportación.
 * Los textos se escriben siempre como texto: «=1+1» en un título no se convierte en fórmula.
 */
export async function buildXlsx(table: ExportTable): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bogados';
  wb.created = new Date();

  const ws = wb.addWorksheet(table.title, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = table.columns.map((c) => ({
    header: c.header,
    width: c.width,
    style: c.kind === 'date' ? { numFmt: 'dd/mm/yyyy', alignment: { horizontal: 'left' } } : {},
  }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3D38' } };
  header.alignment = { vertical: 'middle' };
  header.height = 20;

  for (const row of table.rows) {
    ws.addRow(
      row.map((value, i) =>
        table.columns[i].kind === 'date' && typeof value === 'string' ? ymdToDate(value) : value,
      ),
    );
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.columns.length } };

  const info = wb.addWorksheet('Información');
  info.columns = [{ width: 90 }];
  info.addRow([table.firmName]).font = { bold: true, size: 13 };
  info.addRow([table.title]).font = { bold: true };
  for (const line of table.details) info.addRow([line]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ─── PDF ────────────────────────────────────────────────────────────────────

/** Caracteres de Windows-1252 por encima de Latin-1 que las fuentes estándar del PDF sí tienen. */
const CP1252_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const PDF_CELL_MAX = 300;

/**
 * Las fuentes estándar del PDF solo cubren Windows-1252 (tildes y ñ incluidas). Lo demás
 * (emoji, otros alfabetos) saldría como basura: se sustituye por «?». Los saltos de línea
 * y demás caracteres de control pasan a espacios.
 */
export function pdfText(value: string): string {
  let out = '';
  for (const ch of value.normalize('NFC')) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) out += ' ';
    else if (code < 0x80 || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRA.includes(ch)) out += ch;
    else out += '?';
  }
  return out;
}

function pdfCell(value: Cell, column: ExportColumn): string {
  if (value === null || value === '') return '';
  if (column.kind === 'date' && typeof value === 'string') return ymdToText(value);
  const text = pdfText(String(value));
  return text.length > PDF_CELL_MAX ? `${text.slice(0, PDF_CELL_MAX - 1)}…` : text;
}

const PDF = {
  margin: 36,
  headerHeight: 18,
  pad: 4,
  fontSize: 8,
  brand: '#1f3d38',
  zebra: '#f6f4ee',
  line: '#e3dfd4',
} as const;

/** A4 apaisado: cabecera de la firma, tabla con la fila de títulos en cada página y numeración. */
export function buildPdf(table: ExportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: PDF.margin,
      bufferPages: true,
      info: { Title: pdfText(`${table.title} · ${table.firmName}`), Author: pdfText(table.firmName), Creator: 'Bogados' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = PDF.margin;
    const width = doc.page.width - 2 * PDF.margin;
    // Hueco al pie para «Página X de Y»
    const bottom = doc.page.height - PDF.margin - 16;
    const totalWidth = table.columns.reduce((sum, c) => sum + c.width, 0);
    const colWidths = table.columns.map((c) => (c.width / totalWidth) * width);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(PDF.brand).text(pdfText(table.title), left, PDF.margin);
    doc.font('Helvetica').fontSize(10).fillColor('#333333').text(pdfText(table.firmName));
    doc.fontSize(8.5).fillColor('#666666');
    for (const line of table.details) doc.text(pdfText(line));
    let y = doc.y + 10;

    const drawHeader = () => {
      doc.rect(left, y, width, PDF.headerHeight).fill(PDF.brand);
      doc.font('Helvetica-Bold').fontSize(PDF.fontSize).fillColor('#ffffff');
      let x = left;
      table.columns.forEach((c, i) => {
        doc.text(pdfText(c.header), x + PDF.pad, y + 5, { width: colWidths[i] - 2 * PDF.pad, lineBreak: false });
        x += colWidths[i];
      });
      y += PDF.headerHeight;
      doc.font('Helvetica').fontSize(PDF.fontSize);
    };
    drawHeader();

    table.rows.forEach((row, n) => {
      const texts = row.map((value, i) => pdfCell(value, table.columns[i]));
      const height =
        Math.max(...texts.map((t, i) => doc.heightOfString(t || ' ', { width: colWidths[i] - 2 * PDF.pad }))) + 2 * PDF.pad;
      if (y + height > bottom) {
        doc.addPage();
        y = PDF.margin;
        drawHeader();
      }
      if (n % 2 === 1) doc.rect(left, y, width, height).fill(PDF.zebra);
      doc.fillColor('#222222');
      let x = left;
      texts.forEach((t, i) => {
        doc.text(t, x + PDF.pad, y + PDF.pad, { width: colWidths[i] - 2 * PDF.pad });
        x += colWidths[i];
      });
      y += height;
      doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(PDF.line).stroke();
    });
    if (!table.rows.length) {
      doc.fillColor('#666666').text('No hay registros con estos filtros.', left, y + 12);
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      // Sin margen inferior: si no, escribir tan abajo abriría una página nueva
      doc.page.margins.bottom = 0;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#888888')
        .text(`Página ${i + 1} de ${pages.count}`, left, doc.page.height - 28, { width, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}

export function buildExport(format: ExportFormat, table: ExportTable): Promise<Buffer> {
  return format === 'xlsx' ? buildXlsx(table) : buildPdf(table);
}
