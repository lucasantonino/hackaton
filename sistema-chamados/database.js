const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// O banco fica fora de public/, que será a pasta acessível pelo navegador.
const databasePath = path.join(__dirname, 'chamados.db');
const database = new DatabaseSync(databasePath);

database.exec(`
  CREATE TABLE IF NOT EXISTS chamados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
    solicitante TEXT NOT NULL CHECK (length(trim(solicitante)) > 0),
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'Aberto'
      CHECK (status IN ('Aberto', 'Em andamento', 'Concluído'))
  )
`);

module.exports = database;
