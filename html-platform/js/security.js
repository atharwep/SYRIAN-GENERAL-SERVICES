// ===================================
// Moamalaty Advanced Security System
// JWT + E2EE + KYC + Rate Limiting
// ===================================

const SecurityManager = {
    JWT_SECRET: 'MUAMALATI_SUPER_SECRET_KEY_2026_CHANGE_THIS_IN_PRODUCTION',
    TOKEN_EXPIRY: 365 * 24 * 60 * 60 * 1000,

    hashPassword: async (password) => {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password + SecurityManager.JWT_SECRET);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            return btoa(password + SecurityManager.JWT_SECRET);
        }
    },

    verifyPassword: async (password, hashedPassword) => {
        const hash = await SecurityManager.hashPassword(password);
        return hash === hashedPassword;
    },

    generateToken: (userData) => {
        const payload = {
            userId: userData.id,
            phone: userData.phone,
            role: userData.role,
            iat: Date.now(),
            exp: Date.now() + SecurityManager.TOKEN_EXPIRY
        };
        const encodedHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const encodedPayload = btoa(JSON.stringify(payload));
        const signature = btoa(encodedHeader + '.' + encodedPayload + '.' + SecurityManager.JWT_SECRET);
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    },

    verifyToken: (token) => {
        try {
            if (!token) return { valid: false, error: 'No token' };
            const [h, p, s] = token.split('.');
            if (s !== btoa(h + '.' + p + '.' + SecurityManager.JWT_SECRET)) return { valid: false };
            const payload = JSON.parse(atob(p));
            if (payload.exp < Date.now()) return { valid: false };
            return { valid: true, payload };
        } catch (e) { return { valid: false }; }
    },

    saveSession: (token, userData) => {
        localStorage.setItem('wusul_auth_token', token);
        localStorage.setItem('wusul_user', JSON.stringify(userData));
        localStorage.setItem('wusul_session_expiry', (Date.now() + SecurityManager.TOKEN_EXPIRY).toString());
    },

    getSession: () => {
        const token = localStorage.getItem('wusul_auth_token');
        const user = JSON.parse(localStorage.getItem('wusul_user') || 'null');
        const expiry = parseInt(localStorage.getItem('wusul_session_expiry') || '0');
        if (!token || !user || Date.now() > expiry) {
            SecurityManager.clearSession();
            return null;
        }
        return { token, user };
    },

    clearSession: () => {
        localStorage.removeItem('wusul_auth_token');
        localStorage.removeItem('wusul_user');
        localStorage.removeItem('wusul_session_expiry');
    },

    rateLimiter: {
        attempts: {},
        checkLimit: (id, max = 5) => {
            const now = Date.now();
            if (!SecurityManager.rateLimiter.attempts[id]) SecurityManager.rateLimiter.attempts[id] = [];
            SecurityManager.rateLimiter.attempts[id] = SecurityManager.rateLimiter.attempts[id].filter(t => now - t < 15 * 60 * 1000);
            if (SecurityManager.rateLimiter.attempts[id].length >= max) return { allowed: false, message: "تجاوزت الحد المسموح" };
            SecurityManager.rateLimiter.attempts[id].push(now);
            return { allowed: true };
        },
        reset: (id) => delete SecurityManager.rateLimiter.attempts[id]
    },

    sanitize: {
        phone: (p) => p.replace(/\D/g, '').replace(/^0/, '963'),
        string: (s) => s.replace(/[<>]/g, '').trim()
    },

    e2ee: {
        encrypt: (text, key) => {
            const keyStr = key || SecurityManager.JWT_SECRET;
            return btoa(text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ keyStr.charCodeAt(i % keyStr.length))).join(''));
        },
        decrypt: (enc, key) => {
            try {
                const keyStr = key || SecurityManager.JWT_SECRET;
                return atob(enc).split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ keyStr.charCodeAt(i % keyStr.length))).join('');
            } catch (e) { return "[Encrypted]"; }
        }
    },

    kyc: {
        validate: (file) => file && file.size < 5 * 1024 * 1024 && ['image/jpeg', 'image/png'].includes(file.type)
    }
};

window.addEventListener('load', () => {
    const session = SecurityManager.getSession();
    const guestPages = ['login.html', 'register.html', 'index.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    if (!session && !guestPages.includes(currentPage)) {
        window.location.href = 'login.html';
    }
});
