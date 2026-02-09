// Premium Core Store with Real Firebase SMS Integration
const Store = {
    user: JSON.parse(localStorage.getItem('wusul_user')) || null,

    getUsers: () => JSON.parse(localStorage.getItem('wusul_users_db')) || [],
    setUsers: (users) => localStorage.setItem('wusul_users_db', JSON.stringify(users)),

    getData: (key) => JSON.parse(localStorage.getItem(`wusul_db_${key}`)) || [],
    setData: (key, data) => localStorage.setItem(`wusul_db_${key}`, JSON.stringify(data)),

    init: () => {
        // --- EMERGENCY WIPE & FRESH START ---
        // If we want to start from absolute zero, we use a new version key
        const DB_VERSION = "wusul_db_v2_fresh";
        if (localStorage.getItem('wusul_db_init') !== DB_VERSION) {
            console.log("Starting fresh database...");

            // 1. Clear everything except critical settings if any
            localStorage.clear();

            // 2. Setup Master Admin (The only user allowed at start)
            const seedUsers = [
                { id: 1, name: "إدارة النظام الملكية", phone: "0936020439", password: "19881988", role: "ADMIN", balanceUSD: 10000, balanceSYP: 50000000, avatar: "assets/nuser.png" }
            ];
            Store.setUsers(seedUsers);

            // 3. Initialize empty structures
            Store.setData('doctors', []);
            Store.setData('taxi_drivers', []);
            Store.setData('taxi_orders', []);
            Store.setData('hospitals', []);
            Store.setData('pharmacies', []);
            Store.setData('transactions', []);
            Store.setData('notifications', []);
            Store.setData('bookings', []);

            // 4. Set the init flag
            localStorage.setItem('wusul_db_init', DB_VERSION);

            // 5. Force session logout for current user (they must log in as admin)
            localStorage.removeItem('wusul_user');
            Store.user = null;

            console.log("System initialized successfully. Only Admin account exists.");
            // Optional: Reload to apply changes immediately
            // window.location.reload();
        }

        // --- Force Admin Refresh (Safety Check) ---
        let allUsers = Store.getUsers();
        let masterAdmin = allUsers.find(u => u.phone === "0936020439");
        if (masterAdmin) {
            masterAdmin.password = "19881988";
            masterAdmin.role = "ADMIN";
            masterAdmin.name = "إدارة النظام الملكية";
            Store.setUsers(allUsers);
        } else {
            allUsers.push({ id: 1, name: "إدارة النظام الملكية", phone: "0936020439", password: "19881988", role: "ADMIN", balanceUSD: 10000, balanceSYP: 50000000, avatar: "assets/nuser.png" });
            Store.setUsers(allUsers);
        }

        // --- Migration: Avatar Fix ---
        const users = Store.getUsers();
        users.forEach(u => {
            if (!u.avatar || u.avatar.includes('dicebear.com') || u.avatar.includes('ui-avatars.com')) {
                u.avatar = "assets/nuser.png";
            }
        });
        Store.setUsers(users);
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
        if (users[userIndex].balanceUSD === undefined) users[userIndex].balanceUSD = 0;
        if (users[userIndex].balanceSYP === undefined) users[userIndex].balanceSYP = 0;

        if (currency === 'USD') {
            users[userIndex].balanceUSD += amount;
        } else {
            users[userIndex].balanceSYP += amount;
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

        return { success: true, newBalance: currency === 'USD' ? users[userIndex].balanceUSD : users[userIndex].balanceSYP };
    },

    activateAgent: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        users[idx].role = 'AGENT';
        Store.setUsers(users);
        return { success: true, message: "تم تفعيل حساب الوكيل بنجاح" };
    },

    approveDoctor: async (phoneOrId) => {
        const users = Store.getUsers();
        const uIdx = users.findIndex(u => u.phone == phoneOrId || u.id == phoneOrId);
        if (uIdx === -1) return { success: false, message: "المستخدم غير موجود" };

        const userId = users[uIdx].id;
        const userPhone = users[uIdx].phone;

        // Find doctor record
        let doctors = Store.getData('doctors') || [];
        const dIdx = doctors.findIndex(d => d.id == userId || d.phone == userPhone || d.id == phoneOrId || d.phone == phoneOrId);

        if (dIdx !== -1) {
            try {
                // Call API (Optional fallback)
                await fetch(`${CONFIG.API_BASE_URL}/api/doctors/${doctors[dIdx].id}/verify`, { method: 'PUT' });
            } catch (e) { console.error("API Error in Verify:", e); }

            // Update Local
            users[uIdx].role = 'DOCTOR';
            Store.setUsers(users);

            doctors[dIdx].isVerified = true;
            Store.setData('doctors', doctors);
            return { success: true, message: "تم اعتماد الطبيب وتوثيق حسابه بنجاح ✅" };
        }

        return { success: false, message: "لم يتم العثور على سجل بيانات الطبيب الملحق بهذا الرقم" };
    },

    resetToUser: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        users[idx].role = 'USER';
        Store.setUsers(users);

        // Also unverify if they were a doctor
        let doctors = Store.getData('doctors') || [];
        const dIdx = doctors.findIndex(d => d.phone === phone);
        if (dIdx !== -1) {
            doctors[dIdx].isVerified = false;
            Store.setData('doctors', doctors);
        }

        return { success: true, message: "تم إنهاء الخدمة وإعادة الحساب لوضع مستخدم عادي ✅" };
    },

    makeAdmin: (phone) => {
        const users = Store.getUsers();
        const idx = users.findIndex(u => u.phone === phone);
        if (idx === -1) return { success: false, message: "المستخدم غير موجود" };

        users[idx].role = 'ADMIN';
        Store.setUsers(users);
        return { success: true, message: " تمت ترقية المستخدم لمدير عام بنجاح 👑" };
    },

    deleteDoctor: async (phoneOrId) => {
        const users = Store.getUsers();
        const uIdx = users.findIndex(u => u.phone == phoneOrId || u.id == phoneOrId);

        let doctors = Store.getData('doctors') || [];
        const dIdx = doctors.findIndex(d => d.id == phoneOrId || d.phone == phoneOrId || (uIdx !== -1 && d.id === users[uIdx].id));

        if (dIdx !== -1) {
            const docId = doctors[dIdx].id;
            try {
                await fetch(`${CONFIG.API_BASE_URL}/api/doctors/${docId}`, { method: 'DELETE' });
            } catch (e) { console.error("API Error in Delete:", e); }

            doctors.splice(dIdx, 1);
            Store.setData('doctors', doctors);
        }

        // Demote Role locally if user exists
        if (uIdx !== -1) {
            users[uIdx].role = 'USER';
            Store.setUsers(users);
        }

        return { success: true, message: "تم رفض الطلب وإزالة سجل البيانات بنجاح" };
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
    },

    addDoctor: (name, phone, password, spec, price, city) => {
        const users = Store.getUsers();
        if (users.find(u => u.phone === phone)) {
            return { success: false, message: "رقم الهاتف مستخدم مسبقاً" };
        }

        const newUser = {
            id: Date.now(),
            name,
            phone,
            password,
            role: 'DOCTOR',
            balance: 0,
            avatar: "assets/nuser.png"
        };

        users.push(newUser);
        Store.setUsers(users);

        let doctors = Store.getData('doctors') || [];
        doctors.push({
            id: newUser.id,
            name: "د. " + name,
            specialty: spec || "عام",
            city: city || "غير محدد",
            cost: 0,
            displayPrice: price || "غير محدد",
            avatar: newUser.avatar,
            services: []
        });
        Store.setData('doctors', doctors);

        return { success: true, message: "تم إضافة الطبيب الجديد بنجاح" };
    },

    searchUsers: (query) => {
        if (!query) return [];
        const q = query.toLowerCase().trim();
        return Store.getUsers().filter(u =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.phone && u.phone.includes(q))
        );
    },

    syncDoctors: async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/doctors`);
            if (response.ok) {
                const doctors = await response.json();
                // Merge/Overwrite with server data
                // We need to map server data format to frontend format if they differ
                // Server: {id, userId, name, specialty, fee, clinic, sessionDuration, isVerified, city}
                const mappedDocs = doctors.map(d => ({
                    id: d.id || d.userId, // Use available ID
                    name: d.name,
                    specialty: d.specialty,
                    city: d.city || 'غير محدد',
                    clinic: d.clinic,
                    cost: d.fee,
                    displayPrice: d.fee + " نقطة", // Format
                    isVerified: d.isVerified,
                    // Avatar might not be in DB, check if we need to preserve local or generate
                    avatar: d.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.name}`,
                    services: []
                }));

                Store.setData('doctors', mappedDocs);
                console.log("✅ Doctors synced with server");
                return mappedDocs;
            }
        } catch (e) {
            console.warn("⚠️ Could not sync doctors with server, using local cache.", e);
        }
        return Store.getData('doctors');
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
        // --- Security Enhancement: Input Sanitization ---
        const cleanPhone = phone.replace(/[<>]/g, "").trim();
        const cleanPass = password.replace(/[<>]/g, "").trim();

        // --- Security Enhancement: Rate Limiting Simulation ---
        let attempts = parseInt(localStorage.getItem('auth_attempts') || '0');
        let blockTime = parseInt(localStorage.getItem('auth_block_until') || '0');

        if (Date.now() < blockTime) {
            const remaining = Math.ceil((blockTime - Date.now()) / 1000);
            return { success: false, message: `محاولات كثيرة خاطئة. يرجى الانتظار ${remaining} ثانية.` };
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone, password: cleanPass })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('auth_attempts', '0'); // Reset on success
                return { success: true, user: data.user, token: data.token };
            } else {
                return { success: false, message: data.message || "بيانات الدخول غير صحيحة" };
            }
        } catch (error) {
            console.error("API Login Error, falling back to local:", error);
            const user = Store.getUsers().find(u => u.phone === cleanPhone && u.password === cleanPass);
            if (user) {
                localStorage.setItem('auth_attempts', '0');
                return { success: true, user };
            }

            // --- Security Step: Increment attempts ---
            attempts++;
            localStorage.setItem('auth_attempts', attempts.toString());
            if (attempts >= 5) {
                const nextBlock = Date.now() + (60 * 1000); // 1 minute block
                localStorage.setItem('auth_block_until', nextBlock.toString());
                return { success: false, message: "تم قفل الدخول مؤقتاً بسبب 5 محاولات خاطئة. انتظر دقيقة." };
            }

            return { success: false, message: "بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مجدداً" };
        }
    },

    register: async (name, phone, password, role = 'USER', extraData = {}) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password, role, ...extraData })
            });
            const data = await response.json();
            if (response.ok) {
                // Save to local DB as well for consistency in hybrid mode
                const users = Store.getUsers();
                if (!users.find(u => u.phone === phone)) {
                    users.push({ ...data.user, password }); // Password stored locally for demo
                    Store.setUsers(users);
                }

                // If Doctor, add to local doctors DB as well if not present (Hybrid sync)
                if (role === 'DOCTOR') {
                    let doctors = Store.getData('doctors') || [];
                    if (!doctors.find(d => d.id === data.user.id)) {
                        doctors.push({
                            id: data.user.id,
                            name: "د. " + name,
                            phone: phone,
                            specialty: extraData.specialty || "عام",
                            city: extraData.city || "غير محدد",
                            clinic: extraData.clinic || "",
                            cost: extraData.price ? parseInt(extraData.price) : 0,
                            displayPrice: extraData.price ? extraData.price + " نقطة" : "غير محدد",
                            avatar: data.user.avatar || "assets/nuser.png",
                            isVerified: false,
                            services: [],
                            certificate: extraData.certificate,
                            identityId: extraData.identityId
                        });
                        Store.setData('doctors', doctors);
                    }
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
                avatar: "assets/nuser.png"
            };
            users.push(newUser);
            Store.setUsers(users);

            // Handler for Local Doctor Registration
            if (role === 'DOCTOR') {
                let doctors = Store.getData('doctors') || [];
                doctors.push({
                    id: newUser.id,
                    name: "د. " + name,
                    phone: phone,
                    specialty: extraData.specialty || "عام",
                    city: extraData.city || "غير محدد",
                    clinic: extraData.clinic || "",
                    cost: extraData.price ? parseInt(extraData.price) : 0,
                    displayPrice: extraData.price ? extraData.price + " نقطة" : "غير محدد",
                    avatar: newUser.avatar,
                    isVerified: false, // Requires Admin Approval
                    services: [],
                    certificate: extraData.certificate, // Store data for Admin Panel
                    identityId: extraData.identityId
                });
                Store.setData('doctors', doctors);
            }

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
                    SMS.send(phone, `رمز الأمان الخاص بك هو: ${opt}`);
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
        // Ensure balance fields are mapped if they datang with different names from backend
        // Backend returns balanceSYP and balanceUSD. Store expects these too now.
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
        const path = window.location.pathname;
        const page = path.split("/").pop(); // e.g., 'login.html'

        // Define Guest Pages (Pages that don't require login)
        const guestPages = ['index.html', 'login.html', 'register.html', ''];

        if (!Store.user) {
            // User is NOT logged in
            if (!guestPages.includes(page)) {
                // Determine if we are on a known page or just a random sub-path
                // Simple logic: if restricted page, go to login
                window.location.href = 'login.html';
            }
        } else {
            // User IS logged in
            // Redirect away from login/register pages to dashboard
            if (page === 'login.html' || page === 'register.html') {
                window.location.href = 'dashboard.html';
            }
        }
    },

    findUserByPhone: async (phone) => {
        const p = (phone || "").trim();
        try {
            const res = await fetch(`${CONFIG.API_BASE_URL}/api/wallet/find-user/${p}`);
            if (res.ok) return await res.json();
        } catch (e) {
            console.error("API Lookup error, switching to local store:", e);
        }

        // Final fallback: Search in local records
        const localUsers = Store.getUsers();
        return localUsers.find(u => u.phone === p) || null;
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
        const navMenu = document.getElementById('nav-menu');

        // Desktop menu handling
        if (navMenu && window.innerWidth < 1024) {
            navMenu.style.display = 'none';
        } else if (navMenu) {
            navMenu.style.display = 'flex';
        }

        if (!navRight) return;

        // Ensure Sidebar exists
        UI.initSidebar();

        if (Store.user) {
            navRight.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <a href="profile.html" class="user-info-nav" style="display: flex; align-items: center; gap: 10px; text-decoration: none;">
                        <div style="text-align: left;">
                            <p style="font-size: 10px; font-weight: 800; color: #64748B; margin:0;">👋 مرحباً، ${Store.user.name.split(' ')[0]}</p>
                            <p style="font-size: 11px; font-weight: 900; color: #10b981; margin:0;">
                                $${(Store.user.balanceUSD || 0).toLocaleString()}
                            </p>
                        </div>
                        <img src="${Store.user.avatar || 'assets/nuser.png'}" 
                             style="width: 38px; height: 38px; border-radius: 12px; border: 2px solid var(--gold); background: #FFF;">
                    </a>
                    <div onclick="UI.toggleSidebar()" style="width: 42px; height: 42px; background: #000; color: var(--gold); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(197, 160, 33, 0.3);">
                        <i class="fas fa-bars"></i>
                    </div>
                </div>
            `;
        } else {
            navRight.innerHTML = `<a href="login.html" class="btn btn-primary" style="padding: 8px 15px; font-size: 12px;">دخول</a>`;
        }

        // PWA Install Check
        UI.checkPWAInstall();
    },

    deferredPrompt: null,
    checkPWAInstall: () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) return;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            UI.deferredPrompt = e;

            // Show promotion if not shown in this session
            if (!sessionStorage.getItem('pwa_notify_shown')) {
                setTimeout(() => {
                    if (typeof Notify !== 'undefined') {
                        Notify.show(
                            "تثبيت التطبيق 📱",
                            `قم بتثبيت بوابة وصول على شاشتك الرئيسية للوصول السريع والآمن. <br><br> <button onclick="UI.installPWA()" class="btn btn-primary" style="width:100%; padding:8px; font-size:11px;">تثبيت الآن ✨</button>`,
                            "fas fa-mobile-screen"
                        );
                        sessionStorage.setItem('pwa_notify_shown', 'true');
                    }
                }, 3000);
            }
        });
    },

    installPWA: async () => {
        if (!UI.deferredPrompt) return;
        UI.deferredPrompt.prompt();
        const { outcome } = await UI.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        UI.deferredPrompt = null;
    },

    toggleSidebar: () => {
        const sidebar = document.getElementById('royal-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    },

    initSidebar: () => {
        if (document.getElementById('royal-sidebar')) return;

        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        overlay.onclick = UI.toggleSidebar;
        document.body.appendChild(overlay);

        const sidebar = document.createElement('div');
        sidebar.id = 'royal-sidebar';
        sidebar.className = 'royal-sidebar';

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isAdmin = Store.user && Store.user.role === 'ADMIN';

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="logo-box">
                    <img src="assets/logo.png" alt="معاملاتي">
                </div>
                <div>
                    <h3 style="color: white; font-weight: 900; margin: 0;">معاملاتي</h3>
                    <p style="color: var(--gold); font-size: 0.7rem; font-weight: 800; margin: 0;">الخدمات الملكية</p>
                </div>
                <i class="fas fa-times" onclick="UI.toggleSidebar()" style="margin-right: auto; cursor: pointer; color: #444;"></i>
            </div>

                <a href="dashboard.html" class="sidebar-link ${currentPage === 'dashboard.html' ? 'active' : ''}">
                    <i class="fas fa-th-large"></i> لوحة التحكم
                </a>
                <a href="emergency.html" class="sidebar-link" style="color: #ef4444; font-weight: 800;">
                    <i class="fas fa-bolt"></i> وضع الطوارئ
                </a>
                <a href="map.html" class="sidebar-link ${currentPage === 'map.html' ? 'active' : ''}">
                    <i class="fas fa-map-marked-alt"></i> الخريطة الصحية
                </a>
                <a href="family.html" class="sidebar-link ${currentPage === 'family.html' ? 'active' : ''}">
                    <i class="fas fa-users"></i> حساب العائلة
                </a>
                <a href="doctors.html" class="sidebar-link ${currentPage === 'doctors.html' ? 'active' : ''}">
                    <i class="fas fa-user-md"></i> الأطباء
                </a>
                <a href="taxi.html" class="sidebar-link ${currentPage === 'taxi.html' ? 'active' : ''}">
                    <i class="fas fa-taxi"></i> النقل والسفر
                </a>
                <a href="wallet.html" class="sidebar-link ${currentPage === 'wallet.html' ? 'active' : ''}">
                    <i class="fas fa-wallet"></i> المحفظة الملكية
                </a>
                <a href="profile.html" class="sidebar-link ${currentPage === 'profile.html' ? 'active' : ''}">
                    <i class="fas fa-user-circle"></i> الملف الشخصي
                </a>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 10px 0;">
                
                ${isAdmin ? `
                <a href="admin.html" class="sidebar-link ${currentPage === 'admin.html' ? 'active' : ''}" style="background: rgba(197, 160, 33, 0.1); color: var(--gold);">
                    <i class="fas fa-crown"></i> الإدارة المركزية
                </a>
                <a href="reports.html" class="sidebar-link ${currentPage === 'reports.html' ? 'active' : ''}">
                    <i class="fas fa-chart-line"></i> تقارير المحفظة
                </a>
                ` : (Store.user && Store.user.role === 'TAXI_DRIVER' ? `
                <a href="taxi-driver.html" class="sidebar-link ${currentPage === 'taxi-driver.html' ? 'active' : ''}">
                    <i class="fas fa-taxi"></i> لوحة الكابتن
                </a>
                ` : `
                <a href="apply.html" class="sidebar-link ${currentPage === 'apply.html' ? 'active' : ''}">
                    <i class="fas fa-stethoscope"></i> انضم كطبيب
                </a>
                `)}
                
                <a href="#" onclick="Auth.logout()" class="sidebar-link" style="color: #ef4444; margin-top: 20px;">
                    <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
                </a>
            </div>

            <div style="margin-top: auto; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 20px; text-align: center;">
                <p style="color: #444; font-size: 0.7rem; font-weight: 700;">نسخة النظام v2.4.0</p>
                <p style="color: #666; font-size: 0.6rem;">جميع الحقوق محفوظة 2026</p>
            </div>
        `;
        document.body.appendChild(sidebar);
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
    // Attempt background sync
    Store.syncDoctors().then(docs => {
        // If we are on the doctors page, we might want to refresh the grid
        if (typeof renderDoctors === 'function' && docs) {
            const verified = docs.filter(d => d.isVerified === true);
            // We check global variable or just rely on the user to refresh? 
            // Let's call renderDoctors directly if it exists in scope (doctors.html)
            renderDoctors(verified);
        }
        // If dashboard pending list
        if (typeof renderPendingDoctors === 'function' && docs) {
            renderPendingDoctors();
        }
    });

    Auth.check();
    UI.updateNavbar();
    UI.initResponsive();
});

