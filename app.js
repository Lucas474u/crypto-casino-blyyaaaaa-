// Конфигурация
const CONFIG = {
    API_URL: 'https://crypto-casino-blyyaaaaa.vercel.app',
    MANIFEST_URL: 'https://crypto-casino-blyyaaaaa.vercel.app/tonconnect-manifest.json',
    CONTRACT_ADDRESS: 'EQ...',
    REFERRAL_COMMISSION: 0.05,
    HOUSE_EDGE: 0.02,
    MIN_BET: 0.1,
    MAX_BET: 1000,
    BONUS_DAILY: 0.1,
    BONUS_REFERRAL: 0.5,
    LANGUAGES: {
        en: {},
        ru: {},
        zh: {},
        es: {},
        tr: {}
    }
};

// Состояние приложения
const state = {
    user: null,
    wallet: null,
    balance: 0,
    gameBalance: 0,
    language: 'en',
    currentPage: 'dashboard',
    games: {
        crash: {
            active: false,
            bet: 0,
            multiplier: 1.0,
            rocketPosition: 0,
            interval: null,
            autoCashout: 2.0
        },
        mines: {
            active: false,
            bet: 0,
            minesCount: 3,
            grid: [],
            openedCells: 0,
            cashoutMultiplier: 1.0
        }
    },
    bonuses: {
        daily: {
            available: true,
            lastClaim: null,
            streak: 0
        },
        referral: {
            totalEarned: 0,
            referrals: []
        }
    },
    transactions: [],
    leaderboard: []
};

// Инициализация TON Connect
let tonConnectUI;
let connector;

async function initTONConnect() {
    try {
        // Упрощенный манифест для быстрой инициализации
        const manifest = {
            url: window.location.href,
            name: 'TON Rocket Casino',
            iconUrl: 'https://via.placeholder.com/192x192.png',
            items: [
                {
                    name: 'ton_addr',
                    required: true
                }
            ]
        };

        // Проверяем, доступен ли TON_CONNECT_UI
        if (!window.TON_CONNECT_UI) {
            console.error('TON Connect UI не загружен');
            setTimeout(hideLoader, 1500);
            return;
        }

        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifest,
            buttonRootId: 'tonconnect-button',
            language: state.language,
            uiPreferences: {
                theme: 'DARK'
            }
        });

        connector = tonConnectUI.connector;
        
        // Проверяем подключенный кошелек
        const connectedWallets = await connector.getWallets();
        if (connectedWallets.length > 0) {
            await handleWalletConnection(connectedWallets[0]);
        }

        // Подписываемся на события
        connector.onStatusChange(async (wallet) => {
            if (wallet) {
                await handleWalletConnection(wallet);
            } else {
                handleWalletDisconnect();
            }
        });

        hideLoader();
        
    } catch (error) {
        console.error('TON Connect initialization error:', error);
        showNotification('Error connecting to TON', 'error');
        hideLoader();
    }
}

// Прячем лоадер
function hideLoader() {
    const loader = document.getElementById('loader');
    const app = document.getElementById('app');
    
    if (loader && app) {
        loader.style.display = 'none';
        app.classList.remove('hidden');
    }
}

// Обработка подключения кошелька
async function handleWalletConnection(walletInfo) {
    try {
        state.wallet = walletInfo;
        
        // Устанавливаем демо-данные для тестирования
        state.balance = 10.5;
        
        // Демо-пользователь
        state.user = {
            address: walletInfo.account.address,
            balance: 5.2,
            level: 1,
            xp: 0,
            totalWagered: 125.5,
            totalProfit: 15.3,
            referralCode: generateReferralCode(walletInfo.account.address)
        };
        
        state.gameBalance = state.user.balance;
        
        // Обновляем UI
        updateUserDisplay();
        
        // Закрываем модалку
        const modal = document.getElementById('tonconnect-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        showNotification('Wallet connected successfully!', 'success');
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showNotification('Error connecting wallet', 'error');
    }
}

function handleWalletDisconnect() {
    state.wallet = null;
    state.user = null;
    
    updateUserDisplay();
    showNotification('Wallet disconnected', 'info');
}

// Генерация реферального кода
function generateReferralCode(address) {
    return address.slice(-8).toUpperCase();
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    // Меняем название с TON Gambit на TON Rocket
    updateAppName();
    
    // Настройка UI
    setupEventListeners();
    setupLanguage();
    
    // Пытаемся инициализировать TON Connect
    await initTONConnect();
    
    // Если через 1.5 секунды все еще висит лоадер - прячем его принудительно
    setTimeout(hideLoader, 1500);
});

// Меняем название приложения
function updateAppName() {
    const logoElements = document.querySelectorAll('.logo, .loader-text');
    logoElements.forEach(el => {
        if (el.classList.contains('logo')) {
            const span = el.querySelector('span');
            if (span) {
                span.textContent = 'TON ROCKET';
            }
        } else if (el.classList.contains('loader-text')) {
            el.textContent = 'TON ROCKET';
        }
    });
    
    // Также обновляем title страницы
    document.title = '🚀 TON Rocket | Premium Casino';
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Подключение кошелька
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            const modal = document.getElementById('tonconnect-modal');
            if (modal) {
                modal.classList.add('active');
            }
        });
    }
    
    // Закрытие модалки
    document.querySelectorAll('.close-modal, .close-sidebar').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('tonconnect-modal').classList.remove('active');
            document.getElementById('sidebar').classList.remove('active');
        });
    });
    
    // Боковое меню
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('active');
        });
    }
    
    // Навигация
    document.querySelectorAll('.menu-item, .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
            document.getElementById('sidebar').classList.remove('active');
        });
    });
    
    // Выбор языка
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            state.language = e.target.value;
            updateLanguage();
        });
    }
    
    // Опции кошельков
    document.querySelectorAll('.wallet-option').forEach(option => {
        option.addEventListener('click', () => {
            const wallet = option.dataset.wallet;
            showNotification(`Selected ${wallet}`, 'info');
        });
    });
}

// Навигация по страницам
function navigateTo(page) {
    // Обновляем активные элементы
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item, .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Показываем нужную страницу
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Обновляем активные кнопки
    document.querySelectorAll(`[data-page="${page}"]`).forEach(item => {
        item.classList.add('active');
    });
    
    state.currentPage = page;
    
    // Загружаем данные для страницы
    switch(page) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'crash':
            setupCrashGame();
            break;
        case 'mines':
            setupMinesGame();
            break;
        case 'referral':
            updateReferral();
            break;
        case 'bonuses':
            updateBonuses();
            break;
        case 'leaderboard':
            updateLeaderboard();
            break;
        case 'transactions':
            updateTransactions();
            break;
    }
}

// Мультиязычность
function setupLanguage() {
    // Определяем язык пользователя
    const userLang = navigator.language.split('-')[0];
    state.language = CONFIG.LANGUAGES[userLang] ? userLang : 'en';
    
    // Устанавливаем выбранный язык
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = state.language;
    }
}

function updateLanguage() {
    // Простая мультиязычность
    const translations = {
        en: {
            connect: 'Connect',
            dashboard: 'Dashboard',
            crash: 'Crash',
            mines: 'Mines',
            referral: 'Referral',
            bonuses: 'Bonuses',
            leaderboard: 'Leaderboard',
            transactions: 'Transactions',
            support: 'Support'
        },
        ru: {
            connect: 'Подключить',
            dashboard: 'Панель',
            crash: 'Краш',
            mines: 'Мины',
            referral: 'Рефералы',
            bonuses: 'Бонусы',
            leaderboard: 'Таблица лидеров',
            transactions: 'Транзакции',
            support: 'Поддержка'
        }
    };
    
    const lang = translations[state.language] || translations.en;
    
    // Обновляем тексты
    const connectBtn = document.querySelector('#connect-btn span');
    if (connectBtn) connectBtn.textContent = lang.connect;
    
    // Обновляем меню
    document.querySelectorAll('.menu-item span').forEach((span, index) => {
        const keys = ['dashboard', 'crash', 'mines', 'referral', 'bonuses', 'leaderboard', 'transactions', 'support'];
        if (keys[index]) {
            span.textContent = lang[keys[index]];
        }
    });
    
    // Обновляем нижнюю навигацию
    document.querySelectorAll('.nav-item span').forEach((span, index) => {
        const keys = ['dashboard', 'crash', 'mines', 'bonuses', 'referral'];
        if (keys[index]) {
            span.textContent = keys[index] === 'referral' ? 'Refer' : lang[keys[index]];
        }
    });
}

// Обновление отображения пользователя
function updateUserDisplay() {
    const userProfile = document.getElementById('user-profile');
    const connectBtn = document.getElementById('connect-btn');
    
    if (state.user && userProfile && connectBtn) {
        userProfile.classList.remove('hidden');
        connectBtn.classList.add('hidden');
        
        // Обновляем информацию
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = 
                `${state.user.address.slice(0, 6)}...${state.user.address.slice(-4)}`;
        }
        
        // Обновляем статистику
        const totalWagered = document.getElementById('total-wagered');
        if (totalWagered) {
            totalWagered.textContent = `${state.user.totalWagered.toFixed(2)} TON`;
        }
        
        const totalProfit = document.getElementById('total-profit');
        if (totalProfit) {
            totalProfit.textContent = `${state.user.totalProfit.toFixed(2)} TON`;
            totalProfit.className = state.user.totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
        }
    } else if (userProfile && connectBtn) {
        userProfile.classList.add('hidden');
        connectBtn.classList.remove('hidden');
    }
}

// Дашборд
function updateDashboard() {
    const page = document.getElementById('page-dashboard');
    if (!page) return;
    
    page.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Balance</div>
                <div class="stat-value">${state.gameBalance ? state.gameBalance.toFixed(2) : '0.00'} TON</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Today's Profit</div>
                <div class="stat-value" style="color: #00ff9d">+5.2 TON</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Active Games</div>
                <div class="stat-value">12</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Your Level</div>
                <div class="stat-value">${state.user ? state.user.level : '1'}</div>
            </div>
        </div>
        
        <div class="bonus-card">
            <h3>🎁 WELCOME BONUS!</h3>
            <p>Get 0.5 TON for free on your first deposit!</p>
            <button class="claim-btn" id="welcome-bonus">
                CLAIM BONUS
            </button>
        </div>
        
        <div class="chart-container">
            <h3 style="margin-bottom: 15px;">📈 Activity Chart</h3>
            <canvas id="activityChart" width="400" height="200"></canvas>
        </div>
        
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-gamepad"></i>
                    QUICK PLAY
                </div>
            </div>
            <div class="game-card-body">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <button class="quick-play-btn" onclick="navigateTo('crash')">
                        <i class="fas fa-rocket"></i>
                        <span>Crash</span>
                    </button>
                    <button class="quick-play-btn" onclick="navigateTo('mines')">
                        <i class="fas fa-bomb"></i>
                        <span>Mines</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Стили для кнопок быстрого запуска
    const style = document.createElement('style');
    style.textContent = `
        .quick-play-btn {
            background: var(--gradient-primary);
            border: none;
            border-radius: 12px;
            padding: 20px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .quick-play-btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 184, 255, 0.3);
        }
        .quick-play-btn i {
            font-size: 32px;
        }
    `;
    document.head.appendChild(style);
    
    // Инициализация графика
    initActivityChart();
    
    // Обработчик бонуса
    const bonusBtn = document.getElementById('welcome-bonus');
    if (bonusBtn) {
        bonusBtn.addEventListener('click', () => {
            if (!state.user) {
                showNotification('Please connect wallet first', 'error');
                return;
            }
            showNotification('Welcome bonus claimed! +0.5 TON', 'success');
        });
    }
}

function initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    
    // Простой график для демонстрации
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Profit (TON)',
                data: [2.5, 1.8, 3.2, 2.1, 4.5, 3.8, 5.2],
                borderColor: '#00b8ff',
                backgroundColor: 'rgba(0, 184, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0c0'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0c0'
                    }
                }
            }
        }
    });
}

// Уведомления
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00ff9d' : type === 'error' ? '#ff3b5c' : '#00b8ff'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    notification.innerHTML = `
        <span style="font-weight: bold;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Добавляем анимации
    if (!document.querySelector('#notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Инициализация остальных страниц
function setupCrashGame() {
    const page = document.getElementById('page-crash');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-rocket"></i>
                    CRASH GAME
                </div>
                <div class="players-count">
                    <i class="fas fa-users"></i>
                    <span>42 players</span>
                </div>
            </div>
            <div class="game-card-body">
                <div class="crash-container">
                    <div class="rocket-container">
                        <div class="rocket">🚀</div>
                        <div class="multiplier-display">1.00x</div>
                        <div class="flight-path"></div>
                    </div>
                    
                    <div class="bet-controls">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <button class="bet-action-btn bet-btn" style="width: 200px;">
                                CONNECT TO PLAY
                            </button>
                        </div>
                        <p style="text-align: center; color: var(--text-secondary);">
                            Connect your TON wallet to start playing
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupMinesGame() {
    const page = document.getElementById('page-mines');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-bomb"></i>
                    MINES GAME
                </div>
            </div>
            <div class="game-card-body">
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">💎</div>
                    <h3 style="margin-bottom: 10px;">Find diamonds, avoid mines!</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 30px;">
                        Connect your wallet to start playing Mines
                    </p>
                    <button class="bet-action-btn bet-btn" style="width: 200px;">
                        CONNECT WALLET
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateReferral() {
    const page = document.getElementById('page-referral');
    if (!page) return;
    
    const code = state.user ? state.user.referralCode : 'CONNECT-WALLET';
    
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-users"></i>
                    REFERRAL PROGRAM
                </div>
            </div>
            <div class="game-card-body">
                <div class="referral-container">
                    <h3>Earn 5% from your friends' bets!</h3>
                    
                    <div class="referral-code">
                        <h3>Your referral code:</h3>
                        <div class="code-display">
                            ${code}
                        </div>
                        <button class="copy-btn" onclick="copyToClipboard('${code}')">
                            <i class="fas fa-copy"></i>
                            COPY CODE
                        </button>
                    </div>
                    
                    <div class="referral-stats">
                        <div class="stat-card">
                            <div class="stat-value">0</div>
                            <div class="stat-label">Total Referrals</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">0 TON</div>
                            <div class="stat-label">Total Earned</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">0 TON</div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateBonuses() {
    const page = document.getElementById('page-bonuses');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-gift"></i>
                    BONUSES
                </div>
            </div>
            <div class="game-card-body">
                <div class="bonus-card">
                    <h3>🎁 DAILY REWARD</h3>
                    <p>Claim your daily bonus every 24 hours!</p>
                    <div class="bonus-amount" style="margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold;">0.1 TON</span>
                    </div>
                    <button class="claim-btn">
                        CLAIM NOW
                    </button>
                </div>
                
                <div class="bonuses-grid">
                    <div class="bonus-item">
                        <div class="bonus-icon">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <div class="bonus-details">
                            <h4>Referral Bonus</h4>
                            <p>Get 0.5 TON for each friend who deposits</p>
                        </div>
                        <div class="bonus-status available">
                            AVAILABLE
                        </div>
                    </div>
                    
                    <div class="bonus-item">
                        <div class="bonus-icon">
                            <i class="fas fa-award"></i>
                        </div>
                        <div class="bonus-details">
                            <h4>Welcome Bonus</h4>
                            <p>0.5 TON on first deposit</p>
                        </div>
                        <div class="bonus-status available">
                            AVAILABLE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateLeaderboard() {
    const page = document.getElementById('page-leaderboard');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-trophy"></i>
                    LEADERBOARD
                </div>
            </div>
            <div class="game-card-body">
                <div class="leaderboard-table">
                    <div class="leaderboard-header">
                        <div class="rank">#</div>
                        <div class="player">Player</div>
                        <div class="profit">Profit</div>
                    </div>
                    <div class="leaderboard-row">
                        <div class="rank">1</div>
                        <div class="player">
                            <div class="player-info">
                                <div class="player-name">EQB7j...d4fG</div>
                                <div class="player-level">Level 15</div>
                            </div>
                        </div>
                        <div class="profit positive">
                            +125.50 TON
                        </div>
                    </div>
                    <div class="leaderboard-row">
                        <div class="rank">2</div>
                        <div class="player">
                            <div class="player-info">
                                <div class="player-name">EQAc3...k9jH</div>
                                <div class="player-level">Level 12</div>
                            </div>
                        </div>
                        <div class="profit positive">
                            +98.75 TON
                        </div>
                    </div>
                    <div class="leaderboard-row">
                        <div class="rank">3</div>
                        <div class="player">
                            <div class="player-info">
                                <div class="player-name">EQM9s...p2qW</div>
                                <div class="player-level">Level 10</div>
                            </div>
                        </div>
                        <div class="profit positive">
                            +76.20 TON
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateTransactions() {
    const page = document.getElementById('page-transactions');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-history"></i>
                    TRANSACTIONS
                </div>
            </div>
            <div class="game-card-body">
                <div class="transactions-list">
                    <div class="transaction-item" style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: bold;">Welcome Bonus</div>
                            <div style="color: var(--text-secondary); font-size: 14px;">Just now</div>
                        </div>
                        <div style="color: #00ff9d; font-weight: bold;">+0.5 TON</div>
                    </div>
                    <div class="transaction-item" style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-weight: bold;">Crash Game</div>
                            <div style="color: var(--text-secondary); font-size: 14px;">2 hours ago</div>
                        </div>
                        <div style="color: #ff3b5c; font-weight: bold;">-1.0 TON</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Вспомогательные функции
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('Copied to clipboard!', 'success'))
        .catch(err => showNotification('Failed to copy', 'error'));
}

// Экспорт для использования
window.state = state;
window.navigateTo = navigateTo;
window.copyToClipboard = copyToClipboard;
