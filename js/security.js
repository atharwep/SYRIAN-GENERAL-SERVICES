// ===================================
// Advanced Security System
// JWT Authentication + Password Hashing
// ===================================

const SecurityManager = {
    // JWT Secret (يجب تغييره في الإنتاج)
    JWT_SECRET: 'MUAMALATI_SUPER_SECRET_KEY_2026_CHANGE_THIS_IN_PRODUCTION',

    // Token expiry (7 days)
    TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000,

    // ===================================
    // Password Hashing (bcrypt simulation)
    // ===================================
    hashPassword: async (password) => {
        try {
            // استخدام Web Crypto API للتشفير
            const encoder = new TextEncoder();
            const data = encoder.encode(password + SecurityManager.JWT_SECRET);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error("Password hashing error:", error);
            // Fallback to simple hash if crypto API fails
            return btoa(password + SecurityManager.JWT_SECRET);
        }
    },

    verifyPassword: async (password, hashedPassword) => {
        const hash = await SecurityManager.hashPassword(password);
        return hash === hashedPassword;
    },

    // ===================================
    // JWT Token Generation & Validation
    // ===================================
    generateToken: (userData) => {
        const header = {
            alg: 'HS256',
            typ: 'JWT'
        };

        const payload = {
            userId: userData.id,
            phone: userData.phone,
            role: userData.role,
            iat: Date.now(),
            exp: Date.now() + SecurityManager.TOKEN_EXPIRY
        };

        // Simple JWT encoding (للإنتاج استخدم مكتبة jsonwebtoken)
        const encodedHeader = btoa(JSON.stringify(header));
        const encodedPayload = btoa(JSON.stringify(payload));

        // Create signature
        const signature = btoa(encodedHeader + '.' + encodedPayload + '.' + SecurityManager.JWT_SECRET);

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    },

    verifyToken: (token) => {
        try {
            if (!token) return { valid: false, error: 'No token provided' };

            const parts = token.split('.');
            if (parts.length !== 3) return { valid: false, error: 'Invalid token format' };

            const [encodedHeader, encodedPayload, signature] = parts;

            // Verify signature
            const expectedSignature = btoa(encodedHeader + '.' + encodedPayload + '.' + SecurityManager.JWT_SECRET);
            if (signature !== expectedSignature) {
                return { valid: false, error: 'Invalid signature' };
            }

            // Decode payload
            const payload = JSON.parse(atob(encodedPayload));

            // Check expiry
            if (payload.exp < Date.now()) {
                return { valid: false, error: 'Token expired' };
            }

            return { valid: true, payload };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    },

    // ===================================
    // Session Management
    // ===================================
    saveSession: (token, userData) => {
        localStorage.setItem('wusul_auth_token', token);
        localStorage.setItem('wusul_user', JSON.stringify(userData));

        // Set session expiry
        const expiryTime = Date.now() + SecurityManager.TOKEN_EXPIRY;
        localStorage.setItem('wusul_session_expiry', expiryTime.toString());
    },

    getSession: () => {
        const token = localStorage.getItem('wusul_auth_token');
        const expiryTime = parseInt(localStorage.getItem('wusul_session_expiry') || '0');

        // Check if session expired
        if (Date.now() > expiryTime) {
            SecurityManager.clearSession();
            return null;
        }

        const verification = SecurityManager.verifyToken(token);
        if (!verification.valid) {
            SecurityManager.clearSession();
            return null;
        }

        const userData = JSON.parse(localStorage.getItem('wusul_user') || 'null');
        return { token, user: userData };
    },

    clearSession: () => {
        localStorage.removeItem('wusul_auth_token');
        localStorage.removeItem('wusul_user');
        localStorage.removeItem('wusul_session_expiry');
    },

    // ===================================
    // Rate Limiting (منع الهجمات)
    // ===================================
    rateLimiter: {
        attempts: {},

        checkLimit: (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
            const now = Date.now();
            const key = `ratelimit_${identifier}`;

            if (!SecurityManager.rateLimiter.attempts[key]) {
                SecurityManager.rateLimiter.attempts[key] = [];
            }

            // Remove old attempts outside the window
            SecurityManager.rateLimiter.attempts[key] =
                SecurityManager.rateLimiter.attempts[key].filter(time => now - time < windowMs);

            // Check if limit exceeded
            if (SecurityManager.rateLimiter.attempts[key].length >= maxAttempts) {
                const oldestAttempt = SecurityManager.rateLimiter.attempts[key][0];
                const remainingTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
                return {
                    allowed: false,
                    remainingTime,
                    message: `تم تجاوز الحد المسموح. يرجى الانتظار ${remainingTime} ثانية.`
                };
            }

            // Add current attempt
            SecurityManager.rateLimiter.attempts[key].push(now);
            return { allowed: true };
        },

        reset: (identifier) => {
            delete SecurityManager.rateLimiter.attempts[`ratelimit_${identifier}`];
        }
    },

    // ===================================
    // Input Sanitization
    // ===================================
    sanitize: {
        phone: (phone) => {
            // Remove all non-digits
            const cleaned = phone.replace(/\D/g, '');
            // Ensure Syrian format
            if (cleaned.startsWith('963')) return cleaned;
            if (cleaned.startsWith('0')) return '963' + cleaned.substring(1);
            return '963' + cleaned;
        },

        string: (str) => {
            // Remove HTML tags and dangerous characters
            return str
                .replace(/[<>]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .trim();
        },

        number: (num) => {
            const parsed = parseFloat(num);
            return isNaN(parsed) ? 0 : parsed;
        }
    },

    // ===================================
    // XSS Protection
    // ===================================
    escapeHtml: (text) => {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // ===================================
    // CSRF Token Generation
    // ===================================
    generateCSRFToken: () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // ===================================
    // Secure Random String Generator
    // ===================================
    generateSecureRandom: (length = 32) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => chars[byte % chars.length]).join('');
    }
};

// ===================================
// Auto-check session on page load
// ===================================
window.addEventListener('load', () => {
    const session = SecurityManager.getSession();
    if (!session && !window.location.pathname.includes('login.html')) {
        // Session expired or invalid
        console.warn("⚠️ Session expired or invalid");
        // Uncomment to force redirect:
        // window.location.href = 'login.html';
    }
});

// ===================================
// Export for use in other files
// ===================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
}
