require('dotenv').config(); // ย้ายมาดึงค่าจาก .env ก่อนเป็นอันดับแรก
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const moment = require('moment');
const db = require('./db');

// เช็คว่าระบบดึงอีเมลจาก .env ได้ไหม
console.log("👉 ใช้อีเมลสำหรับส่งข้อความ:", process.env.EMAIL_USER || "❌ ยังไม่พบอีเมลใน .env");

// 1. ตั้งค่า Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // ดึงจาก .env 
        pass: process.env.EMAIL_PASS  // ดึงจาก .env (App Password)
    }
});

// ฟังก์ชันสำหรับส่งอีเมล
const sendEmail = (to, subject, text) => {
    const mailOptions = {
        from: `"โรงพยาบาลสุขทั่วราษฎร์" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log('❌ Error sending email:', error.message); // แก้ให้แสดง Error ชัดขึ้น
        else console.log('✅ Email sent: ' + info.response);
    });
};

// ==========================================
// 2. Cron Job: ตรวจสอบและส่งเมลแจ้งเตือน
// ==========================================

// --- งานที่ 1: แจ้งเตือน "ล่วงหน้า 1 วัน" (รันทุกๆ 1 ชั่วโมง) ---
cron.schedule('0 * * * *', async () => {
    console.log('⏳ Running daily reminder check...');
    const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');

    try {
        const [appointments] = await db.execute(
            `SELECT a.*, p.email, p.patient_name 
            FROM appointment a 
            JOIN patient p ON a.PatientID = p.PatientID 
            WHERE a.AppointDate = ? AND a.mail_sent_1day = 0`,
            [tomorrow] 
        );

        for (let app of appointments) {
            const message = `เรียนคุณ ${app.patient_name}, พรุ่งนี้คุณมีนัดหมายที่โรงพยาบาลในเวลา ${app.AppointTime} น. กรุณาเตรียมตัวให้พร้อมค่ะ`;
            sendEmail(app.email, 'แจ้งเตือนนัดหมายล่วงหน้า 1 วัน', message);

            await db.execute('UPDATE appointment SET mail_sent_1day = 1 WHERE AppointID = ?', [app.AppointID]);
        }
    } catch (err) {
        console.error('Database Error (1-day reminder):', err);
    }
});

// --- งานที่ 2: แจ้งเตือน "ล่วงหน้า 1 ชม." (รันทุกๆ 15 นาที) ---
cron.schedule('*/15 * * * *', async () => {
    console.log('⏳ Running 1-hour reminder check...');
    const now = moment();

    try {
        const [appointments] = await db.execute(
            `SELECT a.*, p.email, p.patient_name 
             FROM appointment a 
             JOIN patient p ON a.PatientID = p.PatientID 
             WHERE a.AppointDate = ? AND a.mail_sent_1hour = 0`, // 👈 แก้ p.Patient_ID เป็น p.PatientID ให้แล้ว
            [now.format('YYYY-MM-DD')]
        );

        for (let app of appointments) {
            const appointDateTime = moment(`${moment(app.AppointDate).format('YYYY-MM-DD')} ${app.AppointTime}`, 'YYYY-MM-DD HH:mm:ss');
            const diffMinutes = appointDateTime.diff(now, 'minutes');

            if (diffMinutes > 0 && diffMinutes <= 60) {
                const message = `เรียนคุณ ${app.patient_name}, อีกประมาณ 1 ชั่วโมงจะถึงเวลานัดหมายของคุณ (${app.AppointTime} น.) กรุณาเดินทางมายังโรงพยาบาลค่ะ`;
                sendEmail(app.email, 'แจ้งเตือนนัดหมาย (อีก 1 ชั่วโมง)', message);

                await db.execute('UPDATE appointment SET mail_sent_1hour = 1 WHERE AppointID = ?', [app.AppointID]);
            }
        }
    } catch (err) {
        console.error('Database Error (1-hour reminder):', err);
    }
});

// 👈 ต้องมีบรรทัดนี้ เพื่อให้ server.js ดึง sendEmail ไปใช้ตอนกดยืนยันการจองได้
module.exports = { sendEmail };