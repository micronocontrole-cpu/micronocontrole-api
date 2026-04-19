const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'dados.json');

function ensureJsonDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf8');
  }
}

function readTransactions() {
  ensureJsonDatabase();

  const content = fs.readFileSync(DB_PATH, 'utf8');
  if (!content.trim()) return [];

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('[legacy-json] Erro ao ler dados.json:', error.message);
    return [];
  }
}

function writeTransactions(transactions = []) {
  ensureJsonDatabase();
  fs.writeFileSync(DB_PATH, JSON.stringify(transactions, null, 2), 'utf8');
}

function appendTransaction(transaction) {
  const transactions = readTransactions();
  transactions.push({
    ...transaction,
    data: transaction.data || new Date().toISOString()
  });
  writeTransactions(transactions);
  return transactions[transactions.length - 1];
}

module.exports = {
  DB_PATH,
  appendTransaction,
  ensureJsonDatabase,
  readTransactions,
  writeTransactions
};
