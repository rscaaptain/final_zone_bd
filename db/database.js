const mysql = require('mysql2/promise');
require('dotenv').config();

const dbUri = 'mysql://3A6TaGgYi7CaDM1.root:f0RlCpVMzU7xMP5g@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/sys?ssl={"rejectUnauthorized":true}';

const pool = mysql.createPool(dbUri);

async function initializeDatabase() {
    try {
        const connPoolConfig = {
            uri: dbUri,
            multipleStatements: true
        };
        const conn = await mysql.createConnection(connPoolConfig);

        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'final_zone_bd'}\``);
        await conn.query(`USE \`${process.env.DB_NAME || 'final_zone_bd'}\``);
        try {
            await conn.query('ALTER TABLE users DROP COLUMN role');
        } catch (e) { }
        try {

            await conn.query('DROP TABLE IF EXISTS settings');
        } catch (e) { }

        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                mobile VARCHAR(20) NOT NULL,
                ff_uid VARCHAR(50),
                ff_name VARCHAR(100),
                password VARCHAR(255) NOT NULL,
                balance DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('active','banned') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('superadmin','admin') DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_name VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sliders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                image_url VARCHAR(500) NOT NULL,
                link_url VARCHAR(255) DEFAULT '#',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                image_url VARCHAR(500),
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS matches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                match_uid VARCHAR(50) UNIQUE NOT NULL,
                category_id INT,
                category VARCHAR(100),
                entry_fee DECIMAL(10,2) DEFAULT 0.00,
                prize_pool DECIMAL(10,2) DEFAULT 0.00,
                per_kill INT DEFAULT 0,
                slots INT DEFAULT 12,
                filled_slots INT DEFAULT 0,
                status ENUM('upcoming','live','completed','cancelled') DEFAULT 'upcoming',
                room_id VARCHAR(50),
                room_password VARCHAR(50),
                scheduled_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS joinners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                match_id INT NOT NULL,
                user_id INT NOT NULL,
                ff_uid VARCHAR(50),
                ff_name VARCHAR(100),
                slot_no INT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_joinner (match_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                match_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                screenshot_url VARCHAR(500),
                result_data JSON,
                winner_name VARCHAR(255),
                prize_amount DECIMAL(10,2),
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('deposit','withdrawal','entry_fee','prize','refund') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending','completed','failed') DEFAULT 'pending',
                reference VARCHAR(100),
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const [settingRows] = await conn.query('SELECT COUNT(*) as cnt FROM settings');
        if (settingRows[0].cnt === 0) {
            await conn.query(`
                INSERT INTO settings (setting_name, setting_value) VALUES
                ('site_name', 'Final Zone BD'),
                ('site_logo', 'https://finalzonebd.com/logo/logo.png'),
                ('fav_icon', 'https://finalzonebd.com/logo/logo.png'),
                ('home_notice', 'আপনি BR (Classic) ম্যাচে নির্ধারিত স্লোটে থাকুন। বাহিরের প্লেয়ারকে ইনভাইট করবেন না। অন্যথায় কিক করা হবে। ধন্যবাদ।');
            `);
        } else {
            await conn.query(`
                INSERT INTO settings (setting_name, setting_value) VALUES
                ('home_notice', 'আপনি BR (Classic) ম্যাচে নির্ধারিত স্লোটে থাকুন। বাহিরের প্লেয়ারকে ইনভাইট করবেন না। অন্যথায় কিক করা হবে। ধন্যবাদ।')
                ON DUPLICATE KEY UPDATE setting_name=setting_name;
            `);
        }

        const [sliderRows] = await conn.query('SELECT COUNT(*) as cnt FROM sliders');
        if (sliderRows[0].cnt === 0) {
            await conn.query(`
                INSERT INTO sliders (image_url, link_url) VALUES
                ('https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png', '#');
            `);
        }

        const [catRows] = await conn.query('SELECT COUNT(*) as cnt FROM categories');
        if (catRows[0].cnt === 0) {
            await conn.query(`
                INSERT INTO categories (name, image_url) VALUES
                ('BR MATCH', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('SURVIVAL MATCH', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('CLASH SQUAD', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('E-SPORT MATCH', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('LONE WOLF', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('LOSS TO WIN', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('ONLY GRENADE CUSTOM', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png'),
                ('FREE MATCH', 'https://i.ibb.co.com/q3qTfbXR/free-fire-thumbnail-300x300.png');
            `);
        }

        const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM matches');
        if (rows[0].cnt === 0) {
            await conn.query(`
                INSERT INTO matches (title, match_uid, category_id, category, entry_fee, prize_pool, per_kill, slots, filled_slots, status, scheduled_at) VALUES
                ('FINAL ZONE BD #001', 'FZ001', 1, 'BR Match', 20, 500, 5, 12, 8, 'upcoming', DATE_ADD(NOW(), INTERVAL 2 HOUR)),
                ('FINAL ZONE BD #002', 'FZ002', 2, 'Clash Squad', 10, 200, 0, 8, 5, 'upcoming', DATE_ADD(NOW(), INTERVAL 4 HOUR)),
                ('FINAL ZONE BD #003', 'FZ003', 3, 'E-Sport Match', 50, 1000, 10, 12, 12, 'live', DATE_ADD(NOW(), INTERVAL -1 HOUR)),
                ('FINAL ZONE BD #004', 'FZ004', 4, 'Lone Wolf', 15, 300, 0, 4, 2, 'upcoming', DATE_ADD(NOW(), INTERVAL 6 HOUR)),
                ('FINAL ZONE BD #005', 'FZ005', 7, 'Free Match', 0, 100, 0, 12, 7, 'upcoming', DATE_ADD(NOW(), INTERVAL 3 HOUR)),
                ('FINAL ZONE BD #006', 'FZ006', 8, 'Survival Match', 30, 700, 8, 12, 11, 'completed', DATE_ADD(NOW(), INTERVAL -3 HOUR)),
                ('FINAL ZONE BD #007', 'FZ007', 1, 'BR Match', 25, 600, 6, 12, 9, 'upcoming', DATE_ADD(NOW(), INTERVAL 5 HOUR)),
                ('FINAL ZONE BD #008', 'FZ008', 6, 'Only Grenade Custom', 20, 400, 0, 8, 4, 'upcoming', DATE_ADD(NOW(), INTERVAL 7 HOUR));

                INSERT INTO results (match_id, title, winner_name, prize_amount) VALUES
                (6, 'FINAL ZONE BD #006 Result', 'FireKing_BD', 700),
                (3, 'FINAL ZONE BD #003 Result', 'Shadow_FF', 1000);

                INSERT INTO notices (title, content) VALUES
                ('গুরুত্বপূর্ণ নোটিশ', 'নির্ধারিত স্লটে থাকুন, বাইরের কাউকে ইনভাইট করবেন না। ম্যাচ শুরুর ৫ মিনিট আগে রুমে প্রবেশ করুন। Room ID ও Password ম্যাচ শুরুর আগে দেওয়া হবে।');
            `);
        }

        await conn.end();
        console.log('✅ MySQL Database initialized successfully');
    } catch (err) {
        console.error('❌ Database initialization error:', err);
        process.exit(1);
    }
}

module.exports = { pool, initializeDatabase };
