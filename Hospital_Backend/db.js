const mysql = require('mysql2/promise'); // 🟢 เปลี่ยนมาใช้แบบ promise
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, // 🟢 1. ระบุพอร์ต 10992 ของ Aiven
    ssl: {
        rejectUnauthorized: false // 🟢 2. Aiven บังคับใช้ SSL (ใส่ false เพื่ออนุญาตให้ข้ามการตรวจใบรับรองในเครื่อง)
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 🟢 ปรับการทดสอบการเชื่อมต่อให้ใช้แบบ Async/Await ให้สอดคล้องกับ mysql2/promise
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('✅ Successfully connected to Aiven MySQL database');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed: ' + err.message);
    }
}
testConnection();

module.exports = db;