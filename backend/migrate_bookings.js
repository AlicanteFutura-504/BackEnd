const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // Insert all appointments into booking_entity if they don't exist
  db.run(`
    INSERT INTO booking_entity (date, time, status, customerId, businessId, serviceName)
    SELECT date, time, status, customerId, businessId, serviceName
    FROM appointment
  `, function(err) {
    if (err) {
      console.error("Error migrating bookings:", err);
    } else {
      console.log(`Migrated ${this.changes} bookings from appointment to booking_entity.`);
    }
    db.close();
  });
});
