const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS educational_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                degree VARCHAR(255),
                institution VARCHAR(255),
                graduation_year INT,
                field_of_study VARCHAR(255),
                current_level VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('educational_details table created or already exists');

        // Also check/create study_activity if missing (referenced in lecture completion)
        await connection.execute(`
             CREATE TABLE IF NOT EXISTS study_activity (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                activity_date DATE NOT NULL,
                lectures_completed INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_date (user_id, activity_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('study_activity table created or already exists');

        await connection.end();
        console.log('Done');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

createTables();
