/**
 * Doctor Booking System - Queue Logic & Real-time Mocks
 * Developed by Antigravity
 */

// Formatters
const formatPrice = (amount, currency) => {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } else {
        return new Intl.NumberFormat('ar-SY', { style: 'currency', currency: 'SYP', maximumFractionDigits: 0 }).format(amount).replace('SYP', 'ل.س');
    }
};

const formatTime = (date) => new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date);

// --- State Management ---
const state = {
    doctor: null,
    services: [], // Loaded from Doctor Data
    user: {
        id: 0,
        name: "زائر",
        walletUSD: 0,
        walletSYP: 0
    },
    queue: {
        currentServing: 0,
        lastTicket: 0,
        myTicket: null,
        myEstTime: null
    },
    selectedService: null,
    settings: {
        notificationsEnabled: false
    }
};

// Global Elements Cache
let els = {};

// Mock Database
const MOCK_DOCTORS = {
    '1': {
        id: 1,
        name: "د. أحمد عبدالله",
        specialty: "استشاري قلب وأوعية دموية",
        isVerified: true,
        services: [
            { id: 'consult_usd', name: 'كشف عيادة (VIP)', price: 40, currency: 'USD', duration: 20 },
            { id: 'consult_syp', name: 'كشف عيادة (عام)', price: 300000, currency: 'SYP', duration: 20 },
            { id: 'urgent', name: 'حالة طارئة', price: 60, currency: 'USD', duration: 15 }
        ]
    },
    '2': {
        id: 2,
        name: "د. سارة محمد",
        specialty: "أخصائية طب أطفال",
        isVerified: true,
        services: [
            { id: 'kids_check', name: 'فحص أطفال', price: 150000, currency: 'SYP', duration: 15 },
            { id: 'vaccine', name: 'لقاحات ومتابعة', price: 100000, currency: 'SYP', duration: 10 }
        ]
    },
    '3': {
        id: 3,
        name: "د. خالد العمر",
        specialty: "استشاري جلدية",
        isVerified: false,
        services: [
            { id: 'derma_consult', name: 'استشارة جلدية', price: 50, currency: 'USD', duration: 15 },
            { id: 'laser', name: 'جلسة ليزر', price: 100, currency: 'USD', duration: 30 }
        ]
    },
    'default': {
        id: 0,
        name: "د. غير معروف",
        specialty: "عام",
        isVerified: false,
        services: [
            { id: 'gen', name: 'كشف عام', price: 50000, currency: 'SYP', duration: 15 }
        ]
    }
};

// --- Initialization ---
async function init() {
    try {
        console.log("Initializing Booking Page...");

        // 0. Load Real User
        const savedUser = JSON.parse(localStorage.getItem('wusul_user'));
        if (savedUser) {
            state.user = savedUser;
        }

        // Initialize Elements
        els = {
            queueCount: document.getElementById('queue-count'),
            estTime: document.getElementById('est-time'),
            servicesGrid: document.getElementById('services-grid'),
            bookBtn: document.getElementById('book-btn'),
            modal: document.getElementById('confirm-modal'),
            modalContent: document.getElementById('modal-details'),
            confirmPayBtn: document.getElementById('confirm-pay-btn'),
            notification: document.getElementById('notification'),
            notifMessage: document.getElementById('notif-message'),
            notifIcon: document.getElementById('notif-icon'),
            docName: document.getElementById('doc-name'),
            docSpec: document.getElementById('doc-spec'),
            verifiedBadge: document.getElementById('verified-badge')
        };

        // Validate Critical Elements
        if (!els.bookBtn || !els.servicesGrid) {
            console.error("Critical elements missing");
            throw new Error("عنصر التحكم الرئيسي مفقود");
        }

        // --- Attach Event Listeners ---
        els.bookBtn.onclick = () => {
            if (state.queue.myTicket) {
                showNotification("لديك حجز مؤكد بالفعل!", "info");
            } else {
                showPaymentModal();
            }
        };

        if (els.confirmPayBtn) {
            els.confirmPayBtn.onclick = processPayment;
        }

        if (els.modal) {
            els.modal.onclick = (e) => {
                if (e.target === els.modal) closeModal();
            };
        }

        // 1. Load Data
        await loadDoctorData();

        // 2. Render UI
        renderDoctorInfo();
        renderServices();
        updateQueueDisplay();

        // 3. Start Polling/Realtime Simulation
        startQueueSimulation();

        // 4. Request Notification Permission
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                state.settings.notificationsEnabled = permission === 'granted';
            });
        }
    } catch (error) {
        console.error("Initialization Error:", error);
        if (document.getElementById('doc-name')) {
            document.getElementById('doc-name').innerText = "حدث خطأ غير متوقع";
            document.getElementById('doc-spec').innerText = error.message || "يرجى إعادة تحميل الصفحة";
            document.getElementById('doc-spec').style.color = "#ef4444";
        }
    }
}

// --- Logic & Rendering ---

async function loadDoctorData() {
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id') || '1';

    const doctorData = MOCK_DOCTORS[docId] || MOCK_DOCTORS['default'];
    if (!doctorData) throw new Error("بيانات الطبيب غير متوفرة");

    state.doctor = { ...doctorData };
    state.services = doctorData.services || []; // Load specific services

    state.queue.lastTicket = Math.floor(Math.random() * 10) + 5;
    state.queue.currentServing = Math.floor(state.queue.lastTicket / 2);

    return new Promise(resolve => setTimeout(resolve, 300));
}

function renderDoctorInfo() {
    if (els.docName) els.docName.textContent = state.doctor.name;
    if (els.docSpec) els.docSpec.textContent = state.doctor.specialty;

    if (state.doctor.isVerified && els.verifiedBadge) {
        els.verifiedBadge.classList.remove('hidden');
    } else if (els.verifiedBadge) {
        els.verifiedBadge.classList.add('hidden');
    }
}

function renderServices() {
    if (!state.services || state.services.length === 0) return;

    if (els.servicesGrid) {
        els.servicesGrid.innerHTML = state.services.map((svc, index) => `
            <div class="service-card ${index === 0 ? 'active' : ''}" onclick="selectService('${svc.id}')" id="svc-${svc.id}">
                <div class="service-details">
                    <h4>${svc.name}</h4>
                    <div class="service-meta">
                        <span>⏱ ${svc.duration} دقيقة</span>
                    </div>
                </div>
                <div class="service-price">
                    ${formatPrice(svc.price, svc.currency)}
                </div>
            </div>
        `).join('');
    }
    selectService(state.services[0].id);
}

window.selectService = (id) => {
    state.selectedService = state.services.find(s => s.id === id);
    document.querySelectorAll('.service-card').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`svc-${id}`);
    if (target) target.classList.add('active');
    calculateEstTime();
};

function updateQueueDisplay() {
    let peopleAhead = state.queue.lastTicket - state.queue.currentServing;
    if (state.queue.myTicket) {
        peopleAhead = state.queue.myTicket - state.queue.currentServing - 1;
    }
    peopleAhead = Math.max(0, peopleAhead);

    const waitTitle = document.getElementById('queue-title');
    if (state.queue.myTicket) {
        if (waitTitle) waitTitle.textContent = "دورك في الانتظار";
        if (els.queueCount) {
            els.queueCount.textContent = `#${state.queue.myTicket}`;
            els.queueCount.style.color = 'var(--primary-color)';
        }
    } else {
        if (waitTitle) waitTitle.textContent = "المرضى في الانتظار";
        if (els.queueCount) els.queueCount.textContent = peopleAhead + 3;
    }
    calculateEstTime();
}

function calculateEstTime() {
    const now = new Date();
    let peopleAhead = state.queue.lastTicket - state.queue.currentServing;
    if (state.queue.myTicket) {
        peopleAhead = state.queue.myTicket - state.queue.currentServing - 1;
    }

    // Use saved duration per service, or fallback to an avg
    const serviceDuration = state.selectedService ? state.selectedService.duration : 15;
    // We assume the queue moves at avg 20 mins pace regardless of current service selection, 
    // or refine logic to sum up actual queue types. Simple: avg 20.
    const avgDocPace = 20;

    const totalWaitMinutes = peopleAhead * avgDocPace;
    const estTime = new Date(now.getTime() + totalWaitMinutes * 60000);

    if (els.estTime) els.estTime.textContent = formatTime(estTime);
    state.queue.myEstTime = estTime;
}

// --- Modals & Payments ---

function showPaymentModal() {
    const finalPrice = formatPrice(state.selectedService.price, state.selectedService.currency);
    const currentBalance = state.selectedService.currency === 'USD'
        ? (state.user.walletUSD || 0)
        : (state.user.walletSYP || 0);

    const html = `
        <div class="summary-row">
            <span>الخدمة</span>
            <span>${state.selectedService.name}</span>
        </div>
        <div class="summary-row">
            <span>الوقت المقدر</span>
            <span>${formatTime(state.queue.myEstTime)}</span>
        </div>
        <div class="summary-row">
            <span>رصيدك الحالي</span>
            <span style="direction:ltr">${formatPrice(currentBalance, state.selectedService.currency)}</span>
        </div>
        <div class="summary-row total">
            <span>المبلغ المطلوب</span>
            <span style="direction:ltr">${finalPrice}</span>
        </div>
    `;

    if (els.modalContent) els.modalContent.innerHTML = html;
    if (els.modal) els.modal.classList.add('active');
}

async function processPayment() {
    const price = state.selectedService.price;
    const currency = state.selectedService.currency;

    // Check specific wallet
    let currentBalance = currency === 'USD' ? (state.user.walletUSD || 0) : (state.user.walletSYP || 0);

    if (currentBalance < price) {
        showNotification(`عذراً، رصيد محفظة ${currency} غير كافٍ`, "error");
        closeModal();
        return;
    }

    const btn = els.confirmPayBtn;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "جاري الحجز...";
    }

    setTimeout(() => {
        // Deduct logic
        if (currency === 'USD') {
            state.user.walletUSD = (state.user.walletUSD || 0) - price;
        } else {
            state.user.walletSYP = (state.user.walletSYP || 0) - price;
        }

        state.queue.myTicket = state.queue.lastTicket + 1;
        state.queue.lastTicket++;

        // Persist User
        localStorage.setItem('wusul_user', JSON.stringify(state.user));

        // Sync with Auth DB
        const allUsers = JSON.parse(localStorage.getItem('wusul_users_db')) || [];
        const uIdx = allUsers.findIndex(u => u.phone === state.user.phone);
        if (uIdx !== -1) {
            allUsers[uIdx].walletUSD = state.user.walletUSD;
            allUsers[uIdx].walletSYP = state.user.walletSYP;
            localStorage.setItem('wusul_users_db', JSON.stringify(allUsers));
        }

        // Save Transaction
        const txs = JSON.parse(localStorage.getItem('wusul_db_transactions')) || [];
        txs.unshift({
            id: Date.now(),
            userPhone: state.user.phone,
            amount: -price,
            currency: currency,
            title: `حجز خدمة طبية: ${state.selectedService.name}`,
            date: new Date().toLocaleString('ar-SY')
        });
        localStorage.setItem('wusul_db_transactions', JSON.stringify(txs));

        updateQueueDisplay();
        closeModal();

        if (els.bookBtn) {
            els.bookBtn.innerHTML = `<span>✅ تم الحجز - تتبع دورك</span>`;
            els.bookBtn.style.background = "var(--success-color)";
        }

        showNotification("تم تأكيد الحجز وخصم الرصيد بنجاح", "success");

        if (btn) {
            btn.disabled = false;
            btn.textContent = "تأكيد واستمرار";
        }
    }, 1500);
}

window.closeModal = () => {
    if (els.modal) els.modal.classList.remove('active');
};

// --- Notifications & Simulation ---

function startQueueSimulation() {
    setInterval(() => {
        if (Math.random() > 0.7) {
            state.queue.currentServing++;
            updateQueueDisplay();

            if (state.queue.myTicket && state.queue.currentServing === state.queue.myTicket - 1) {
                showNotification("انتبه! دورك هو القادم", "warning");
            }
            if (state.queue.myTicket && state.queue.currentServing === state.queue.myTicket) {
                showNotification("حان دورك الآن! ادخل للعيادة", "success");
            }
        }
    }, 10000);
}

function showNotification(msg, type = 'info') {
    if (!els.notifMessage || !els.notification) return;

    els.notifMessage.textContent = msg;
    const icons = { 'success': '✅', 'error': '❌', 'warning': '🔔', 'info': 'ℹ️' };
    if (els.notifIcon) els.notifIcon.textContent = icons[type];

    els.notification.classList.add('show');
    setTimeout(() => {
        els.notification.classList.remove('show');
    }, 4000);
}

// Initializer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
