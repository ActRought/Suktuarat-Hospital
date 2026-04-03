const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db'); // นำเข้าไฟล์เชื่อมต่อ Database ที่เราทำไว้
require('dotenv').config();
require('./emailService'); // เพื่อเรียกใช้งานระบบแจ้งเตือนอีเมล (Cron Job)

const app = express();

// ==========================================
// 🛡️ Middleware: ตั้งค่า CORS สำหรับ Public (Production)
// ==========================================
const allowedOrigins = [
    'https://hospital-suktuarat.vercel.app', // ลิงก์หลักที่คุณใช้
    'https://suktuarat-hospital-h1m0fkyoe-actroughts-projects.vercel.app', // ลิงก์สำรอง
    'http://localhost:5173',
    process.env.FRONTEND_URL // ดึงจากที่ตั้งในหน้า Render Settings
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            if (origin.endsWith('.vercel.app')) {
                callback(null, true);
            } else {
                console.log("CORS Blocked for:", origin);
                callback(new Error('Blocked by CORS'));
            }
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json()); // ให้ Backend อ่านข้อมูลแบบ JSON ได้

// ==========================================
// 🛡️ Middleware: ตรวจสอบ Token และสิทธิ์ Admin
// ==========================================
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '❌ ไม่อนุญาตให้เข้าถึง กรุณาเข้าสู่ระบบ' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: '❌ Session หมดอายุ หรือ Token ไม่ถูกต้อง' });
        }

        if (decoded.role !== 'Admin') {
            return res.status(403).json({ message: '❌ คุณไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้' });
        }

        req.user = decoded;
        next();
    });
};

// ==========================================
// 📍 API: ตรวจสอบสถานะเซิร์ฟเวอร์
// ==========================================
app.get('/', (req, res) => {
    res.send('🏥 Hospital Backend is running perfectly!');
});

// ==========================================
// 📍 API: สมัครสมาชิก (Register)
// ==========================================
app.post('/api/register', async (req, res) => {
    const { Name, IDCard13, Gender, Birthday, Phone, Email, Password } = req.body;
    
    // 🟢 [LOG] บันทึกการพยายามสมัครสมาชิก
    console.log(`[REGISTER_ATTEMPT] 🧑‍💻 พยายามสมัครสมาชิกใหม่ - ชื่อ: ${Name}, Email: ${Email}, เบอร์โทร: ${Phone}`);

    try {
        const [existingUser] = await db.execute(
            'SELECT * FROM account a JOIN patient p ON a.PatientID = p.PatientID WHERE a.Email = ? OR p.IDCard13 = ?',
            [Email, IDCard13]
        );

        if (existingUser.length > 0) {
            // 🟢 [LOG] บันทึกกรณีสมัครไม่สำเร็จเพราะข้อมูลซ้ำ
            console.log(`[REGISTER_FAILED] ⚠️ สมัครสมาชิกไม่สำเร็จ - อีเมลหรือเลขบัตรประชาชนถูกใช้งานแล้ว (${Email})`);
            return res.status(400).json({ message: '❌ อีเมลหรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(Password, saltRounds);

        await db.query('START TRANSACTION');

        // 🔥 สร้างรหัส PatientID ใหม่รูปแบบ (SR-XXXXXXX) 🔥
        const [lastPatient] = await db.execute(
            'SELECT PatientID FROM patient ORDER BY PatientID DESC LIMIT 1 FOR UPDATE'
        );

        let nextNumber = 1;
        if (lastPatient.length > 0) {
            const lastId = lastPatient[0].PatientID;
            if (lastId && lastId.toString().startsWith('SR-')) {
                nextNumber = parseInt(lastId.substring(3)) + 1;
            } else if (!isNaN(lastId)) {
                nextNumber = parseInt(lastId) + 1;
            }
        }
        
        // เติม 0 ให้ครบ 7 หลัก แล้วต่อท้าย 'SR-'
        const newPatientId = `SR-${nextNumber.toString().padStart(7, '0')}`;

        // เพิ่ม newPatientId เข้าไปในคำสั่ง INSERT
        await db.execute(
            'INSERT INTO patient (PatientID, patient_name, IDCard13, Gender, Birthday, Phone, Email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newPatientId, Name, IDCard13, Gender, Birthday, Phone, Email]
        );

        await db.execute(
            'INSERT INTO account (PatientID, Email, PASSWORD) VALUES (?, ?, ?)',
            [newPatientId, Email, hashedPassword]
        );

        await db.query('COMMIT');
        
        // 🟢 [LOG] บันทึกเมื่อสมัครสมาชิกสำเร็จ
        console.log(`[REGISTER_SUCCESS] ✅ สมัครสมาชิกสำเร็จ - PatientID: ${newPatientId}, ชื่อ: ${Name}, Email: ${Email}`);
        res.status(201).json({ message: '✅ สมัครสมาชิกสำเร็จ!' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[REGISTER_ERROR] ❌ เกิดข้อผิดพลาดในการสมัครสมาชิก:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', error: error.message });
    }
});

// ==========================================
// 📍 API: เข้าสู่ระบบ (Login)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { Email, Password } = req.body;

    // 🟢 [LOG] บันทึกการพยายามล็อกอิน
    console.log(`[LOGIN_ATTEMPT] 🔐 พยายามเข้าสู่ระบบ - Email: ${Email}`);

    try {
        const [users] = await db.execute('SELECT * FROM account WHERE Email = ?', [Email]);

        if (users.length === 0) {
            console.log(`[LOGIN_FAILED] ⚠️ เข้าสู่ระบบล้มเหลว - ไม่พบอีเมลในระบบ (${Email})`);
            return res.status(401).json({ message: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = users[0];
        const dbPassword = user.PASSWORD || user.Password || user.password;

        if (!Password || !dbPassword) {
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด: ไม่พบข้อมูลรหัสผ่านในระบบ' });
        }

        const isPasswordValid = await bcrypt.compare(Password, dbPassword);

        if (!isPasswordValid) {
            console.log(`[LOGIN_FAILED] ⚠️ เข้าสู่ระบบล้มเหลว - รหัสผ่านไม่ถูกต้อง (${Email})`);
            return res.status(401).json({ message: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const role = user.ROLE || user.Role || user.role;
        const patientId = user.PATIENTID || user.PatientID || user.patientID;

        const token = jwt.sign(
            {
                accountId: user.ACCOUNTID || user.AccountID || user.accountID,
                patientId: patientId,
                email: user.EMAIL || user.Email || user.email,
                role: role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 🟢 [LOG] บันทึกเมื่อล็อกอินสำเร็จ
        console.log(`[LOGIN_SUCCESS] ✅ เข้าสู่ระบบสำเร็จ - Email: ${Email}, Role: ${role}, PatientID: ${patientId}`);

        res.status(200).json({
            message: '✅ เข้าสู่ระบบสำเร็จ',
            token: token,
            patientId: patientId,
            role: role
        });

    } catch (error) {
        console.error('[LOGIN_ERROR] ❌ เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', error: error.message });
    }
});

// ==========================================
// 📍 API: ดึงข้อมูลแผนกทั้งหมด
// ==========================================
app.get('/api/departments', async (req, res) => {
    try {
        const [departments] = await db.query('SELECT * FROM department ORDER BY Department_Name ASC');
        res.status(200).json(departments);
    } catch (error) {
        console.error('Fetch Departments Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' });
    }
});

// ==========================================
// 📍 API: ดึงข้อมูลแพทย์ตามแผนก
// ==========================================
app.get('/api/departments/:departmentId/doctors', async (req, res) => {
    const { departmentId } = req.params;

    try {
        const [doctors] = await db.execute(
            'SELECT Doctor_ID, Doctor_Name FROM doctor WHERE Department_ID = ?',
            [departmentId]
        );
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Fetch Doctors Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแพทย์' });
    }
});

// ==========================================
// 📍 API: ดึงรายชื่อแพทย์ทั้งหมด
// ==========================================
app.get('/api/all-doctors', async (req, res) => {
    try {
        const query = `
            SELECT d.Doctor_ID as id, d.Doctor_Name as name,
                   dp.Department_ID as departmentId, dp.Department_Name as departmentName,
                   (SELECT GROUP_CONCAT(s.Specialty_Name SEPARATOR ', ')
                    FROM doctor_specialty ds
                    JOIN specialty s ON ds.Specialty_ID = s.Specialty_ID
                    WHERE ds.Doctor_ID = d.Doctor_ID) as spec,
                   (SELECT GROUP_CONCAT(sc.Day_of_Week SEPARATOR ', ')
                    FROM schedule sc
                    WHERE sc.Doctor_ID = d.Doctor_ID) as Day_of_Week
            FROM doctor d
            JOIN department dp ON d.Department_ID = dp.Department_ID
        `;
        const [doctors] = await db.execute(query);
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Fetch All Doctors Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแพทย์' });
    }
});

// ==========================================
// 📍 API: ดึงตารางเวลาเข้าตรวจ และความเชี่ยวชาญของแพทย์
// ==========================================
app.get('/api/doctors/:doctorId/info', async (req, res) => {
    const { doctorId } = req.params;

    try {
        const [schedules] = await db.execute(
            'SELECT Day_of_Week, Start_Time, End_Time FROM schedule WHERE Doctor_ID = ?',
            [doctorId]
        );

        const [specialties] = await db.execute(
            `SELECT s.Specialty_Name 
             FROM doctor_specialty ds 
             JOIN specialty s ON ds.Specialty_ID = s.Specialty_ID 
             WHERE ds.Doctor_ID = ?`,
            [doctorId]
        );

        res.status(200).json({
            schedules: schedules,
            specialties: specialties.map(sp => sp.Specialty_Name)
        });
    } catch (error) {
        console.error('Fetch Doctor Info Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแพทย์' });
    }
});

// ==========================================
// 📍 API: จองคิวตรวจ (Create Appointment)
// ==========================================
app.post('/api/appointments', async (req, res) => {
    const { patientId, doctorId, insuranceId, appointDate, appointTime, symptoms } = req.body;

    // 🟢 [LOG] บันทึกรายละเอียดการขอจองคิว
    console.log(`[APPOINTMENT_REQUEST] 📅 เริ่มการจองคิว - PatientID: ${patientId}, DoctorID: ${doctorId}, วันที่: ${appointDate} เวลา: ${appointTime}, อาการ: ${symptoms || 'ไม่ระบุ'}`);

    try {
        await db.query('START TRANSACTION');

        const [appointResult] = await db.execute(
            `INSERT INTO appointment (PatientID, Doctor_ID, InsuranceID, AppointDate, AppointTime, Symptoms, Status) 
             VALUES (?, ?, ?, ?, ?, ?, 'ยืนยันแล้ว')`,
            [patientId, doctorId, insuranceId || null, appointDate, appointTime, symptoms]
        );

        const newAppointId = appointResult.insertId;

        const [lastQueue] = await db.execute(
            `SELECT q.QueueNumber 
             FROM queue q
             JOIN appointment a ON q.AppointID = a.AppointID
             WHERE a.Doctor_ID = ? AND a.AppointDate = ?
             ORDER BY a.AppointID DESC 
             LIMIT 1 FOR UPDATE`,
            [doctorId, appointDate]
        );

        let nextQueueNumber = 1;
        if (lastQueue.length > 0) {
            const lastNumber = parseInt(lastQueue[0].QueueNumber.substring(1));
            nextQueueNumber = lastNumber + 1;
        }

        const queueStr = `Q${nextQueueNumber.toString().padStart(3, '0')}`;

        await db.execute(
            "INSERT INTO queue (AppointID, QueueNumber, QueueStatus) VALUES (?, ?, 'รอเรียก')",
            [newAppointId, queueStr]
        );

        await db.query('COMMIT');

        // 🟢 [LOG] บันทึกเมื่อจองคิวสำเร็จ
        console.log(`[APPOINTMENT_SUCCESS] 🎉 จองคิวสำเร็จ - PatientID: ${patientId}, หมายเลขคิว: ${queueStr}, AppointID: ${newAppointId}`);

        res.status(201).json({
            message: '✅ จองคิวสำเร็จ!',
            appointmentId: newAppointId,
            queueNumber: queueStr
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('[APPOINTMENT_ERROR] ❌ เกิดข้อผิดพลาดในการจองคิว:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจองคิว' });
    }
});

// ==========================================
// 📍 API: ดึงประวัติการนัดหมายของผู้ป่วย
// ==========================================
app.get('/api/patients/:patientId/appointments', async (req, res) => {
    const { patientId } = req.params;

    try {
        const query = `
            SELECT a.AppointID, a.AppointDate, a.AppointTime, a.Status, a.Symptoms,
                   d.Doctor_Name, q.QueueNumber, q.QueueStatus
            FROM appointment a
            JOIN doctor d ON a.Doctor_ID = d.Doctor_ID
            LEFT JOIN queue q ON a.AppointID = q.AppointID
            WHERE a.PatientID = ?
            ORDER BY a.AppointDate DESC, a.AppointTime DESC
        `;
        const [appointments] = await db.execute(query, [patientId]);
        res.status(200).json(appointments);
    } catch (error) {
        console.error('Fetch Appointments Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการนัดหมาย' });
    }
});

// ==========================================
// 📍 API: ดึงข้อมูลคิวทั้งหมดสำหรับตารางหน้า Admin Dashboard
// ==========================================
app.get('/api/appointments', verifyAdmin, async (req, res) => {
    try {
        const query = `
            SELECT a.AppointID as id, 
                   a.AppointDate as date,
                   p.patient_name as patient,
                   d.Doctor_Name as doctor, 
                   dp.Department_Name as dept, 
                   TIME_FORMAT(a.AppointTime, '%H:%i') as time, 
                   a.Status as status
            FROM appointment a
            JOIN patient p ON a.PatientID = p.PatientID
            JOIN doctor d ON a.Doctor_ID = d.Doctor_ID
            JOIN department dp ON d.Department_ID = dp.Department_ID
            ORDER BY a.AppointDate DESC, a.AppointTime ASC
        `;
        const [appointments] = await db.execute(query);
        res.status(200).json(appointments);
    } catch (error) {
        console.error('Fetch Appointments Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคิว' });
    }
});

// ==========================================
// 📍 API: ดึงข้อมูลสรุปสำหรับ Admin Dashboard
// ==========================================
app.get('/api/admin/dashboard', verifyAdmin, async (req, res) => {
    try {
        const [
            [totalPatients],
            [todayDoctors],
            [todayAppointments],
            [pendingAppointments],
            [weeklyStats]
        ] = await Promise.all([
            db.execute('SELECT COUNT(*) as count FROM patient'),

            db.execute(`
                SELECT COUNT(DISTINCT Doctor_ID) as count 
                FROM schedule 
                WHERE Day_of_Week = CASE DAYOFWEEK(CURDATE())
                    WHEN 1 THEN 'อาทิตย์'
                    WHEN 2 THEN 'จันทร์'
                    WHEN 3 THEN 'อังคาร'
                    WHEN 4 THEN 'พุธ'
                    WHEN 5 THEN 'พฤหัสบดี'
                    WHEN 6 THEN 'ศุกร์'
                    WHEN 7 THEN 'เสาร์'
                END
            `),
            db.execute('SELECT COUNT(*) as count FROM appointment WHERE AppointDate = CURDATE()'),
            db.execute("SELECT COUNT(*) as count FROM appointment WHERE STATUS = 'ยืนยันแล้ว'"),

            // สถิติ 7 วันย้อนหลัง
            db.execute(`
                SELECT DATE_FORMAT(AppointDate, '%Y-%m-%d') as date, COUNT(*) as count 
                FROM appointment 
                WHERE AppointDate >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) 
                  AND AppointDate <= CURDATE()
                GROUP BY AppointDate 
                ORDER BY AppointDate ASC
            `)
        ]);

        const [recentPending] = await db.execute(`
            SELECT a.AppointID, p.patient_name as PatientName, d.Doctor_Name, a.AppointDate, a.AppointTime, a.Symptoms
            FROM appointment a
            JOIN patient p ON a.PatientID = p.PatientID
            JOIN doctor d ON a.Doctor_ID = d.Doctor_ID
            WHERE a.STATUS = 'ยืนยันแล้ว'
            ORDER BY a.AppointDate ASC, a.AppointTime ASC
            LIMIT 5
        `);

        res.status(200).json({
            stats: {
                totalPatients: totalPatients[0].count,
                totalDoctors: todayDoctors[0].count,
                todayAppointments: todayAppointments[0].count,
                pendingAppointments: pendingAppointments[0].count
            },
            weeklyStats: weeklyStats,
            recentPending: recentPending
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard' });
    }
});

// ==========================================
// 📍 API: อัปเดตสถานะคิวตรวจ (สำหรับ Admin)
// ==========================================
app.put('/api/appointments/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const [result] = await db.execute(
            'UPDATE appointment SET STATUS = ? WHERE AppointID = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลคิวตรวจที่ต้องการอัปเดต' });
        }

        res.status(200).json({ message: 'อัปเดตสถานะสำเร็จ' });
    } catch (error) {
        console.error('Update STATUS Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
});

// ==========================================
// 📍 API: อนุมัติคิวจากหน้า Admin
// ==========================================
app.put('/api/appointments/:id/approve', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("UPDATE appointment SET STATUS = 'ตรวจเสร็จสิ้น' WHERE AppointID = ?", [id]);
        res.status(200).json({ message: '✅ อนุมัติคิวสำเร็จ' });
    } catch (error) {
        console.error('Approve appointment Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติคิว' });
    }
});

// ==========================================
// 📍 API: ยกเลิกคิวจากหน้า Admin
// ==========================================
app.put('/api/appointments/:id/cancel', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("UPDATE appointment SET STATUS = 'ยกเลิก' WHERE AppointID = ?", [id]);
        res.status(200).json({ message: '✅ ยกเลิกคิวสำเร็จ' });
    } catch (error) {
        console.error('Cancel appointment Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิกคิว' });
    }
});

// ==========================================
// 🚀 Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});