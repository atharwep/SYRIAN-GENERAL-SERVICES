// Dashboard Specific Logic
const Dashboard = {
    init: () => {
        if (Store.user.role === 'ADMIN') {
            document.getElementById('admin-section').style.display = 'block';
            Dashboard.renderPendingDoctors();
        }

        Dashboard.renderActivities();
        Dashboard.renderUserInfo();
    },

    renderUserInfo: () => {
        document.getElementById('user-name').innerText = Store.user.name;
        document.getElementById('user-balance').innerText = (Store.user.walletUSD || 0).toLocaleString();
        document.getElementById('user-avatar').src = Store.user.avatar;
        document.getElementById('role-badge').innerText = Store.user.role;

        if (Store.user.role === 'ADMIN' || Store.user.role === 'AGENT') {
            const extra = document.getElementById('extra-links');
            if (extra) extra.innerHTML = `<a href="agents.html" class="side-link">🏢 بوابة الوكلاء</a>`;
        }
    },

    renderActivities: () => {
        const txs = Store.getData('transactions') || [];
        if (txs.length > 0) {
            const list = document.getElementById('activities-list');
            list.innerHTML = '';
            txs.slice(0, 5).forEach(tx => {
                list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #f8fafc; font-size:0.8rem; font-weight:800;">
                    <span>${tx.title}</span>
                    <span style="color:${tx.amount < 0 ? 'red' : 'green'}">${tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount)}</span>
                </div>`;
            });
        }
    },

    renderPendingDoctors: () => {
        const doctors = Store.getData('doctors') || [];
        const pending = doctors.filter(d => !d.isVerified);
        const container = document.getElementById('pending-doctors-section');
        const list = document.getElementById('pending-doctors-list');

        if (pending.length === 0) {
            if (container) container.style.display = 'none';
            return;
        }

        if (container) container.style.display = 'block';

        list.innerHTML = pending.map(d => {
            return `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 15px; border-radius: 15px; margin-bottom: 15px;">
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 10px;">
                    <img src="${d.avatar}" style="width: 50px; height: 50px; border-radius: 15px;">
                    <div>
                        <h4 style="color: white; font-size: 1rem; margin-bottom: 2px;">${d.name}</h4>
                        <p style="color: #94a3b8; font-size: 0.8rem;">${d.specialty} | ${d.city || '?'}</p>
                        <p style="color: #94a3b8; font-size: 0.8rem;">${d.id} (Ref: Phone)</p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="Auth.approveDoctor('${d.id}')" class="btn" style="flex: 1; background: #16a34a; color: white; padding: 8px; font-size: 0.8rem;">قبول وتوثيق ✅</button>
                    <button onclick="Auth.deleteDoctor('${d.id}')" class="btn" style="flex: 1; background: #dc2626; color: white; padding: 8px; font-size: 0.8rem;">رفض ❌</button>
                </div>
            </div>
            `;
        }).join('');
    }
};

// Expose functions globally for HTML onclick events
window.activateAgent = () => {
    const phone = document.getElementById('admin-phone').value;
    if (!phone) return;
    const res = Store.activateAgent(phone);
    showResult(res.message, res.success);
};

window.approveDoctor = () => {
    const phone = document.getElementById('admin-phone').value;
    if (!phone) return;
    const res = Store.approveDoctor(phone);
    showResult(res.message, res.success);
};

window.makeAdmin = () => {
    const phone = document.getElementById('admin-phone').value;
    if (!phone) return;
    if (!confirm("هل أنت متأكد من منح هذا المستخدم صلاحيات الإدارة الكاملة؟")) return;
    const res = Store.makeAdmin(phone);
    showResult(res.message, res.success);
};

window.editDoctor = () => {
    const phone = document.getElementById('manage-doc-phone').value;
    const spec = document.getElementById('edit-doc-spec').value;
    const price = document.getElementById('edit-doc-price').value;
    if (!phone) return;
    const res = Store.editDoctor(phone, spec, price);
    showResult(res.message, res.success);
};

window.deleteDoctor = () => {
    const phone = document.getElementById('manage-doc-phone').value;
    if (!phone) return;
    if (!confirm("حذف الطبيب سيقوم بإلغاء صلاحياته وإزالته من القائمة. هل أنت متأكد؟")) return;
    const res = Store.deleteDoctor(phone);
    showResult(res.message, res.success);
};

window.addNewDoctor = () => {
    const name = document.getElementById('new-doc-name').value;
    const phone = document.getElementById('new-doc-phone').value;
    const pass = document.getElementById('new-doc-pass').value;
    const spec = document.getElementById('new-doc-spec').value;
    const city = document.getElementById('new-doc-city').value;
    const price = document.getElementById('new-doc-price').value;

    if (!name || !phone || !pass || !spec) {
        showResult("يرجى تعبئة الحقول الأساسية (الاسم، الهاتف، كلمة المرور، التخصص)", false);
        return;
    }

    const res = Store.addDoctor(name, phone, pass, spec, price, city);
    showResult(res.message, res.success);

    if (res.success) {
        document.querySelectorAll('#new-doc-name, #new-doc-phone, #new-doc-pass, #new-doc-spec, #new-doc-city, #new-doc-price')
            .forEach(inp => inp.value = '');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
