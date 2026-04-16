require('dotenv').config();
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const app = require('./src/app');
const { Server } = require('socket.io');
const adminService = require('./src/services/adminService');

const PORT = process.env.PORT || 5000;

// Set Timezone
process.env.TZ = 'Asia/Ho_Chi_Minh';

const ensureDatabaseReady = async () => {
  const {
    DB_HOST = 'localhost',
    DB_USER = 'root',
    DB_PASSWORD = '',
    DB_NAME = 'auction_db',
  } = process.env;

  const bootstrapConn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    ssl: (process.env.DB_SSL === 'true' || (DB_HOST && !DB_HOST.includes('localhost') && !DB_HOST.includes('127.0.0.1'))) ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    } : undefined
  });

  try {
    const [rows] = await bootstrapConn.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [DB_NAME]
    );

    if (rows.length > 0) {
      console.log(`[DB] Database '${DB_NAME}' already exists.`);
      return;
    }

    console.log(`[DB] Database '${DB_NAME}' not found. Importing schema...`);
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await bootstrapConn.query(schemaSql);
    console.log('[DB] Schema imported successfully.');
  } finally {
    await bootstrapConn.end();
  }
};

const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Expose io instance to request handlers (req.app.get('io'))
app.set('io', io);

require('./src/sockets')(io);

// Initialize Cron Jobs
require('./src/cron')(io);

const startServer = async () => {
  try {
    await ensureDatabaseReady();
    await adminService.initAdminFeatures();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in timezone ${process.env.TZ}`);
    });
  } catch (error) {
    console.error('[Startup] Failed to initialize database:', error.message);
    process.exit(1);
  }
};

startServer();
