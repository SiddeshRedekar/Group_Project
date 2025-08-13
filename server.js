// server.js (verified)
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());
app.use(cors());

// DB
const db = new sqlite3.Database(path.join(__dirname, 'fitness.db'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    calories INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
  )`);

  db.get(`SELECT COUNT(*) AS c FROM workouts`, [], (err, row) => {
    if (!err && row && row.c === 0) {
      const seed = db.prepare(`INSERT INTO workouts (date, type, duration, calories, notes) VALUES (?, ?, ?, ?, ?)`);
      const today = new Date();
      const iso = today.toISOString().slice(0,10);
      seed.run(iso, 'Walking', 20, 90, 'First run - seed');
      seed.run(iso, 'Gym', 45, 220, 'Seed workout');
      seed.finalize();
      console.log('Seeded sample workouts.');
    }
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true, port: PORT, time: new Date().toISOString() });
});

app.get('/api/workouts', (req, res) => {
  const { type, from, to } = req.query;
  const where = [];
  const params = [];
  if (type && type !== 'All') { where.push('type = ?'); params.push(type); }
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT * FROM workouts ${whereClause} ORDER BY date DESC, id DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/workouts', (req, res) => {
  const { date, type, duration, calories = 0, notes = '' } = req.body || {};
  if (!date || !type || !duration) return res.status(400).json({ error: 'date, type, duration required' });
  const sql = `INSERT INTO workouts (date, type, duration, calories, notes) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [date, type, Number(duration), Number(calories || 0), notes], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, date, type, duration: Number(duration), calories: Number(calories || 0), notes });
  });
});

app.put('/api/workouts/:id', (req, res) => {
  const { id } = req.params;
  const { date, type, duration, calories = 0, notes = '' } = req.body || {};
  if (!date || !type || !duration) return res.status(400).json({ error: 'date, type, duration required' });
  const sql = `UPDATE workouts SET date=?, type=?, duration=?, calories=?, notes=? WHERE id=?`;
  db.run(sql, [date, type, Number(duration), Number(calories || 0), notes, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Workout not found' });
    res.json({ id: Number(id), date, type, duration: Number(duration), calories: Number(calories || 0), notes });
  });
});

app.delete('/api/workouts/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM workouts WHERE id=?`;
  db.run(sql, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Workout not found' });
    res.json({ ok: true });
  });
});

app.get('/api/stats', (req, res) => {
  const result = {};
  db.get(`SELECT COUNT(*) as totalWorkouts,
                 IFNULL(SUM(duration),0) as totalMinutes,
                 IFNULL(SUM(calories),0) as totalCalories
          FROM workouts`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    result.totals = row;
    db.all(`SELECT type, COUNT(*) as count, IFNULL(SUM(duration),0) as minutes
            FROM workouts GROUP BY type`, [], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      result.byType = rows;
      db.all(`SELECT date, IFNULL(SUM(duration),0) as minutes
              FROM workouts
              WHERE date >= date('now', '-6 days')
              GROUP BY date
              ORDER BY date ASC`, [], (err3, rows2) => {
        if (err3) return res.status(500).json({ error: err3.message });
        result.last7 = rows2;
        res.json(result);
      });
    });
  });
});

// Helpful 404 for /api
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', pathTried: req.originalUrl });
});

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Fitness Tracker running at http://localhost:${PORT}`);
});
