# 🚀 دليل الإعداد والتكوين - معاملاتي

## 📋 المحتويات
1. [إعداد Firebase](#firebase-setup)
2. [إعداد Twilio SMS](#twilio-setup)
3. [تفعيل نظام الأمان](#security-activation)
4. [اختبار النظام](#testing)
5. [النشر للإنتاج](#deployment)

---

## 🔥 إعداد Firebase

### الخطوة 1: إنشاء مشروع Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. انقر على "Add Project" (إضافة مشروع)
3. أدخل اسم المشروع: `muamalati-platform`
4. فعّل Google Analytics (اختياري)
5. انقر "Create Project"

### الخطوة 2: تفعيل Realtime Database

1. من القائمة الجانبية، اختر **Build** > **Realtime Database**
2. انقر "Create Database"
3. اختر الموقع: `europe-west1` (الأقرب للشرق الأوسط)
4. ابدأ بوضع **Test Mode** (سنحدث القواعد لاحقاً)

### الخطوة 3: الحصول على بيانات الاعتماد

1. اذهب إلى **Project Settings** (⚙️ أعلى اليسار)
2. في تبويب **General**، انزل لقسم "Your apps"
3. انقر على أيقونة الويب `</>`
4. سجل التطبيق باسم: `muamalati-web`
5. انسخ كائن `firebaseConfig`

### الخطوة 4: تحديث الكود

افتح ملف `js/firebase-config.js` وحدّث:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "muamalati-platform.firebaseapp.com",
    projectId: "muamalati-platform",
    storageBucket: "muamalati-platform.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456",
    databaseURL: "https://muamalati-platform-default-rtdb.europe-west1.firebasedatabase.app"
};
```

### الخطوة 5: قواعد الأمان (Security Rules)

في Firebase Console > Realtime Database > Rules، استبدل القواعد بـ:

```json
{
  "rules": {
    "users": {
      "$phone": {
        ".read": "auth != null && (auth.uid == $phone || root.child('users').child(auth.uid).child('role').val() == 'ADMIN')",
        ".write": "auth != null && (auth.uid == $phone || root.child('users').child(auth.uid).child('role').val() == 'ADMIN')"
      }
    },
    "doctors": {
      ".read": true,
      "$doctorId": {
        ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() == 'ADMIN'"
      }
    },
    "transactions": {
      "$txId": {
        ".read": "auth != null && (data.child('userPhone').val() == auth.uid || root.child('users').child(auth.uid).child('role').val() == 'ADMIN')",
        ".write": "auth != null"
      }
    },
    "bookings": {
      "$bookingId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 📱 إعداد Twilio SMS

### الخطوة 1: إنشاء حساب Twilio

1. اذهب إلى [Twilio.com](https://www.twilio.com/try-twilio)
2. سجل حساب جديد (مجاني للتجربة)
3. أكمل التحقق من الهاتف

### الخطوة 2: الحصول على رقم Twilio

1. من Dashboard، اذهب إلى **Phone Numbers** > **Manage** > **Buy a number**
2. اختر دولة (يفضل USA للتكلفة الأقل)
3. فعّل **SMS** capability
4. اشترِ الرقم (مجاني في الفترة التجريبية)

### الخطوة 3: الحصول على بيانات الاعتماد

1. من Dashboard الرئيسي، انسخ:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### الخطوة 4: تحديث الكود

افتح `js/twilio-sms.js` وحدّث:

```javascript
config: {
    accountSid: 'AC1234567890abcdef1234567890abcd',  // من Twilio Dashboard
    authToken: 'your_auth_token_here',               // من Twilio Dashboard
    phoneNumber: '+12345678901',                     // رقم Twilio الذي اشتريته
    apiUrl: 'https://api.twilio.com/2010-04-01/Accounts'
}
```

### الخطوة 5: إضافة أرقام مسموحة (للحساب التجريبي)

في الحساب التجريبي، يجب إضافة الأرقام المستقبلة:

1. اذهب إلى **Phone Numbers** > **Verified Caller IDs**
2. انقر **Add a new number**
3. أدخل رقمك السوري بصيغة: `+963xxxxxxxxx`
4. أكمل التحقق

---

## 🔐 تفعيل نظام الأمان

### الخطوة 1: تحديث JWT Secret

افتح `js/security.js` وغيّر:

```javascript
JWT_SECRET: 'YOUR_UNIQUE_SUPER_SECRET_KEY_' + Date.now() + '_RANDOM_' + Math.random()
```

⚠️ **مهم جداً:** لا تشارك هذا المفتاح مع أحد!

### الخطوة 2: تفعيل تشفير كلمات المرور

في `js/auth.js`، حدّث دالة التسجيل:

```javascript
register: async (name, phone, password, role = 'USER', extraData = {}) => {
    // تشفير كلمة المرور قبل الحفظ
    const hashedPassword = await SecurityManager.hashPassword(password);
    
    const userData = {
        id: Date.now(),
        name,
        phone,
        password: hashedPassword,  // محفوظة مشفرة
        role,
        balanceUSD: 0,
        balanceSYP: 0,
        avatar: "assets/nuser.png",
        ...extraData
    };
    
    // حفظ في Firebase
    await HybridStore.saveUser(userData);
    
    // إنشاء JWT Token
    const token = SecurityManager.generateToken(userData);
    SecurityManager.saveSession(token, userData);
    
    return { success: true, user: userData, token };
}
```

### الخطوة 3: تحديث دالة تسجيل الدخول

```javascript
login: async (phone, password) => {
    // التحقق من Rate Limiting
    const rateCheck = SecurityManager.rateLimiter.checkLimit(phone, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
        return { success: false, message: rateCheck.message };
    }

    // جلب المستخدم
    const user = await HybridStore.getUser(phone);
    if (!user) {
        return { success: false, message: "رقم الهاتف غير مسجل" };
    }

    // التحقق من كلمة المرور
    const isValid = await SecurityManager.verifyPassword(password, user.password);
    if (!isValid) {
        return { success: false, message: "كلمة المرور غير صحيحة" };
    }

    // إنشاء JWT Token
    const token = SecurityManager.generateToken(user);
    SecurityManager.saveSession(token, user);

    // إعادة تعيين Rate Limiter
    SecurityManager.rateLimiter.reset(phone);

    return { success: true, user, token };
}
```

---

## 🧪 اختبار النظام

### اختبار Firebase

```javascript
// في Console المتصفح
const testUser = {
    id: Date.now(),
    name: "مستخدم تجريبي",
    phone: "0936020439",
    password: "test123",
    role: "USER"
};

HybridStore.saveUser(testUser).then(result => {
    console.log("✅ Firebase Test:", result);
});
```

### اختبار Twilio SMS

```javascript
// في Console المتصفح
TwilioSMS.send('+963936020439', 'رسالة تجريبية من معاملاتي').then(result => {
    console.log("✅ Twilio Test:", result);
});
```

### اختبار الأمان

```javascript
// اختبار تشفير كلمة المرور
SecurityManager.hashPassword('test123').then(hash => {
    console.log("Hashed:", hash);
    
    SecurityManager.verifyPassword('test123', hash).then(valid => {
        console.log("✅ Password Valid:", valid);
    });
});

// اختبار JWT
const token = SecurityManager.generateToken({ id: 1, phone: '0936020439', role: 'ADMIN' });
console.log("Token:", token);

const verification = SecurityManager.verifyToken(token);
console.log("✅ Token Valid:", verification);
```

---

## 🚀 النشر للإنتاج

### 1. تحديث ملفات HTML

أضف السكريبتات الجديدة في `<head>` لجميع الصفحات:

```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js"></script>

<!-- Security & SMS -->
<script src="js/security.js"></script>
<script src="js/firebase-config.js"></script>
<script src="js/twilio-sms.js"></script>
```

### 2. تفعيل HTTPS

⚠️ **إلزامي للإنتاج!**

- استخدم **Netlify** أو **Vercel** (HTTPS مجاني تلقائياً)
- أو **Cloudflare Pages**
- أو احصل على شهادة SSL من **Let's Encrypt**

### 3. متغيرات البيئة (Environment Variables)

لا تحفظ المفاتيح السرية في الكود! استخدم:

```javascript
// في ملف .env (لا ترفعه على GitHub!)
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=your_super_secret_key_here
```

### 4. قائمة التحقق النهائية

- [ ] Firebase متصل ويعمل
- [ ] Twilio يرسل SMS حقيقية
- [ ] كلمات المرور مشفرة
- [ ] JWT Tokens تعمل
- [ ] HTTPS مفعل
- [ ] Rate Limiting يعمل
- [ ] جميع المفاتيح السرية في `.env`
- [ ] اختبار شامل على أجهزة مختلفة

---

## 📞 الدعم الفني

إذا واجهت أي مشكلة:

1. تحقق من Console المتصفح للأخطاء
2. راجع Firebase Console > Usage للتأكد من عدم تجاوز الحد المجاني
3. تحقق من Twilio Console > Logs لرؤية حالة الرسائل

---

## 🎉 تهانينا!

موقعك الآن جاهز للنشر مع:
- ✅ قاعدة بيانات حقيقية (Firebase)
- ✅ SMS حقيقي (Twilio)
- ✅ أمان متقدم (JWT + Hashing)
- ✅ حماية من الهجمات (Rate Limiting)

**الخطوة التالية:** ابدأ التسويق واجلب المستخدمين! 🚀
