const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    process.exit(1);
  }
});

const customers = [
  { name: 'María', surname: 'López', email: 'maria@email.com', phone: '600 123 456' },
  { name: 'Carlos', surname: 'Pérez', email: 'carlos@email.com', phone: '611 456 789' },
  { name: 'Lucía', surname: 'Sánchez', email: 'lucia@email.com', phone: '622 987 654' }
];

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR NOT NULL,
    surname VARCHAR,
    email VARCHAR UNIQUE NOT NULL,
    phone VARCHAR
  )`);

  const stmt = db.prepare("INSERT OR IGNORE INTO customers (name, surname, email, phone) VALUES (?, ?, ?, ?)");
  
  customers.forEach(c => {
    stmt.run(c.name, c.surname, c.email, c.phone);
  });
  
  stmt.finalize(() => {
    console.log("Customers inserted successfully.");
    db.close();
  });
});
