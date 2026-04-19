const ExcelJS = require('exceljs');

function formatCurrency(value = 0) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function escapeCsv(value = '') {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function calculateSummary(transactions = []) {
  let entradas = 0;
  let saidas = 0;

  for (const item of transactions) {
    const amount = parseFloat(item.valor || 0);

    if (item.tipo === 'entrada') entradas += amount;
    if (item.tipo === 'saida') saidas += amount;
  }

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    total_registros: transactions.length
  };
}

function generateCsv(transactions = []) {
  const header = [
    'telefone',
    'mensagem_original',
    'tipo',
    'valor',
    'categoria',
    'data'
  ];

  const lines = transactions.map(item =>
    [
      escapeCsv(item.telefone || ''),
      escapeCsv(item.mensagem_original || ''),
      escapeCsv(item.tipo || ''),
      escapeCsv(item.valor || ''),
      escapeCsv(item.categoria || ''),
      escapeCsv(item.data || item.criado_em || '')
    ].join(',')
  );

  return [header.join(','), ...lines].join('\n');
}

function sumByCategory(transactions = []) {
  const totals = {};

  for (const item of transactions) {
    const category = item.categoria || 'geral';
    const amount = Number(item.valor || 0);

    if (!['entrada', 'saida'].includes(item.tipo)) continue;

    if (!totals[category]) {
      totals[category] = 0;
    }

    if (item.tipo === 'entrada') {
      totals[category] += amount;
    } else {
      totals[category] -= amount;
    }
  }

  return Object.entries(totals).map(([categoria, total]) => ({
    categoria,
    total
  }));
}

function applyExcelHeaderStyle(row) {
  row.eachCell(cell => {
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      right: { style: 'thin', color: { argb: 'FFD9E2F3' } }
    };
  });
}

function applyExcelRowBorder(row) {
  row.eachCell(cell => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };
  });
}

async function generateExcel(transactions = [], phone = '') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Micro no Controle';
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = calculateSummary(transactions);
  const categories = sumByCategory(transactions);

  const summarySheet = workbook.addWorksheet('Resumo', {
    properties: { defaultRowHeight: 22 }
  });

  summarySheet.columns = [
    { header: 'Campo', key: 'campo', width: 28 },
    { header: 'Valor', key: 'valor', width: 24 }
  ];

  summarySheet.mergeCells('A1:B1');
  summarySheet.getCell('A1').value = 'Micro no Controle - Resumo Financeiro';
  summarySheet.getCell('A1').font = {
    size: 16,
    bold: true,
    color: { argb: 'FF0F172A' }
  };
  summarySheet.getCell('A1').alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  summarySheet.addRow([]);
  summarySheet.addRow(['Telefone filtrado', phone || 'Todos']);
  summarySheet.addRow(['Total de registros', summary.total_registros]);
  summarySheet.addRow(['Entradas', summary.entradas]);
  summarySheet.addRow(['Saidas', summary.saidas]);
  summarySheet.addRow(['Saldo', summary.saldo]);

  summarySheet.getCell('B4').numFmt = 'R$ #,##0.00';
  summarySheet.getCell('B5').numFmt = 'R$ #,##0.00';
  summarySheet.getCell('B6').numFmt = 'R$ #,##0.00';

  for (let i = 3; i <= 6; i += 1) {
    applyExcelRowBorder(summarySheet.getRow(i));
  }

  summarySheet.getColumn('A').font = { bold: true };
  summarySheet.addRow([]);

  const categoryTitleRow = summarySheet.rowCount + 1;
  summarySheet.getCell(`A${categoryTitleRow}`).value = 'Resumo por categoria';
  summarySheet.getCell(`A${categoryTitleRow}`).font = {
    bold: true,
    size: 13
  };

  const categoryHeader = summarySheet.addRow(['Categoria', 'Impacto no saldo']);
  applyExcelHeaderStyle(categoryHeader);

  categories.forEach(item => {
    const row = summarySheet.addRow([item.categoria, item.total]);
    row.getCell(2).numFmt = 'R$ #,##0.00';
    applyExcelRowBorder(row);
  });

  const transactionsSheet = workbook.addWorksheet('Transacoes', {
    properties: { defaultRowHeight: 20 }
  });

  transactionsSheet.columns = [
    { header: 'Telefone', key: 'telefone', width: 18 },
    { header: 'Mensagem original', key: 'mensagem_original', width: 40 },
    { header: 'Tipo', key: 'tipo', width: 14 },
    { header: 'Valor', key: 'valor', width: 14 },
    { header: 'Categoria', key: 'categoria', width: 18 },
    { header: 'Data', key: 'data', width: 26 }
  ];

  applyExcelHeaderStyle(transactionsSheet.getRow(1));
  transactionsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  transactions
    .filter(item => ['entrada', 'saida', 'outro'].includes(item.tipo))
    .forEach(item => {
      const row = transactionsSheet.addRow({
        telefone: item.telefone || '',
        mensagem_original: item.mensagem_original || '',
        tipo: item.tipo || '',
        valor: Number(item.valor || 0),
        categoria: item.categoria || 'geral',
        data: item.data || item.criado_em || ''
      });

      row.getCell('valor').numFmt = 'R$ #,##0.00';

      if (item.tipo === 'entrada') {
        row.getCell('C').font = { bold: true, color: { argb: 'FF15803D' } };
        row.getCell('D').font = { bold: true, color: { argb: 'FF15803D' } };
      } else if (item.tipo === 'saida') {
        row.getCell('C').font = { bold: true, color: { argb: 'FFB91C1C' } };
        row.getCell('D').font = { bold: true, color: { argb: 'FFB91C1C' } };
      }

      applyExcelRowBorder(row);
    });

  return workbook;
}

module.exports = {
  calculateSummary,
  formatCurrency,
  generateCsv,
  generateExcel
};
