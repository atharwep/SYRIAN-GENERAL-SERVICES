const UIManager = {
    currentLang: localStorage.getItem('app_lang') || 'ar',
    currentTheme: localStorage.getItem('app_theme') || 'dark',

    init: () => {
        UIManager.applyTheme(UIManager.currentTheme);
        UIManager.applyLanguage(UIManager.currentLang);
        UIManager.initChatUI();
    },

    // ===================================
    // Language System (Moamalaty)
    // ===================================
    translations: {
        ar: {
            dashboard: "لوحة التحكم",
            doctors: "الأطباء",
            taxi: "التكاسي",
            wallet: "المحفظة",
            emergency: "الطوارئ",
            welcome: "مرحباً",
            role_user: "مستخدم ملكي",
            role_doctor: "طبيب متخصص",
            role_driver: "سائق ذكي",
            role_admin: "إدارة النظام"
        },
        en: {
            dashboard: "Dashboard",
            doctors: "Doctors",
            taxi: "Taxi / Transport",
            wallet: "Wallet",
            emergency: "Emergency",
            welcome: "Welcome",
            role_user: "Royal User",
            role_doctor: "Specialist Doctor",
            role_driver: "Smart Driver",
            role_admin: "System Admin"
        }
    },

    toggleLanguage: () => {
        UIManager.currentLang = UIManager.currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('app_lang', UIManager.currentLang);
        location.reload();
    },

    applyLanguage: (lang) => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        // Basic auto-translation for elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (UIManager.translations[lang][key]) {
                el.innerText = UIManager.translations[lang][key];
            }
        });
    },

    // ===================================
    // Theme System (Royal Core)
    // ===================================
    toggleTheme: () => {
        UIManager.currentTheme = UIManager.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('app_theme', UIManager.currentTheme);
        UIManager.applyTheme(UIManager.currentTheme);
    },

    applyTheme: (theme) => {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            // Update root variables for light mode
            document.documentElement.style.setProperty('--bg-dark', '#F1F5F9');
            document.documentElement.style.setProperty('--text-white', '#1E293B');
            document.documentElement.style.setProperty('--card-bg', 'rgba(255,255,255,0.8)');
        } else {
            document.body.classList.remove('light-mode');
            document.documentElement.style.setProperty('--bg-dark', '#0A0E17');
            document.documentElement.style.setProperty('--text-white', '#F8F9FA');
            document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.03)');
        }
    },

    // ===================================
    // Real-time Chat Floating UI
    // ===================================
    initChatUI: () => {
        const chatBtn = document.createElement('div');
        chatBtn.id = 'floating-chat-btn';
        chatBtn.innerHTML = '💬';
        chatBtn.style = `
            position: fixed; bottom: 30px; right: 30px; 
            width: 65px; height: 65px; background: var(--royal-gradient);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 28px; cursor: pointer; z-index: 1000;
            box-shadow: 0 10px 30px rgba(197, 160, 33, 0.4);
            animation: bounce 2s infinite;
        `;
        document.body.appendChild(chatBtn);

        chatBtn.onclick = () => UIManager.toggleChatWindow();
    },

    toggleChatWindow: (targetPhone = 'admin') => {
        let win = document.getElementById('chat-window');
        if (win) {
            win.style.display = win.style.display === 'none' ? 'flex' : 'none';
        } else {
            win = document.createElement('div');
            win.id = 'chat-window';
            win.innerHTML = `
                <div style="background: var(--navy-gradient); padding: 18px; border-bottom: 2px solid var(--gold); border-radius: 25px 25px 0 0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                    <span style="font-weight: 950; color: var(--gold); font-size: 0.95rem;">🔱 المحادثة الفورية - معاملاتي</span>
                    <button onclick="document.getElementById('chat-window').style.display='none'" style="background: rgba(255,255,255,0.05); border: none; color: white; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">&times;</button>
                </div>
                <div id="chat-messages" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; background: rgba(0,0,0,0.2); scroll-behavior: smooth;">
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 12px; margin-bottom: 10px;">رسائلكم مشفرة بالكامل (E2EE) 🔒</div>
                </div>
                <div style="padding: 20px; background: rgba(15, 23, 42, 0.95); display: flex; gap: 12px; border-top: 1px solid rgba(255,255,255,0.05); border-radius: 0 0 25px 25px;">
                    <input type="text" id="chat-input" class="form-input" style="flex: 1; padding: 14px 20px; background: rgba(255,255,255,0.05); border-radius: 15px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.9rem;" placeholder="اكتب رسالتك...">
                    <button id="send-chat" class="btn btn-primary" style="padding: 10px 25px; border-radius: 15px; font-weight: 950; font-size: 0.85rem; box-shadow: 0 10px 20px rgba(197, 160, 33, 0.2);">إرسال</button>
                </div>
            `;
            win.style = `
                position: fixed; bottom: 100px; right: 30px; 
                width: 350px; height: 450px; background: var(--bg-dark);
                border: 1px solid var(--gold); border-radius: 20px;
                display: flex; flex-direction: column; z-index: 1001;
                box-shadow: var(--card-shadow); animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(win);

            document.getElementById('send-chat').onclick = async () => {
                const inp = document.getElementById('chat-input');
                const text = inp.value.trim();
                if (text) {
                    await ChatManager.sendMessage(targetPhone, text);
                    inp.value = '';
                }
            };

            // Start Listening
            ChatManager.listen(targetPhone, (msg) => {
                const box = document.getElementById('chat-messages');
                const isMe = msg.sender === Store.user.phone;
                box.innerHTML += `
                    <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}; color: ${isMe ? 'black' : 'white'}; padding: 10px 15px; border-radius: 15px; font-weight: 700; max-width: 80%; font-size: 0.9rem;">
                        ${msg.text}
                    </div>
                `;
                box.scrollTop = box.scrollHeight;
            });
        }
    }
};

window.addEventListener('load', UIManager.init);
