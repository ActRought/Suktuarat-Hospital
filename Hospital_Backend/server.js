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
        // อนุญาตถ้า origin อยู่ในรายการ หรือเป็น request ภายใน (!origin)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // กรณีไม่ตรง ให้ลองเช็คว่ามาจาก vercel.app หรือไม่ (Optional: เพื่อความยืดหยุ่น)
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

    try {
        const [existingUser] = await db.execute(
            'SELECT * FROM account a JOIN patient p ON a.PatientID = p.PatientID WHERE a.Email = ? OR p.IDCard13 = ?',
            [Email, IDCard13]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: '❌ อีเมลหรือเลขบัตรประชาชนนี้ถูกใช้งานแล้ว' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(Password, saltRounds);

        await db.query('START TRANSACTION');

        const [patientResult] = await db.execute(
            'INSERT INTO patient (patient_name, IDCard13, Gender, Birthday, Phone, Email) VALUES (?, ?, ?, ?, ?, ?)',
            [Name, IDCard13, Gender, Birthday, Phone, Email]
        );

        const newPatientId = patientResult.insertId;

        await db.execute(
            'INSERT INTO account (PatientID, Email, PASSWORD) VALUES (?, ?, ?)',
            [newPatientId, Email, hashedPassword]
        );

        await db.query('COMMIT');
        res.status(201).json({ message: '✅ สมัครสมาชิกสำเร็จ!' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Register Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', error: error.message });
    }
});

// ==========================================
// 📍 API: เข้าสู่ระบบ (Login)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { Email, Password } = req.body;

    try {
        const [users] = await db.execute('SELECT * FROM account WHERE Email = ?', [Email]);

        if (users.length === 0) {
            return res.status(401).json({ message: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = users[0];
        const dbPassword = user.PASSWORD || user.Password || user.password;

        if (!Password || !dbPassword) {
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด: ไม่พบข้อมูลรหัสผ่านในระบบ' });
        }

        const isPasswordValid = await bcrypt.compare(Password, dbPassword);

        if (!isPasswordValid) {
            return res.status(401).json({ message: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = jwt.sign(
            {
                accountId: user.ACCOUNTID || user.AccountID || user.accountID,
                patientId: user.PATIENTID || user.PatientID || user.patientID,
                email: user.EMAIL || user.Email || user.email,
                role: user.ROLE || user.Role || user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: '✅ เข้าสู่ระบบสำเร็จ',
            token: token,
            patientId: user.PATIENTID || user.PatientID || user.patientID,
            role: user.ROLE || user.Role || user.role
        });

    } catch (error) {
        console.error('Login Error:', error);
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

        res.status(201).json({
            message: '✅ จองคิวสำเร็จ!',
            appointmentId: newAppointId,
            queueNumber: queueStr
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Appointment Error:', error);
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
// 🛠️ API: อัปเดต Location/Phone โดยยึด Database เป็นหลัก (ผูกแผนกย่อยอัตโนมัติ)
// ==========================================
app.get('/api/seed-locations', async (req, res) => {
    // ข้อมูลแผนกหลักจากไฟล์ CSV (คัดมาเฉพาะตัวที่เป็นแผนกแม่ของ 45 แผนกใน DB)
    const baseLocations = [
        // 📞 รายการที่ต้องการให้เพิ่มใหม่
        { name: 'เบอร์ติดต่อกลาง (Call Center)', location: '-', phone: '1474 หรือ 02-419-1000', isNew: true },
        
        // 🏥 รายการแผนกหลักที่จะถูกดึงไปอัปเดตให้ทั้ง "แผนกหลัก" และ "แผนกย่อย"
        { name: 'ศูนย์ทางเดินอาหารและตับ', location: 'ชั้น 4 โซน A', phone: '02-419-1000 ต่อ 4111' },
        { name: 'ศูนย์นรีเวช', location: 'ชั้น 2 โซน E', phone: '02-419-1000 ต่อ 2111' },
        { name: 'ศูนย์ตา', location: 'ชั้น 4 โซน A', phone: '02-419-1000 ต่อ 4133-4' },
        { name: 'ศูนย์หู คอ จมูก', location: 'ชั้น 3 โซน D', phone: '02-419-1000 ต่อ 3431-2' },
        { name: 'ศูนย์ทันตกรรม', location: 'ชั้น 3 โซน A', phone: '02-419-1000 ต่อ 3122-3' },
        { name: 'ศูนย์เด็ก', location: 'ชั้น 3 โซน E', phone: '02-419-1000 ต่อ 3111' },
        { name: 'ศูนย์ระบบการหายใจ', location: 'ชั้น 3 โซน C', phone: '02-419-1000 ต่อ 3332' },
        { name: 'ศูนย์อายุรกรรม', location: 'ชั้น 2 โซน D', phone: '02-419-1000 ต่อ 2411-2' },
        { name: 'คลินิกตรวจสุขภาพ', location: 'ชั้น 4 โซน E', phone: '02-419-1000 ต่อ 4112' },
        { name: 'ศูนย์มะเร็ง', location: 'ชั้น 1 โซน E', phone: '02-419-1000 ต่อ 1133' },
        { name: 'ศูนย์โรคไต', location: 'ชั้น 6 โซน C', phone: '02-419-1000 ต่อ 6611' },
        { name: 'ศูนย์เอกซเรย์', location: 'ชั้น 1 โซน D', phone: '02-419-1000 ต่อ 1411' },
        { name: 'ศูนย์ออร์โธปิดิกส์', location: 'ชั้น 2 โซน A', phone: '02-419-1000 ต่อ 2121-2' },
        { name: 'ศูนย์ศัลยกรรม', location: 'ชั้น 2 โซน E', phone: '02-419-1000 ต่อ 2131-2' },
        { name: 'ศูนย์โรคภูมิแพ้', location: 'ชั้น 3 โซน D', phone: '02-419-1000 ต่อ 3411-2' },
        { name: 'ศูนย์ทางเดินปัสสาวะ', location: 'ชั้น 4 โซน A', phone: '02-419-1000 ต่อ 4124' },
        { name: 'ศูนย์เวชศาสตร์ฟื้นฟู', location: 'ชั้น 3 โซน C', phone: '02-419-1000 ต่อ 3311-2' },
        { name: 'คลินิกเบาหวาน ไทรอยด์ และต่อมไร้ท่อ', location: 'ชั้น 4 โซน D', phone: '02-419-1000 ต่อ 4411' },
        { name: 'ศูนย์หัวใจ', location: 'ชั้น 4 โซน C', phone: '02-419-1000 ต่อ 4311-3' },
        { name: 'ศูนย์ผิวหนังและศัลยกรรมตกแต่ง', location: 'ชั้น 3 โซน A', phone: '02-419-1000 ต่อ 3131-2' },
        { name: 'ศูนย์รักษาภาวะสายตาผิดปกติด้วยเลเซอร์', location: 'ชั้น 4 โซน A', phone: '02-419-1000 ต่อ 4141-2' },
        { name: 'คลินิกฟื้นฟูหัวใจ', location: 'ชั้น 4 โซน C', phone: '02-419-1000 ต่อ 4314' }
    ];

    try {
        // 1. เพิ่มคอลัมน์ (ถ้ายังไม่เคยมี)
        try {
            await db.query('ALTER TABLE department ADD Location VARCHAR(255), ADD Phone VARCHAR(50);');
            console.log('✅ สร้างคอลัมน์ Location และ Phone สำเร็จ');
        } catch (err) {
            console.log('ℹ️ คอลัมน์ Location และ Phone มีอยู่แล้ว ข้ามการสร้าง');
        }

        let updatedRowsCount = 0;
        
        // 2. วนลูปเพื่ออัปเดตข้อมูลให้แผนกต่างๆ
        for (let i = 0; i < baseLocations.length; i++) {
            const baseDept = baseLocations[i];
            
            if (baseDept.isNew) {
                // สำหรับ Call Center ตรวจสอบก่อนว่าเคยสร้างรึยัง
                const [checkExist] = await db.query('SELECT * FROM department WHERE Department_Name = ?', [baseDept.name]);
                if (checkExist.length === 0) {
                    await db.query(
                        'INSERT INTO department (Department_ID, Department_Name, Location, Phone) VALUES (?, ?, ?, ?)',
                        ['D046', baseDept.name, baseDept.location, baseDept.phone] // ใช้รหัส D046 ต่อจาก D045
                    );
                } else {
                    await db.query(
                        'UPDATE department SET Location = ?, Phone = ? WHERE Department_Name = ?',
                        [baseDept.location, baseDept.phone, baseDept.name]
                    );
                }
            } else {
                // 🔥 หัวใจสำคัญ: ใช้คำสั่ง LIKE ควบคู่กับ % 
                // เช่น ถ้าชื่อคือ 'ศูนย์เด็ก' มันจะอัปเดตให้ทั้ง 'ศูนย์เด็ก' และ 'ศูนย์เด็ก (โรคข้อและรูมาติสซั่ม)' ทันที!
                const queryStr = `${baseDept.name}%`;
                const [result] = await db.query(
                    'UPDATE department SET Location = ?, Phone = ? WHERE Department_Name LIKE ?',
                    [baseDept.location, baseDept.phone, queryStr]
                );
                
                updatedRowsCount += result.affectedRows; 
            }
        }
        
        // หมายเหตุ: แผนกอย่าง 'D017 ศูนย์เวชศาสตร์นิวเคลียร์' และ 'D030 ศ.คลินิก...' 
        // จะไม่ถูกอัปเดตข้อมูล เพราะไม่มีข้อมูลระบุในไฟล์ CSV ซึ่งตรงตามที่คุณต้องการ
        
        res.status(200).send(`✅ สำเร็จ! อัปเดตข้อมูลเสร็จสิ้น ครอบคลุมแผนกในฐานข้อมูลรวมทั้งหมด ${updatedRowsCount} รายการ และเพิ่ม Call Center สำเร็จครับ! 🚀`);
    } catch (error) {
        console.error('Seed Database Error:', error);
        res.status(500).send(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
});

// ==========================================
// 🚀 Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
// แก้ไข: ลบ '0.0.0.0' ออกในบางกรณีเพื่อให้ Render จัดการ Port ได้ง่ายขึ้น
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});