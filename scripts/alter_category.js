const pool = require('../src/config/db');

async function runMigration() {
    try {
        console.log('Altering seller_applications table...');
        await pool.query('ALTER TABLE seller_applications ADD COLUMN category_id INT DEFAULT NULL');
        
        console.log('Adding foreign key constraint...');
        await pool.query('ALTER TABLE seller_applications ADD CONSTRAINT fk_seller_app_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL');
        
        console.log('Migration successful!');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists. Skipping migration.');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        pool.end();
    }
}

runMigration();
