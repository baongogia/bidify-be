// Quick Backend Test - Run this with: node backend/test_db.js
// This will test if database has correct structure

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabase() {
    console.log('🔍 Testing database structure...\n');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'auction_db',
            ssl: (process.env.DB_SSL === 'true' || (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1'))) ? {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            } : undefined
        });

        console.log('✅ Database connected\n');

        // Test 1: Check users table structure
        console.log('📋 Test 1: Users table structure');
        const [columns] = await connection.query('DESCRIBE users');
        const columnNames = columns.map(col => col.Field);
        console.log('Columns:', columnNames.join(', '));
        
        const requiredColumns = ['role', 'seller_status', 'seller_request_date', 'seller_approved_date'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
            console.log('❌ Missing columns:', missingColumns.join(', '));
            console.log('🔧 FIX: Run migration script!\n');
        } else {
            console.log('✅ All required columns exist\n');
        }

        // Test 2: Check seller_applications table
        console.log('📋 Test 2: Seller applications table');
        const [tables] = await connection.query("SHOW TABLES LIKE 'seller_applications'");
        if (tables.length === 0) {
            console.log('❌ Table seller_applications does NOT exist');
            console.log('🔧 FIX: Run migration script!\n');
        } else {
            console.log('✅ Table seller_applications exists\n');
        }

        // Test 3: Check user roles
        console.log('📋 Test 3: Sample user data');
        const [users] = await connection.query('SELECT id, name, role, seller_status FROM users LIMIT 4');
        console.table(users);

        const hasNullRoles = users.some(u => !u.role);
        if (hasNullRoles) {
            console.log('❌ Some users have NULL role');
            console.log('🔧 FIX: Run migration script to update seed data!\n');
        } else {
            console.log('✅ All users have roles assigned\n');
        }

        // Summary
        console.log('=' .repeat(60));
        if (missingColumns.length === 0 && tables.length > 0 && !hasNullRoles) {
            console.log('✅ ✅ ✅ DATABASE IS READY! ✅ ✅ ✅');
            console.log('You can restart backend and test the application.');
        } else {
            console.log('❌ DATABASE NEEDS MIGRATION');
            console.log('\n📝 To fix:');
            console.log('1. Open MySQL/HeidiSQL');
            console.log('2. Run: backend/database/migration_add_roles.sql');
            console.log('3. Restart backend');
        }
        console.log('=' .repeat(60));

        await connection.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 FIX: MySQL server is not running!');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n🔧 FIX: Database "auction_db" does not exist!');
            console.log('Run: backend/database/schema.sql first');
        }
    }
}

testDatabase();
