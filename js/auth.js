// Premium Core Store with Real Firebase SMS Integration
const Store = {
    user: JSON.parse(localStorage.getItem('wusul_user')) || null,

    getUsers: () => JSON.parse(localStorage.getItem('wusul_users_db')) || [],
    setUsers: (users) => localStorage.setItem('wusul_users_db', JSON.stringify(users)),

    getData: (key) => JSON.parse(localStorage.getItem(`wusul_db_${key}`)) || [],
    setData: (key, data) => localStorage.setItem(`wusul_db_${key}`, JSON.stringify(data)),

    init: () => {
        if (!localStorage.getItem('wusul_db_init')) {
            const seedUsers = [
                { id: 1, name: "إدارة النظام", phone: "0936020439", password: "202025", role: "ADMIN", walletUSD: 1000, walletSYP: 15000000, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin" },
                { id: 2, name: "وكيل معتمد", phone: "0900000000", password: "agent", role: "AGENT", walletUSD: 500, walletSYP: 5000000, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=agent1" }
            ];
            Store.setUsers(seedUsers);

            // Seed Doctors if not exists
            const seedDoctors = [
                { id: 1, name: "د. أحمد عبدالله", specialty: "استشاري قلب وأوعية دموية", city: "دمشق", displayPrice: "$40", avatar: "https://ui-avatars.com/api/?name=Ahmed+Abdullah&background=0D8ABC&color=fff" },
                { id: 2, name: "د. سارة محمد", specialty: "أخصائية طب أطفال", city: "حلب", displayPrice: "150,000 ل.س", avatar: "https://ui-avatars.com/api/?name=Sara+Mohamed&background=E91E63&color=fff" },
                { id: 3, name: "د. خالد العمر", specialty: "استشاري جلدية", city: "اللاذقية", displayPrice: "$50", avatar: "https://ui-avatars.com/api/?name=Khaled+Omar&background=4CAF50&color=fff" }
            ];
            Store.setData('doctors', seedDoctors);

            localStorage.setItem('wusul_db_init', 'true');
        }
    },

    updateUserBalance: (phone, amount, currency, title, performedByRole = 'USER') => {
        const users = Store.getUsers();
        const userIndex = users.findIndex(u => u.phone === phone);
        if (userIndex === -1) return { success: false, message: "المستخدم غير موجود" };

        // Security check
        if (amount > 0 && performedByRole !== 'ADMIN' && performedByRole !== 'AGENT') {
            return { success: false, message: "غير مسموح لك بشحن الرصيد." };
        }

        // Initialize wallets if missing (migration)
        if (users[userIndex].walletUSD === undefined) users[userIndex].walletUSD = 0;
        if (users[userIndex].walletSYP === undefined) users[userIndex].walletSYP = 0;

        if (currency === 'USD') {
            users[userIndex].walletUSD += amount;
        } else {
            users[userIndex].walletSYP += amount;
        }

        Store.setUsers(users);

        // Record locally for history
        const txs = Store.getData('transactions');
        txs.unshift({
            id: Date.now(),
            userPhone: phone,
            amount: amount,
            currency: currency,
            title: title,
            date: new Date().toLocaleString('ar-SY')
        });
        Store.setData('transactions', txs);

        if (Store.user && Store.user.phone === phone) {
            Store.user = users[userIndex];
            localStorage.setItem('wusul_user', JSON.stringify(Store.user));
        }

        return { success: true, newBalance: currency === 'USD' ? users[userIndex].walletUSD : users[userIndex].walletSYP };
    },

    activateAgent: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        users[idx].role = 'AGENT';
        Store.setUsers(users);
        return { success: true, message: "تم تفعيل حساب الوكيل بنجاح" };
    },

    approveDoctor: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        users[idx].role = 'DOCTOR';
        Store.setUsers(users);

        // Also add to Doctors DB if not exists
        let doctors = Store.getData('doctors') || []; // Ensure array
        // Check if doctor exists by ID or similar name logic if ID isn't stable
        // For this mock, relying on ID is risky if ID=0 etc, but assuming unique IDs from seed
        if (!doctors.find(d => d.id === users[idx].id)) {
            doctors.push({
                id: users[idx].id, // Ensure this matches User ID
                name: "د. " + users[idx].name,
                specialty: "عام (تحت التدقيق)",
                cost: 0,
                avatar: users[idx].avatar,
                services: []
            });
            Store.setData('doctors', doctors);
        }

        return { success: true, message: "تم اعتماد المستخدم كطبيب بنجاح" };
    },

    makeAdmin: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        users[idx].role = 'ADMIN';
        Store.setUsers(users);
        return { success: true, message: " تمت ترقية المستخدم لمدير عام بنجاح 👑" };
    },

    deleteDoctor: (phone) => {
        const users = Store.getUsers();
        const uIdx = users.findIndex(u => u.phone === phone);
        if (uIdx === -1) return { success: false, message: "المستخدم غير موجود" };

        // Demote Role
        if (users[uIdx].role === 'DOCTOR') {
            users[uIdx].role = 'USER';
            Store.setUsers(users);
        } else {
            return { success: false, message: "هذا الرقم لا يعود لطبيب" };
        }

        // Remove from Doctors DB
        let doctors = Store.getData('doctors') || [];
        const dIdx = doctors.findIndex(d => d.id === users[uIdx].id);
        if (dIdx !== -1) {
            doctors.splice(dIdx, 1);
            Store.setData('doctors', doctors);
            return { success: true, message: "تم حذف الطبيب بنجاح وإلغاء صلاحياته" };
        }
        return { success: true, message: "تم إلغاء صلاحية الطبيب (لم يكن في القائمة العامة)" };
    },

    editDoctor: (phone, spec, price) => {
        const users = Store.getUsers();
        const uIdx = users.findIndex(u => u.phone === phone);
        if (uIdx === -1) return { success: false, message: "المستخدم غير موجود" };

        let doctors = Store.getData('doctors') || [];
        const dIdx = doctors.findIndex(d => d.id === users[uIdx].id);

        if (dIdx === -1) return { success: false, message: "لم يتم العثور على سجل الطبيب" };

        if (spec) doctors[dIdx].specialty = spec;
        if (price) doctors[dIdx].displayPrice = price;

        Store.setData('doctors', doctors);
        return { success: true, message: "تم تعديل بيانات الطبيب بنجاح" };
    }
};

// Professional SMS Gateway (Firebase + Simulation)
const SMS = {
    currentOTP: null,
    confirmationResult: null,

    // Convert local Syrian number to International format (+963)
    formatPhone: (phone) => {
        let p = phone.trim();
        if (p.startsWith('09')) p = '+963' + p.substring(1);
        if (p.startsWith('9')) p = '+963' + p;
        return p;
    },

    send: (phone, message) => {
        // Simulation Toast
        const toast = document.createElement('div');
        toast.className = "sms-toast";
        toast.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #1e293b; color: white; padding: 20px; border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3); z-index: 9999; width: 320px;
            font-size: 13px; font-weight: 700; border: 1px solid rgba(255,255,255,0.1);
            animation: slideDown 0.5s ease;
        `;
        toast.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                <span style="color:var(--gold);">📩 رسالة نصية (Syria)</span>
                <span style="opacity:0.5; font-size:10px;">الآن</span>
            </div>
            <p style="line-height:1.5;">${message}</p>
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 8000);
    }
};

const Auth = {
    login: async (phone, password) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, user: data.user, token: data.token };
            } else {
                // Return server error message
                return { success: false, message: data.message || "بيانات الدخول غير صحيحة" };
            }
        } catch (error) {
            console.error("API Login Error, falling back to local:", error);
            // Fallback for local testing
            const user = Store.getUsers().find(u => u.phone === phone && u.password === password);
            if (user) return { success: true, user };
            return { success: false, message: "بيانات الدخول غير صحيحة أو السيرفر متوقف" };
        }
    },

    register: async (name, phone, password, role = 'USER') => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password, role })
            });
            const data = await response.json();
            if (response.ok) {
                // Save to local DB as well for consistency in hybrid mode
                const users = Store.getUsers();
                if (!users.find(u => u.phone === phone)) {
                    users.push({ ...data.user, password }); // Password stored locally for demo
                    Store.setUsers(users);
                }
                return { success: true, user: data.user, token: data.token };
            } else {
                return { success: false, message: data.message || "فشل إنشاء الحساب" };
            }
        } catch (error) {
            console.error("API Register Error, falling back to local:", error);
            // Local fallback
            const users = Store.getUsers();
            if (users.find(u => u.phone === phone)) {
                return { success: false, message: "المسخدم موجود مسبقاً محلياً" };
            }
            const newUser = {
                id: Date.now(),
                name,
                phone,
                password,
                role,
                balance: 0,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
            };
            users.push(newUser);
            Store.setUsers(users);
            return { success: true, user: newUser };
        }
    },

    // Real Firebase OTP Sent
    sendOTP: (phone, elementId) => {
        const fullPhone = SMS.formatPhone(phone);

        if (typeof firebase !== 'undefined' && firebase.auth) {
            const appVerifier = new firebase.auth.RecaptchaVerifier(elementId, {
                'size': 'invisible'
            });

            return firebase.auth().signInWithPhoneNumber(fullPhone, appVerifier)
                .then((result) => {
                    SMS.confirmationResult = result;
                    return { success: true };
                }).catch((error) => {
                    console.error("Firebase SMS Error:", error);
                    // Fallback to simulation if Firebase fails (e.g. domain not authorized)
                    const opt = Math.floor(100000 + Math.random() * 900000);
                    SMS.currentOTP = opt;
                    SMS.send(phone, `[تجريبي] رمز الأمان الخاص بك هو: ${opt}`);
                    return { success: true, simulated: true, code: opt };
                });
        } else {
            // Simulated OTP
            const opt = Math.floor(100000 + Math.random() * 900000);
            SMS.currentOTP = opt;
            SMS.send(phone, `[محاكاة] رمز الأمان الخاص بك هو: ${opt}`);
            return Promise.resolve({ success: true, simulated: true, code: opt });
        }
    },

    verifyOTP: (code) => {
        if (SMS.confirmationResult) {
            return SMS.confirmationResult.confirm(code)
                .then(() => ({ success: true }))
                .catch(() => ({ success: false, message: "رمز التأكيد غير صحيح" }));
        } else {
            // Simulated verification
            if (code == SMS.currentOTP) return Promise.resolve({ success: true });
            return Promise.resolve({ success: false, message: "رمز التأكيد غير صحيح" });
        }
    },

    finalizeLogin: (user, token = null) => {
        localStorage.setItem('wusul_user', JSON.stringify(user));
        if (token) localStorage.setItem('wusul_token', token);
        Store.user = user;
    },

    resetPassword: (phone, newPassword) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx !== -1) {
            users[idx].password = newPassword;
            Store.setUsers(users);
            return true;
        }
        return false;
    },

    logout: () => {
        localStorage.removeItem('wusul_user');
        Store.user = null;
        window.location.href = 'index.html';
    },

    check: () => {
        const currentPage = window.location.pathname.split("/").pop();
        const guestPages = ['index.html', 'login.html', 'register.html', ''];
        if (!Store.user && !guestPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
};

const UI = {
    initResponsive: () => {
        const toggle = document.getElementById('mobile-toggle');
        const menu = document.getElementById('nav-menu');
        if (toggle && menu) {
            toggle.onclick = () => {
                toggle.classList.toggle('active');
                menu.classList.toggle('active');
            };
        }
    },

    updateNavbar: () => {
        const navRight = document.getElementById('nav-right');
        if (!navRight) return;

        if (Store.user) {
            navRight.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-info-nav" style="text-align: left;">
                        <p style="font-size: 8px; font-weight: 800; color: #64748B;">⭐️ ${Store.user.role}</p>
                        <p style="font-size: 11px; font-weight: 900; color: #10b981;">$${(Store.user.walletUSD || 0).toLocaleString()} | ${(Store.user.walletSYP || 0).toLocaleString()} ل.س</p>
                    </div>
                    <img src="${Store.user.avatar}" style="width: 35px; height: 35px; border-radius: 10px; border: 2px solid var(--gold);">
                    <button onclick="Auth.logout()" class="btn btn-outline" style="padding: 6px 10px; font-size: 10px;">خروج</button>
                </div>
            `;
        } else {
            navRight.innerHTML = `<a href="login.html" class="btn btn-primary" style="padding: 8px 15px; font-size: 12px;">دخول</a>`;
        }
    }
};

// Global SlideDown Animation
const appStyle = document.createElement('style');
appStyle.innerHTML = `
@keyframes slideDown { from { top: -100px; opacity: 0; } to { top: 20px; opacity: 1; } }
@media(max-width: 480px) { .user-info-nav { display: none !important; } }
`;
document.head.appendChild(appStyle);

// Initialize Firebase Production
if (typeof firebase !== 'undefined' && CONFIG.FIREBASE_CONFIG.apiKey !== "AIzaSy...") {
    try {
        firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        console.log("🚀 Firebase Production Ready.");
    } catch (e) { console.error("Firebase Init Error:", e); }
}

document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    Auth.check();
    UI.updateNavbar();
    UI.initResponsive();
});

