-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS muamalati_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE muamalati_db;

-- 1. جدول المستخدمين (للتكامل مع النظام الحالي)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('USER', 'DOCTOR', 'ADMIN', 'AGENT') DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول ملفات المرضى (Medical Card)
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- ربط مع جدول المستخدمين إذا وجد
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    blood_type VARCHAR(5),
    chronic_conditions TEXT, -- الأمراض المزمنة
    allergies TEXT, -- الحساسية
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. جدول السجلات الطبية (Medical Records)
CREATE TABLE IF NOT EXISTS medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT, -- يمكن أن يكون NULL إذا لم يكن الطبيب مسجلاً بالنظام
    doctor_name VARCHAR(100), -- لتخزين اسم الطبيب في حال لم يكن مسجلاً
    visit_type VARCHAR(50), -- كشفية، طوارئ، استشارة
    diagnosis TEXT NOT NULL, -- التشخيص
    prescription TEXT, -- الوصفة / الإجراء
    notes TEXT, -- ملاحظات الطبيب السرية
    visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 4. جدول المرفقات (Attachments)
CREATE TABLE IF NOT EXISTS attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50), -- PDF, JPG, etc.
    file_url VARCHAR(500) NOT NULL, -- رابط الملف على السيرفر
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 5. جدول روابط المشاركة (Shared Records)
CREATE TABLE IF NOT EXISTS shared_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT, -- المشاركة مع طبيب محدد (اختياري)
    secure_token VARCHAR(64) UNIQUE NOT NULL, -- التوكن المستخدم في الرابط
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 6. جدول سجل النشاطات (Activity Logs) - هام جداً
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(100),
    role VARCHAR(50),
    action_type VARCHAR(50), -- LOGIN, VIEW, CREATE, SHARE, UPLOAD
    target_type VARCHAR(50), -- RECORD, FILE, SYSTEM
    target_id INT, -- ID of the record/file
    description VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إضافة مستخدم تجريبي (كلمة المرور: 123456)
-- ملاحظة: في الإنتاج يجب استخدام كلمات مرور مشفرة
INSERT INTO users (phone, password_hash, full_name, role) VALUES 
('0900000000', '123456', 'Admin User', 'ADMIN'),
('0911111111', '123456', 'د. سامر العلي', 'DOCTOR');
