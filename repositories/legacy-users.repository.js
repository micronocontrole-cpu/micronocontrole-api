const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '..', 'usuarios.json');

function ensureUsersDatabase() {
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, '[]', 'utf8');
  }
}

function readUsers() {
  ensureUsersDatabase();

  const content = fs.readFileSync(USERS_PATH, 'utf8');
  if (!content.trim()) return [];

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[legacy-users] Erro ao ler usuarios.json:', error.message);
    return [];
  }
}

function writeUsers(users = []) {
  ensureUsersDatabase();
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

module.exports = {
  USERS_PATH,
  ensureUsersDatabase,
  readUsers,
  writeUsers
};
