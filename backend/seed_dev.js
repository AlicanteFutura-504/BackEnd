const { Client } = require('pg');
const { fakerES: faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
require('dotenv').config();

const NUM_ADMINS = 10;
const NUM_CUSTOMERS = 55;
const BOOKINGS_PER_BUSINESS = 15; // Un buen numero para que se vea lleno a lo largo del mes

function generateUserSense(role) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const nombreCompleto = `${firstName} ${lastName}`;
  // El username sera el nombre sin espacios en minuscula
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');
  const email = `${username}@${role === 'admin' ? 'empresa' : 'cliente'}.com`;
  const phone = faker.phone.number('+34 ### ### ###');
  const profilePicture = faker.image.avatar();
  
  return { nombreCompleto, username, email, phone, profilePicture };
}

async function run() {
  console.log('Iniciando generador de datos inteligente (DEV)...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('No se encontró DATABASE_URL en .env');
    process.exit(1);
  }
  
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Conectado a la base de datos DEV.');
    
    console.log('Limpiando base de datos (excepto root)...');
    await client.query('TRUNCATE TABLE payment, appointment, business CASCADE;');
    await client.query("DELETE FROM usuarios WHERE username != 'root';");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    console.log(`Generando ${NUM_ADMINS} empresarios (admins)...`);
    const adminIds = [];
    let adminCredentials = [];
    
    for (let i = 1; i <= NUM_ADMINS; i++) {
      const u = generateUserSense('admin');
      if (i === 1) {
         // Garantizamos un admin facil de loguear
         u.email = 'empresario1@dev.com';
         u.username = 'empresario1';
         adminCredentials.push(u.email);
      }
      const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;`;
      const values = [u.username, u.nombreCompleto, `${faker.string.numeric(8)}X`, u.email, passwordHash, u.profilePicture, 'admin', u.phone];
      const res = await client.query(query, values);
      adminIds.push(res.rows[0].id);
    }

    console.log(`Generando Negocios (1 a 10 por empresario)...`);
    const businessIds = [];
    for (const adminId of adminIds) {
      const numBiz = faker.number.int({ min: 1, max: 10 });
      for (let j = 0; j < numBiz; j++) {
        const bName = faker.company.name();
        const bDir = faker.location.streetAddress();
        const bPhone = faker.phone.number('+34 ### ### ###');
        const query = `INSERT INTO business (nombre, direccion, telefono, "usuarioId") VALUES ($1, $2, $3, $4) RETURNING id;`;
        const res = await client.query(query, [bName, bDir, bPhone, adminId]);
        businessIds.push(res.rows[0].id);
      }
    }

    console.log(`Generando ${NUM_CUSTOMERS} clientes...`);
    const customerIds = [];
    let customerCredentials = [];
    
    for (let i = 1; i <= NUM_CUSTOMERS; i++) {
      const u = generateUserSense('client');
      if (i === 1) {
         u.email = 'cliente1@dev.com';
         u.username = 'cliente1';
         customerCredentials.push(u.email);
      }
      const query = `INSERT INTO usuarios (username, "nombreCompleto", dni, email, contrasena, "profilePicture", role, phone) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;`;
      const values = [u.username, u.nombreCompleto, `${faker.string.numeric(8)}Y`, u.email, passwordHash, u.profilePicture, 'client', u.phone];
      const res = await client.query(query, values);
      customerIds.push(res.rows[0].id);
    }

    console.log(`Generando reservas a lo largo del mes en curso...`);
    const statuses = ['pending', 'confirmed', 'paid', 'cancelled'];
    const services = ['Corte de pelo', 'Revisión general', 'Consulta inicial', 'Limpieza profunda', 'Sesión de fisioterapia', 'Masaje relajante', 'Entrenamiento personal'];
    
    let totalBookings = 0;
    let paymentQueryValues = [];
    
    for (const bId of businessIds) {
      // 15 reservas por negocio para poblar el calendario
      for (let j = 0; j < BOOKINGS_PER_BUSINESS; j++) {
        const cId = faker.helpers.arrayElement(customerIds);
        const status = faker.helpers.arrayElement(statuses);
        
        // Fecha aleatoria dentro de este mismo mes
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const randomDay = faker.number.int({ min: 1, max: daysInMonth });
        const date = new Date(now.getFullYear(), now.getMonth(), randomDay).toISOString().split('T')[0];
        
        const time = `${faker.number.int({ min: 8, max: 20 }).toString().padStart(2, '0')}:00`;
        const serviceName = faker.helpers.arrayElement(services);
        
        const bQuery = `INSERT INTO appointment (date, time, status, "usuarioId", "businessId", "serviceName") 
                        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id;`;
        const bRes = await client.query(bQuery, [date, time, status, cId, bId, serviceName]);
        
        if (bRes.rows.length > 0) {
          const bookingId = bRes.rows[0].id;
          totalBookings++;
          
          // Crear pago asociado
          const pStatus = (status === 'paid') ? 'pagado' : faker.helpers.arrayElement(['pagado', 'pendiente']);
          const pType = faker.helpers.arrayElement(['tarjeta', 'efectivo', 'bizum']);
          const amount = faker.number.int({ min: 15, max: 120 });
          
          paymentQueryValues.push(`('${date}', '${pStatus}', '${pType}', ${amount}, ${bookingId})`);
        }
      }
    }

    // Insertar todos los pagos de golpe (si hay)
    if (paymentQueryValues.length > 0) {
       // Insertamos en batches para no reventar el limite de parametros
       const batchSize = 1000;
       for (let i = 0; i < paymentQueryValues.length; i += batchSize) {
         const batch = paymentQueryValues.slice(i, i + batchSize);
         await client.query(`INSERT INTO payment (date, status, type, amount, "bookingId") VALUES ${batch.join(',')};`);
       }
    }

    console.log(`\n✅ ¡Base de datos rellenada con éxito y mucho sentido!`);
    console.log(`📊 ESTADÍSTICAS:`);
    console.log(`- Empresarios: ${adminIds.length}`);
    console.log(`- Negocios creados: ${businessIds.length}`);
    console.log(`- Clientes: ${customerIds.length}`);
    console.log(`- Reservas creadas este mes: ${totalBookings}`);
    console.log(`\n🔑 CREDENCIALES PREPARADAS (Contraseña siempre '1234'):`);
    console.log(`👉 Empresario: ${adminCredentials[0]}`);
    console.log(`👉 Cliente: ${customerCredentials[0]}`);

  } catch (error) {
    console.error('Error durante el seeding DEV:', error);
  } finally {
    await client.end();
  }
}
run();
