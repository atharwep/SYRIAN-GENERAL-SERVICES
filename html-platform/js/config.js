const CONFIG = {
    // تم التحديث للعمل مع السيرفر الجديد (NestJS)
    API_BASE_URL: "http://localhost:3001",

    // إعدادات الرسائل
    SMS_SENDER: "WusulApp",

    // إعدادات فايربيز
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyB1rvwW8UnvXdoQ8U6wMjKbo-yVtvzcg_w",
        authDomain: "studio-4149114687-286db.firebaseapp.com",
        projectId: "studio-4149114687-286db",
        storageBucket: "studio-4149114687-286db.firebasestorage.app",
        messagingSenderId: "355804461592",
        appId: "1:355804461592:web:60fb19831efd61c9d2216d",
        databaseURL: "https://studio-4149114687-286db-default-rtdb.firebaseio.com"
    },

    // وضع المطور
    DEBUG_MODE: false
};

// تجميد الإعدادات لمنع التعديل العرضي
Object.freeze(CONFIG);
