
// Basic Express Server with MySQL Connection
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'html-platform')));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'muamalati_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection
pool.getConnection()
    .then(conn => {
        console.log("✅ اتصل بقاعدة البيانات MySQL بنجاح!");
        conn.release();
    })
    .catch(err => {
        console.error("❌ فشل الاتصال بقاعدة البيانات:", err.message);
    });


// ================= ROUTES =================

// 1. Auth Login
app.post('/api/auth/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'رقم الهاتف غير مسجل' });
        }

        const user = rows[0];
        // In production, compare hashed password here
        if (user.password_hash !== password) { // Simple check for demo
            return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
        }

        // Return user data (exclude sensitive info)
        const { password_hash, ...userData } = user;
        res.json({ success: true, user: userData, token: 'mock-jwt-token-123' });

        // Log Activity
        logActivity(user.id, user.full_name, user.role, 'LOGIN', 'SYSTEM', null, 'تسجيل دخول ناجح');

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// 2. Get Patient Record
app.get('/api/patients/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM patients WHERE user_id = ? OR phone = ?', [req.params.userId, req.params.userId]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'المريض غير موجود' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 3. Add Medical Record
app.post('/api/records', async (req, res) => {
    const { patient_id, doctor_id, diagnosis, prescription, notes } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes) VALUES (?, ?, ?, ?, ?)',
            [patient_id, doctor_id, diagnosis, prescription, notes]
        );

        res.json({ success: true, id: result.insertId, message: 'تم إضافة السجل بنجاح' });

        // Log
        logActivity(doctor_id, 'Doctor', 'DOCTOR', 'CREATE', 'RECORD', result.insertId, `إضافة تشخيص: ${diagnosis}`);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 4. Get Records History
app.get('/api/records/:patientId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC',
            [req.params.patientId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Helper: Log Activity
async function logActivity(userId, userName, role, action, targetType, targetId, desc) {
    try {
        await pool.query(
            'INSERT INTO activity_logs (user_id, user_name, role, action_type, target_type, target_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, userName, role, action, targetType, targetId, desc]
        );
    } catch (e) {
        console.error("Logging Failed:", e);
    }
}

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
