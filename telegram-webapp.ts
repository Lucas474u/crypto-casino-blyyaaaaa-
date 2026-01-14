// src/utils/telegram-webapp.ts
declare global {
    interface Window {
        Telegram: any;
    }
}

export const initTelegramApp = () => {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Расширяем на весь экран
        tg.expand();
        
        // Устанавливаем тему
        tg.setHeaderColor('#302b63');
        tg.setBackgroundColor('#0f0c29');
        
        // Возвращаем объект Telegram
        return tg;
    }
    return null;
};

export const sendTelegramData = (data: any) => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(data));
    }
};
