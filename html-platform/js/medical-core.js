
// Medical Core System - Hybrid (Firebase + LocalStorage)
// Supports Online Database (No Hosting Required) via Firebase Realtime Database

const MedicalCore = {
    // Database Tables (Paths)
    TABLES: {
        PATIENTS: 'medical/patients',
        RECORDS: 'medical/records',
        ATTACHMENTS: 'medical/attachments',
        LOGS: 'medical/logs',
        SHARES: 'medical/shares'
    },

    // Initialize System
    init: async () => {
        // specific initialization if needed
        console.log("Medical Core Initialized");

        // Sync check: if we have local data but no remote, push it? 
        // For now, we prefer reading from remote if available.
    },

    // Seed Initial Data - REMOVED FOR PRODUCTION
    seedData: async () => { },

    // ================= DATA ACCESS HELPERS =================

    // Helper: Get Data (Firebase Only)
    getData: async (path) => {
        if (typeof firebaseDB === 'undefined') {
            console.error("Firebase Database not initialized!");
            return [];
        }

        try {
            const snapshot = await firebaseDB.ref(path).once('value');
            if (snapshot.exists()) {
                // If it's a list (array-like object in Firebase), convert to array
                const val = snapshot.val();
                if (Array.isArray(val)) return val;
                return Object.keys(val).map(key => val[key]);
            }
            return [];
        } catch (e) {
            console.error("Firebase Read Error:", e);
            if (typeof Notify !== 'undefined') Notify.show('خطأ اتصال', 'فشل الاتصال بقاعدة البيانات السحابية', 'fas fa-wifi');
            return [];
        }
    },

    // Helper: Save Data (Firebase Only)
    saveData: async (path, dataArray) => {
        if (typeof firebaseDB === 'undefined') return;
        try {
            await firebaseDB.ref(path).set(dataArray);
        } catch (e) {
            console.error("Firebase Write Error:", e);
            if (typeof Notify !== 'undefined') Notify.show('خطأ حفظ', 'فشل حفظ البيانات سحابياً', 'fas fa-cloud-upload-alt');
        }
    },

    // Helper: Add Item (Firebase Only)
    addItem: async (path, item) => {
        if (typeof firebaseDB === 'undefined') return;
        try {
            const key = item.id || firebaseDB.ref(path).push().key;
            await firebaseDB.ref(`${path}/${key}`).set(item);
        } catch (e) {
            console.error("Firebase Add Error:", e);
        }
    },

    // ================= SPECIFIC METHODS =================

    getPatients: async () => {
        return await MedicalCore.getData(MedicalCore.TABLES.PATIENTS);
    },

    getPatient: async (userId) => {
        const patients = await MedicalCore.getPatients();
        return patients.find(p => p.user_id === userId || p.phone === userId);
    },

    getRecords: async (patientId) => {
        const records = await MedicalCore.getData(MedicalCore.TABLES.RECORDS);
        return records.filter(r => r.patient_id === patientId).sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
    },

    getAttachments: async (patientId) => {
        const files = await MedicalCore.getData(MedicalCore.TABLES.ATTACHMENTS);
        return files.filter(f => f.patient_id === patientId).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    },

    addRecord: async (recordData) => {
        const newRecord = {
            id: 'rec_' + Date.now(),
            created_at: new Date().toISOString(),
            ...recordData
        };

        await MedicalCore.addItem(MedicalCore.TABLES.RECORDS, newRecord);
        MedicalCore.logActivity('CREATE', 'record', newRecord.id, `إضافة سجل طبي جديد: ${recordData.diagnosis}`);
        return newRecord;
    },

    uploadFile: async (fileData) => {
        const newFile = {
            id: 'file_' + Date.now(),
            uploaded_at: new Date().toISOString(),
            ...fileData
        };

        await MedicalCore.addItem(MedicalCore.TABLES.ATTACHMENTS, newFile);
        MedicalCore.logActivity('UPLOAD', 'file', newFile.id, `رفع ملف طبي: ${fileData.file_name}`);
        return newFile;
    },

    createShareLink: async (patientId, doctorId = null) => {
        const token = SecurityManager.generateSecureRandom(16);
        const newShare = {
            id: 'share_' + Date.now(),
            patient_id: patientId,
            shared_with_doctor_id: doctorId,
            secure_token: token,
            expires_at: Date.now() + (24 * 60 * 60 * 1000),
            created_at: new Date().toISOString()
        };

        await MedicalCore.addItem(MedicalCore.TABLES.SHARES, newShare);
        MedicalCore.logActivity('SHARE', 'record', patientId, `إنشاء رابط مشاركة أضبارة`);
        return token;
    },

    logActivity: async (actionType, targetType, targetId, description) => {
        const user = Store.user || { id: 'guest', role: 'UNKNOWN', name: 'Zair' };
        const newLog = {
            id: 'log_' + Date.now(),
            user_id: user.id,
            user_name: user.name,
            role: user.role,
            action_type: actionType,
            target_type: targetType,
            target_id: targetId,
            description: description,
            timestamp: new Date().toISOString()
        };

        // Fire & Forget mostly
        MedicalCore.addItem(MedicalCore.TABLES.LOGS, newLog);
        console.log(`[ACTIVITY LOG] ${user.name}: ${description}`);

        if (typeof Notify !== 'undefined' && typeof Notify.show === 'function') {
            Notify.show('نشاط جديد', description, 'fas fa-clipboard-list');
        }
    }
};

// Auto-run init
document.addEventListener('DOMContentLoaded', () => {
    MedicalCore.init();
});
