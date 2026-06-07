const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const categoryRules = [
  { keywords: ['boiler', 'heating', 'radiator', 'furnace', 'heat'], category: 'Boiler' },
  { keywords: ['tap', 'faucet', 'sink', 'basin'], category: 'Faucet' },
  { keywords: ['pipe', 'copper', 'pvc', 'drain', 'sewer', 'plumbing', 'drainage'], category: 'Pipes' },
  { keywords: ['toilet', 'commode', 'flush'], category: 'Toilet' },
  { keywords: ['bath', 'shower', 'bathtub', 'bathroom', 'tile'], category: 'Bathroom' },
  { keywords: ['water heater', 'water tank', 'waterheater'], category: 'Water Heater' },
  { keywords: ['leak', 'drip', 'flood', 'flooding', 'water damage', 'moisture'], category: 'Leak' },
  { keywords: ['disposal', 'garbage', 'garbage disposal', 'waste'], category: 'Disposal' },
  { keywords: ['gas', 'gas line', 'valve'], category: 'Gas' },
];
const defaultCategory = 'General';

function assignCategory(text) {
  const lower = text.toLowerCase();
  for (const rule of categoryRules) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.category;
    }
  }
  return defaultCategory;
}

app.get('/api/tasks', (req, res) => {
  const tasks = db.getAllTasks();
  res.json(tasks.map(t => ({
    ...t,
    completed: !!t.completed
  })));
});

app.post('/api/tasks', (req, res) => {
  const { text, startDate, address, phone } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Task text is required' });
  }
  const task = {
    id: 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    text: text.trim(),
    category: assignCategory(text),
    startDate: startDate || null,
    address: address || null,
    phone: phone || null,
    completed: false,
    createdAt: Date.now()
  };
  const created = db.createTask(task);
  res.status(201).json({ ...created, completed: !!created.completed });
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  const task = db.toggleTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ ...task, completed: !!task.completed });
});

app.delete('/api/tasks/:id', (req, res) => {
  const task = db.deleteTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ ...task, completed: !!task.completed });
});

app.listen(PORT, () => {
  console.log(`PlumbLogic server running at http://localhost:${PORT}`);
});
