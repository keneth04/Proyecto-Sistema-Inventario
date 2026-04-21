import { useMemo, useState } from 'react';
import { ReportApi } from '../api/endpoints';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import { formatDateTime, getErrorMessage } from '../utils/format';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
};

const REPORT_OPTIONS = [
  { value: 'assetsByStatus', label: 'Activos por estado', filename: 'activos-por-estado' },
  { value: 'activeLoans', label: 'Préstamos activos', filename: 'prestamos-activos' },
  { value: 'loanHistory', label: 'Historial de préstamos', filename: 'historial-prestamos' },
  { value: 'retiredAssets', label: 'Activos retirados', filename: 'activos-retirados' },
  { value: 'inventoryGeneral', label: 'Inventario general', filename: 'inventario-general' }
];

const toSpreadsheetCell = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
};

const downloadExcel = ({ filename, columns, rows }) => {
  const headerXml = columns
    .map((column) => `<Cell><Data ss:Type="String">${toSpreadsheetCell(column.label)}</Data></Cell>`)
    .join('');

  const rowsXml = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<Cell><Data ss:Type="String">${toSpreadsheetCell(column.accessor(row))}</Data></Cell>`)
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const workbookXml = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <Worksheet ss:Name="Reporte">
      <Table>
        <Row>${headerXml}</Row>
        ${rowsXml}
      </Table>
    </Worksheet>
  </Workbook>`;

  const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.xls`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const mapRowsByReport = (reportKey, responseBody) => {
  if (reportKey === 'loanHistory') return responseBody.items || [];
  return responseBody || [];
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState('inventoryGeneral');
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [range, setRange] = useState({ from: '', to: '' });
  const { push } = useToast();

  const reportConfig = useMemo(() => {
    const currentOption = REPORT_OPTIONS.find((option) => option.value === reportType) || REPORT_OPTIONS[0];

    const config = {
      assetsByStatus: {
        columns: [
          { key: 'assetCode', label: 'Código' },
          { key: 'name', label: 'Activo' },
          { key: 'category', label: 'Categoría' },
          { key: 'statusLabel', label: 'Estado' },
          { key: 'totalQuantity', label: 'Stock total' },
          { key: 'availableQuantity', label: 'Disponible' },
          { key: 'loanedQuantity', label: 'Prestado' }
        ],
        fetcher: () => ReportApi.assetsByStatus(),
        filename: currentOption.filename
      },
      activeLoans: {
        columns: [
          { key: 'loanId', label: 'Préstamo #' },
          { key: 'employeeName', label: 'Empleado' },
          { key: 'employeeCode', label: 'Código empleado' },
          { key: 'loanDate', label: 'Fecha préstamo', render: (row) => formatDateTime(row.loanDate) },
          { key: 'expectedReturnDate', label: 'Fecha esperada', render: (row) => (row.expectedReturnDate ? formatDate(row.expectedReturnDate) : '—') },
          { key: 'status', label: 'Estado' },
          { key: 'pendingUnits', label: 'Unidades pendientes' }
        ],
        fetcher: () => ReportApi.activeLoans(),
        filename: currentOption.filename
      },
      loanHistory: {
        columns: [
          { key: 'loanId', label: 'Préstamo #' },
          { key: 'employeeName', label: 'Empleado' },
          { key: 'loanDate', label: 'Fecha préstamo', render: (row) => formatDateTime(row.loanDate) },
          { key: 'status', label: 'Estado' },
          { key: 'deliveredBy', label: 'Entregado por' },
          { key: 'totalUnits', label: 'Unidades prestadas' },
          { key: 'returnedUnits', label: 'Unidades devueltas' }
        ],
        fetcher: () => ReportApi.loanHistory({ from: range.from || undefined, to: range.to || undefined }),
        filename: currentOption.filename
      },
      retiredAssets: {
        columns: [
          { key: 'assetCode', label: 'Código' },
          { key: 'name', label: 'Activo' },
          { key: 'category', label: 'Categoría' },
          { key: 'retiredAt', label: 'Retirado el', render: (row) => formatDateTime(row.retiredAt) },
          { key: 'description', label: 'Observación' }
        ],
        fetcher: () => ReportApi.retiredAssets(),
        filename: currentOption.filename
      },
      inventoryGeneral: {
        columns: [
          { key: 'assetCode', label: 'Código' },
          { key: 'name', label: 'Activo' },
          { key: 'brand', label: 'Marca' },
          { key: 'category', label: 'Categoría' },
          { key: 'statusLabel', label: 'Estado' },
          { key: 'totalQuantity', label: 'Stock total' },
          { key: 'availableQuantity', label: 'Disponible' },
          { key: 'loanedQuantity', label: 'Prestado' }
        ],
        fetcher: () => ReportApi.inventoryGeneral(),
        filename: currentOption.filename
      }
    };

    return config[reportType] || config.inventoryGeneral;
  }, [reportType, range.from, range.to]);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data } = await reportConfig.fetcher();
      setRows(mapRowsByReport(reportType, data.body));
      push('Reporte actualizado correctamente', 'success');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const exportCurrentReport = () => {
    if (rows.length === 0) {
      push('No hay datos para exportar', 'error');
      return;
    }

    downloadExcel({
      filename: reportConfig.filename,
      rows,
      columns: reportConfig.columns.map((column) => ({
        label: column.label,
        accessor: (row) => {
          if (typeof column.render === 'function') {
            if (column.key === 'loanDate' || column.key === 'retiredAt') return formatDateTime(row[column.key]);
            if (column.key === 'expectedReturnDate') return row.expectedReturnDate ? formatDate(row.expectedReturnDate) : '';
          }
          return row[column.key];
        }
      }))
    });

    push('Excel exportado correctamente', 'success');
  };

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Genera vistas exportables de inventario y préstamos para control operativo y decisiones ejecutivas."
        actions={<button className="btn-primary" onClick={exportCurrentReport}>Exportar Excel</button>}
      />

      <div className="card mb-4 grid gap-3 md:grid-cols-4">
        <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          {REPORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={range.from}
          onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
          disabled={reportType !== 'loanHistory'}
        />
        <input
          type="date"
          value={range.to}
          onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
          disabled={reportType !== 'loanHistory'}
        />
        <button className="btn-secondary" onClick={load} disabled={isLoading}>
          {isLoading ? 'Generando...' : 'Generar reporte'}
        </button>
      </div>

      <div className="mb-3 text-sm text-[#5b506c]">
        {rows.length} registro(s) generado(s)
      </div>

      <Table columns={reportConfig.columns} rows={rows} />
    </div>
  );
}