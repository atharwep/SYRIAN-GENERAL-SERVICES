let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (sessionStorage.getItem('pwa_dismissed')) return;

    // Show the custom premium popup in the center
    showPwaModal();
});

function showPwaModal() {
    // Check if already showing
    if (document.getElementById('pwa-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pwa-overlay';
    overlay.className = 'pwa-overlay';
    overlay.style.display = 'flex';

    overlay.innerHTML = `
        <div class="pwa-modal">
            <div style="font-size: 60px;">📲</div>
            <div style="text-align: center;">
                <h2 style="color: var(--gold); margin: 0; font-weight: 950; font-size: 1.6rem;">تطبيق معاملاتي</h2>
                <p style="color: var(--text-muted); font-size: 1rem; margin: 15px 0 0 0; font-weight: 700; line-height: 1.6;">هل ترغب بتثبيت تطبيق معاملاتي على جهازك للوصول السريع والآمن؟</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                <button id="pwa-install-btn" class="btn btn-primary" style="width: 100%; padding: 18px; font-size: 1.1rem; border-radius: 20px;">تثبيت الآن ✨</button>
                <button id="pwa-close-btn" class="btn btn-outline" style="width: 100%; padding: 15px; font-size: 1rem; border-color: rgba(255,255,255,0.05); color: #94A3B8; border-radius: 20px;">لاحقاً</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            overlay.remove();
        }
    });

    document.getElementById('pwa-close-btn').addEventListener('click', () => {
        overlay.remove();
        sessionStorage.setItem('pwa_dismissed', 'true');
    });
}

window.addEventListener('appinstalled', () => {
    const overlay = document.getElementById('pwa-overlay');
    if (overlay) overlay.remove();
});
