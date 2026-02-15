# 🔗 دليل التكامل - ربط الأنظمة الجديدة

## 📋 نظرة عامة

هذا الدليل يشرح كيفية دمج الأنظمة الجديدة (Firebase, Twilio, Security) مع الصفحات الموجودة.

---

## 1️⃣ إضافة السكريبتات للصفحات

### في جميع صفحات HTML، أضف قبل `</head>`:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js"></script>

<!-- Security & Integration -->
<script src="js/security.js"></script>
<script src="js/firebase-config.js"></script>
<parameter name="twilio-sms.js"></script>
```

### الترتيب الصحيح للسكريبتات:

```html
1. Firebase SDK (من CDN)
2. js/config.js
3. js/security.js
4. js/firebase-config.js
5. js/twilio-sms.js
6. js/notifications.js
7. js/auth.js
8. باقي السكريبتات الخاصة بالصفحة
```

---

## 2️⃣ تحديث صفحة التسجيل (register.html)

### استبدل دالة التسجيل الحالية بـ:

```javascript
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value || 'USER';
    
    // تنظيف المدخلات
    const cleanPhone = SecurityManager.sanitize.phone(phone);
    const cleanName = SecurityManager.sanitize.string(name);
    
    // تشفير كلمة المرور
    const hashedPassword = await SecurityManager.hashPassword(password);
    
    // إنشاء بيانات المستخدم
    const userData = {
        id: Date.now(),
        name: cleanName,
        phone: cleanPhone,
        password: hashedPassword,
        role: role,
        balanceUSD: 0,
        balanceSYP: 0,
        avatar: "assets/nuser.png",
        createdAt: new Date().toISOString()
    };
    
    // حفظ في Firebase + LocalStorage
    const saveResult = await HybridStore.saveUser(userData);
    
    if (saveResult.success) {
        // إنشاء JWT Token
        const token = SecurityManager.generateToken(userData);
        SecurityManager.saveSession(token, userData);
        
        // إرسال SMS ترحيبي
        await EnhancedSMS.send(cleanPhone, 
            `مرحباً ${cleanName}! تم إنشاء حسابك في معاملاتي بنجاح 🎉`
        );
        
        // التوجيه للصفحة الرئيسية
        window.location.href = 'index.html';
    } else {
        alert('فشل التسجيل: ' + saveResult.error);
    }
}
```

---

## 3️⃣ تحديث صفحة تسجيل الدخول (login.html)

### استبدل دالة تسجيل الدخول بـ:

```javascript
async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    
    // تنظيف المدخلات
    const cleanPhone = SecurityManager.sanitize.phone(phone);
    
    // التحقق من Rate Limiting
    const rateCheck = SecurityManager.rateLimiter.checkLimit(cleanPhone, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
        alert(rateCheck.message);
        return;
    }
    
    // جلب المستخدم من Firebase/LocalStorage
    const user = await HybridStore.getUser(cleanPhone);
    
    if (!user) {
        alert('رقم الهاتف غير مسجل');
        return;
    }
    
    // التحقق من كلمة المرور
    const isValid = await SecurityManager.verifyPassword(password, user.password);
    
    if (!isValid) {
        alert('كلمة المرور غير صحيحة');
        return;
    }
    
    // إنشاء JWT Token
    const token = SecurityManager.generateToken(user);
    SecurityManager.saveSession(token, user);
    
    // إعادة تعيين Rate Limiter
    SecurityManager.rateLimiter.reset(cleanPhone);
    
    // إرسال OTP للتحقق (اختياري)
    const otpResult = await EnhancedSMS.sendOTP(cleanPhone);
    
    if (otpResult.success) {
        // عرض نموذج OTP
        showOTPForm();
    } else {
        // تسجيل دخول مباشر
        window.location.href = 'index.html';
    }
}
```

---

## 4️⃣ تحديث المحفظة (wallet.html)

### تحديث دالة التحويل:

```javascript
async function performTransfer(receiverPhone, amount, currency) {
    // التحقق من الجلسة
    const session = SecurityManager.getSession();
    if (!session) {
        alert('انتهت الجلسة. يرجى تسجيل الدخول مجدداً');
        window.location.href = 'login.html';
        return;
    }
    
    // تنظيف المدخلات
    const cleanPhone = SecurityManager.sanitize.phone(receiverPhone);
    const cleanAmount = SecurityManager.sanitize.number(amount);
    
    // التحقق من المستلم
    const receiver = await HybridStore.getUser(cleanPhone);
    if (!receiver) {
        alert('رقم المستلم غير صحيح');
        return;
    }
    
    // التحقق من الرصيد
    const sender = await HybridStore.getUser(session.user.phone);
    const balance = currency === 'USD' ? sender.balanceUSD : sender.balanceSYP;
    
    if (balance < cleanAmount) {
        alert('رصيد غير كافٍ');
        return;
    }
    
    // تنفيذ التحويل
    try {
        // خصم من المرسل
        await FirebaseDB.users.update(sender.phone, {
            [currency === 'USD' ? 'balanceUSD' : 'balanceSYP']: balance - cleanAmount
        });
        
        // إضافة للمستلم
        const receiverBalance = currency === 'USD' ? receiver.balanceUSD : receiver.balanceSYP;
        await FirebaseDB.users.update(receiver.phone, {
            [currency === 'USD' ? 'balanceUSD' : 'balanceSYP']: receiverBalance + cleanAmount
        });
        
        // حفظ المعاملة
        await FirebaseDB.transactions.create({
            senderPhone: sender.phone,
            receiverPhone: receiver.phone,
            amount: cleanAmount,
            currency: currency,
            type: 'TRANSFER',
            status: 'COMPLETED',
            timestamp: Date.now()
        });
        
        // إرسال إشعارات SMS
        await EnhancedSMS.send(sender.phone, 
            `تم تحويل ${cleanAmount} ${currency} إلى ${receiver.name}`
        );
        await EnhancedSMS.send(receiver.phone, 
            `تم استلام ${cleanAmount} ${currency} من ${sender.name}`
        );
        
        alert('تم التحويل بنجاح!');
        window.location.reload();
        
    } catch (error) {
        console.error('Transfer error:', error);
        alert('فشل التحويل: ' + error.message);
    }
}
```

---

## 5️⃣ تحديث الحجوزات الطبية (booking.html)

### تحديث دالة الحجز:

```javascript
async function confirmBooking(doctorId, timeSlot) {
    // التحقق من الجلسة
    const session = SecurityManager.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = await HybridStore.getUser(session.user.phone);
    
    // التحقق من الرصيد
    const doctor = await FirebaseDB.doctors.get(doctorId);
    if (user.balanceUSD < doctor.cost) {
        alert('رصيد غير كافٍ');
        return;
    }
    
    try {
        // خصم التكلفة
        await FirebaseDB.users.update(user.phone, {
            balanceUSD: user.balanceUSD - doctor.cost
        });
        
        // إنشاء الحجز
        const bookingResult = await FirebaseDB.bookings.create({
            patientPhone: user.phone,
            patientName: user.name,
            doctorId: doctorId,
            doctorName: doctor.name,
            timeSlot: timeSlot,
            cost: doctor.cost,
            status: 'CONFIRMED',
            createdAt: Date.now()
        });
        
        // إرسال SMS تأكيد
        await EnhancedSMS.sendBookingConfirmation(
            user.phone,
            doctor.name,
            timeSlot
        );
        
        alert('تم تأكيد الحجز! سيصلك SMS بالتفاصيل');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Booking error:', error);
        alert('فشل الحجز: ' + error.message);
    }
}
```

---

## 6️⃣ تحديث لوحة الإدارة (admin.html)

### تحديث دالة شحن الرصيد:

```javascript
async function performRecharge(targetPhone, amount, currency, type) {
    // التحقق من صلاحيات المدير
    const session = SecurityManager.getSession();
    if (!session || session.user.role !== 'ADMIN') {
        alert('غير مصرح لك بهذه العملية');
        return;
    }
    
    // تنظيف المدخلات
    const cleanPhone = SecurityManager.sanitize.phone(targetPhone);
    const cleanAmount = SecurityManager.sanitize.number(amount);
    
    // جلب المستخدم المستهدف
    const targetUser = await HybridStore.getUser(cleanPhone);
    if (!targetUser) {
        alert('المستخدم غير موجود');
        return;
    }
    
    try {
        // حساب الرصيد الجديد
        const currentBalance = currency === 'USD' ? targetUser.balanceUSD : targetUser.balanceSYP;
        const newBalance = type === 'UP' ? currentBalance + cleanAmount : currentBalance - cleanAmount;
        
        // تحديث الرصيد
        await FirebaseDB.users.update(cleanPhone, {
            [currency === 'USD' ? 'balanceUSD' : 'balanceSYP']: newBalance
        });
        
        // حفظ المعاملة
        await FirebaseDB.transactions.create({
            userPhone: cleanPhone,
            amount: type === 'UP' ? cleanAmount : -cleanAmount,
            currency: currency,
            type: type === 'UP' ? 'ADMIN_DEPOSIT' : 'ADMIN_WITHDRAWAL',
            performedBy: session.user.phone,
            timestamp: Date.now()
        });
        
        // إرسال إشعار SMS
        await TwilioSMS.sendTransactionNotification(
            cleanPhone,
            cleanAmount,
            currency,
            type === 'UP' ? 'deposit' : 'withdrawal'
        );
        
        alert(`تمت العملية بنجاح! الرصيد الجديد: ${newBalance.toLocaleString()} ${currency}`);
        
    } catch (error) {
        console.error('Recharge error:', error);
        alert('فشلت العملية: ' + error.message);
    }
}
```

---

## 7️⃣ حماية الصفحات (Page Protection)

### أضف في بداية كل صفحة محمية:

```javascript
// في بداية <script> الخاص بالصفحة
document.addEventListener('DOMContentLoaded', () => {
    // التحقق من الجلسة
    const session = SecurityManager.getSession();
    
    if (!session) {
        // إعادة توجيه لصفحة تسجيل الدخول
        window.location.href = 'login.html';
        return;
    }
    
    // التحقق من الصلاحيات (للصفحات الإدارية فقط)
    if (window.location.pathname.includes('admin.html')) {
        if (session.user.role !== 'ADMIN') {
            alert('غير مصرح لك بالوصول لهذه الصفحة');
            window.location.href = 'index.html';
            return;
        }
    }
    
    // تحديث UI بمعلومات المستخدم
    updateUserInterface(session.user);
});
```

---

## 8️⃣ معالجة الأخطاء العامة

### أضف في ملف عام (مثل config.js):

```javascript
// معالج أخطاء عام
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // إرسال للمراقبة (اختياري)
    if (ENV.MODE === 'production') {
        // Send to error tracking service
    }
});

// معالج الوعود غير المعالجة
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// معالج انتهاء الجلسة
setInterval(() => {
    const session = SecurityManager.getSession();
    if (!session && !window.location.pathname.includes('login.html')) {
        alert('انتهت جلستك. يرجى تسجيل الدخول مجدداً');
        window.location.href = 'login.html';
    }
}, 60000); // فحص كل دقيقة
```

---

## 9️⃣ قائمة التحقق النهائية

قبل النشر، تأكد من:

- [ ] تحديث جميع المفاتيح في `firebase-config.js`
- [ ] تحديث بيانات Twilio في `twilio-sms.js`
- [ ] تغيير `JWT_SECRET` في `security.js`
- [ ] إضافة السكريبتات لجميع الصفحات
- [ ] اختبار التسجيل وتسجيل الدخول
- [ ] اختبار التحويلات المالية
- [ ] اختبار الحجوزات
- [ ] اختبار لوحة الإدارة
- [ ] اختبار على أجهزة مختلفة
- [ ] مراجعة Console للأخطاء
- [ ] فحص Firebase Console للبيانات
- [ ] فحص Twilio Console للرسائل

---

## 🎉 تهانينا!

موقعك الآن مجهز بالكامل مع:
- ✅ قاعدة بيانات حقيقية
- ✅ SMS حقيقي
- ✅ أمان متقدم
- ✅ جاهز للنشر

**الخطوة التالية:** افتح `test-integration.html` لاختبار جميع الأنظمة!
