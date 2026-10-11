import { jsPDF } from 'jspdf';
import { buildTransactionsExportSheets } from './transactionsExport';

// jsPDF's built-in font cannot reproduce emoji/non-BMP pictograms.
// The original data remains untouched in XLSX/CSV/Firestore.
const printable = (value) => String(value ?? '')
  .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
  .replace(/[\x00-\x1F\x7F]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const formatAmount = (value) => {
  if (value === '' || value === null || value === undefined) return 'N/D';
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(numeric)
    : 'N/D';
};

/**
 * Private, entirely browser-side PDF: keeps every exported movement, with
 * explicit currencies, filters, paging and an LTC$ mark on every page.
 */
export const buildTransactionsPdf = (rows = [], categories = [], filters = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No hay movimientos para exportar.');
  }
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({
    title: 'LTC$ - Exportación de movimientos',
    subject: 'Movimientos registrados según los filtros seleccionados',
    author: 'LTC$',
    creator: 'LTC$ - Lleva tus cuentas',
  });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = w - 2 * margin;
  const lowerLimit = h - 20;
  let y = 37;
  const drawHeader = () => {
    pdf.setFillColor(79, 37, 155);
    pdf.rect(0, 0, w, 25, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.setTextColor(255, 255, 255);
    pdf.text('LTC$', margin, 13);
    pdf.setFontSize(9);
    pdf.text('Movimientos exportados', margin, 20);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
  };
  const nextPage = () => {
    pdf.addPage();
    drawHeader();
    y = 34;
  };
  const ensureSpace = (height = 5) => {
    if (y + height > lowerLimit) nextPage();
  };
  const print = (text, { bold = false, indent = 0, extra = 0, color = [30, 41, 59] } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(printable(text) || '-', contentWidth - indent);
    for (const line of lines) {
      ensureSpace(4.5);
      pdf.text(line, margin + indent, y);
      y += 4.6;
    }
    y += extra;
  };

  drawHeader();
  print('Registros: ' + rows.length + ' | Período: ' +
    (filters.periodLabel || filters.period || 'Vista actual'), { bold: true, extra: 2 });
  print('Búsqueda: ' + (filters.query || 'Sin búsqueda') +
    ' | Categoría: ' + (filters.category || 'Todas') +
    ' | Tipo: ' + (filters.type === 'expense' ? 'Gastos' : filters.type === 'income' ? 'Ingresos' : 'Todos'), { extra: 2 });
  print('ARS y USD se presentan por separado. Las conversiones no se clasifican automáticamente como ganancias o gastos.',
    { color: [100, 116, 139], extra: 4 });

  const exported = buildTransactionsExportSheets(rows, categories, filters).Movimientos.slice(1);
  exported.forEach((cells, index) => {
    const [date, name, category, classification, ars, usd, exchangeRate, closeDate, due, status, comment, nativeCurrency, nativeUsd] = cells;
    ensureSpace(18);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y - 2, w - margin, y - 2);
    print((index + 1) + '. ' + (date || 'Sin fecha') + ' — ' + (name || 'Sin nombre'), { bold: true });
    print('Categoría: ' + (category || 'Sin categoría') + ' | Tipo: ' + classification, { indent: 2 });
    if (nativeCurrency === 'USD') {
      print('Gasto/ingreso USD: ' + formatAmount(nativeUsd) + ' | Sin conversión de divisas', { indent: 2 });
    } else {
      print('ARS registrado: ' + formatAmount(ars) + ' | USD divisas: ' + formatAmount(usd) +
        ' | Cotización ARS/USD: ' + formatAmount(exchangeRate), { indent: 2 });
    }
    if (closeDate || due || status) {
      print('Cierre: ' + (closeDate || 'N/D') + ' | Vencimiento: ' + (due || 'N/D') +
        ' | Estado: ' + (status || 'N/D'), { indent: 2 });
    }
    if (comment) print('Descripción: ' + comment, { indent: 2 });
    y += 2;
  });

  const totalPages = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 231, 240);
    pdf.line(margin, h - 15, w - margin, h - 15);
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('LTC$ · Exportación privada, datos ingresados por el usuario', margin, h - 10);
    pdf.text('Página ' + page + '/' + totalPages, w - margin, h - 10, { align: 'right' });
  }
  return pdf.output('blob');
};
