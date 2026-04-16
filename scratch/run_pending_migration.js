const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'auction_db'
    });

    try {
        console.log('Running migration: Add PENDING to status enum...');
        await connection.query(`
            ALTER TABLE products
            MODIFY COLUMN status ENUM(
                'DRAFT',
                'PENDING',
                'ACTIVE',
                'ENDED_WAITING_PAYMENT',
                'COMPLETED',
                'UNSOLD',
                'CANCELLED'
            ) DEFAULT 'DRAFT'
        `);
        console.log('✅ Migration successful!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

run();
