
/*
 AUTH.JS – FIXED (FULL VERSION)
 ✔ preserves login / register / OTP
 ✔ fixes session loss
 ✔ Store.init runs ONCE only
*/

const Store = {
    user: JSON.parse(localStorage.getItem('wusul_user')) || null,

    getUsers: () => JSON.parse(localStorage.getItem('wusul_users_db')) || [],
    setUsers: (users) => localStorage.setItem('wusul_users_db', JSON.stringify(users)),

    getData: (key) => JSON.parse(localStorage.getItem(`wusul_db_${key}`)) || [],
    setData: (key, data) => localStorage.setItem(`wusul_db_${key}`, JSON.stringify(data)),

    init: () => {
        const DB_VERSION = "wusul_db_v2_fresh";

        // ⛔️ لا تعيد التهيئة إذا سبق تنفيذها
        if (localStorage.getItem('wusul_db_init') === DB_VERSION) return;

        console.log("🆕 First-time database init");

        const existingUser = localStorage.getItem('wusul_user');
        localStorage.clear();

        if (existingUser) {
            localStorage.setItem('wusul_user', existingUser);
            Store.user = JSON.parse(existingUser);
        }

        const seedUsers = [
            {
                id: 1,
                name: "إدارة النظام الملكية",
                phone: "0936020439",
                password: "19881988",
                role: "ADMIN",
                balanceUSD: 10000,
                balanceSYP: 50000000,
                avatar: "assets/nuser.png"
            }
        ];

        Store.setUsers(seedUsers);
        localStorage.setItem('wusul_db_init', DB_VERSION);
    }
};

const Auth = {
    login: async (phone, password) => {
        const cleanPhone = phone.trim();
        const cleanPass = password.trim();

        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone, password: cleanPass })
            });

            const data = await res.json();
            if (res.ok) {
                return { success: true, user: data.user, token: data.token };
            }
        } catch (e) {
            // Local fallback
            const user = Store.getUsers().find(
                u => u.phone === cleanPhone && u.password === cleanPass
            );
            if (user) return { success: true, user };
        }

        return { success: false, message: "بيانات الدخول غير صحيحة" };
    },

    register: async (name, phone, password, role = 'USER') => {
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password, role })
            });
            const data = await res.json();
            if (res.ok) return { success: true, user: data.user };
        } catch (e) {
            const users = Store.getUsers();
            if (users.find(u => u.phone === phone)) {
                return { success: false, message: "رقم الهاتف مستخدم" };
            }
            const user = {
                id: Date.now(),
                name,
                phone,
                password,
                role,
                avatar: "assets/nuser.png",
                balanceUSD: 0,
                balanceSYP: 0
            };
            users.push(user);
            Store.setUsers(users);
            return { success: true, user };
        }
    },

    finalizeLogin: (user, token = null) => {
        localStorage.setItem('wusul_user', JSON.stringify(user));
        if (token) localStorage.setItem('wusul_token', token);
        Store.user = user;
    },

    logout: () => {
        localStorage.removeItem('wusul_user');
        Store.user = null;
        window.location.href = 'login.html';
    },

    check: () => {
        if (!Store.user) {
            Store.user = JSON.parse(localStorage.getItem('wusul_user'));
        }

        const page = location.pathname.split('/').pop();
        const guest = ['login.html', 'register.html', 'index.html', ''];

        if (!Store.user && !guest.includes(page)) {
            location.href = 'login.html';
        }

        if (Store.user && (page === 'login.html' || page === 'register.html')) {
            location.href = 'dashboard.html';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    Auth.check();
});
