const SmartNotifications = {
    init: () => {
        console.log("Smart Notifications System Active...");
        // Simulate background checks
        setInterval(SmartNotifications.checkLocationEvents, 15000); // Every 15s
        setInterval(SmartNotifications.checkTimeEvents, 30000); // Every 30s
    },

    checkLocationEvents: () => {
        // Mocking location change
        const locations = ["المزة", "أبو رمانة", "مشروع دمر"];
        const randomLoc = locations[Math.floor(Math.random() * locations.length)];

        // Use Notify from notifications.js
        if (typeof Notify !== 'undefined') {
            Notify.show(
                "اكتشاف منطقة جديدة",
                `أنت الآن في ${randomLoc}. يوجد مشفى طوارئ وصيدلية مناوبة بالقرب منك.`,
                "fas fa-map-marker-alt"
            );
        }
    },

    checkTimeEvents: () => {
        const events = [
            { title: "صيدلية محفوظة", msg: "صيدلية 'الخير' بدأت مناوبتها الآن في منطقتك.", icon: "fas fa-pills" },
            { title: "تذكير موعد", msg: "موعد د. ليلى أحمد بعد 60 دقيقة.", icon: "fas fa-clock" },
            { title: "تنبيه عائلي", msg: "قام 'أحمد' بتفعيل مشاركة الموقع المؤقتة.", icon: "fas fa-users-viewfinder" }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        if (typeof Notify !== 'undefined') {
            Notify.show(event.title, event.msg, event.icon);
        }
    },

    triggerEmergencyBroadCast: (user) => {
        Notify.show(
            "تنبيه طوارئ عاجل",
            `خطير: ${user} في حالة طارئة بموقع (حي الشعلان). تم إبلاغ الإسعاف وأقرب كابتن تكسي طبي.`,
            "fas fa-exclamation-triangle",
            "danger"
        );
    }
};

// Auto-start if in a page that supports it
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    SmartNotifications.init();
} else {
    document.addEventListener('DOMContentLoaded', SmartNotifications.init);
}
