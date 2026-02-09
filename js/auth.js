
/*
 FIXED AUTH.JS
 - Prevents localStorage wipe after login
 - Ensures user session persists across pages
 - Safe Store.init() (runs only once)
*/

const Store = {
    user: JSON.parse(localStorage.getItem('wusul_user')) || null,

    getUsers: () => JSON.parse(localStorage.getItem('wusul_users_db')) || [],
    setUsers: (users) => localStorage.setItem('wusul_users_db', JSON.stringify(users)),

    getData: (key) => JSON.parse(localStorage.getItem(`wusul_db_${key}`)) || [],
    setData: (key, data) => localStorage.setItem(`wusul_db_${key}`, JSON.stringify(data)),

    init: () => {
        const DB_VERSION = "wusul_db_v2_fresh";

        // ✅ DO NOT RESET if user already logged in
        if (Store.user) return;

        if (localStorage.getItem('wusul_db_init') !== DB_VERSION) {
            console.log("🔧 Initializing database (first time only)");

            localStorage.clear();

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
            Store.user = null;
        }
    }
};

const Auth = {
    finalizeLogin: (user, token = null) => {
        localStorage.setItem('wusul_user', JSON.stringify(user));
        if (token) localStorage.setItem('wusul_token', token);
        Store.user = user;
    },

    logout: () => {
        localStorage.removeItem('wusul_user');
        Store.user = null;
        window.location.href = 'index.html';
    },

    check: () => {
        // 🔄 Restore user on refresh
        if (!Store.user) {
            Store.user = JSON.parse(localStorage.getItem('wusul_user'));
        }

        const page = window.location.pathname.split("/").pop();
        const guestPages = ['index.html', 'login.html', 'register.html', ''];

        if (!Store.user && !guestPages.includes(page)) {
            window.location.href = 'login.html';
        }

        if (Store.user && (page === 'login.html' || page === 'register.html')) {
            window.location.href = 'dashboard.html';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // ✅ Init DB only once
    if (!localStorage.getItem('wusul_db_init')) {
        Store.init();
    }

    Auth.check();
});
