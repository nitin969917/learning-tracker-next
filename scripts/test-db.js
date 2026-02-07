const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
    try {
        console.log('Testing connection to:', process.env.DB_HOST);
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('✅ Successfully connected to database!');
        await connection.end();
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testConnection();
