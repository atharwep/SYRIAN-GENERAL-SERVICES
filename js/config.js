const CONFIG = {
    // محلياً نستخدم السيرفر الذي قمنا ببنائه للتعامل مع الرسائل الحقيقية والبيانات الحساسة
    API_BASE_URL: "http://localhost:5000",

    // إعدادات الرسائل (في النسخة النهائية يتم استدعاؤها من السيرفر لحماية مفتاح API)
    SMS_SENDER: "WusulApp",

    // إعدادات فايربيز (Firebase) - تم التحديث ببيانات مشروعك الحقيقية
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyCkVeyrpON5wETANRIq5pMHIfJkVQFiL8w",
        authDomain: "studio-6531463847-82c37.firebaseapp.com",
        projectId: "studio-6531463847-82c37",
        storageBucket: "studio-6531463847-82c37.firebasestorage.app",
        messagingSenderId: "632352457616",
        appId: "1:632352457616:web:40eecc03658e3ea3d6e915"
    },

    // وضع المطور
    DEBUG_MODE: false
};

// تجميد الإعدادات لمنع التعديل العرضي
Object.freeze(CONFIG);
