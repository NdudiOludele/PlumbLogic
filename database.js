const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'plumb-logic.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    start_date TEXT,
    address TEXT,
    phone TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO tasks (id, text, category, start_date, address, phone, completed, created_at)
  VALUES (@id, @text, @category, @startDate, @address, @phone, @completed, @createdAt)
`);

function getAllTasks() {
  return db.prepare('SELECT * FROM tasks ORDER BY completed ASC, start_date ASC, created_at DESC').all();
}

function getTask(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function createTask(task) {
  insertStmt.run({
    id: task.id,
    text: task.text,
    category: task.category,
    startDate: task.startDate || null,
    address: task.address || null,
    phone: task.phone || null,
    completed: task.completed ? 1 : 0,
    createdAt: task.createdAt
  });
  return getTask(task.id);
}

function toggleTask(id) {
  const task = getTask(id);
  if (!task) return null;
  const newCompleted = task.completed ? 0 : 1;
  db.prepare('UPDATE tasks SET completed = ? WHERE id = ?').run(newCompleted, id);
  return getTask(id);
}

function deleteTask(id) {
  const task = getTask(id);
  if (!task) return null;
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return task;
}

module.exports = { getAllTasks, getTask, createTask, toggleTask, deleteTask };
