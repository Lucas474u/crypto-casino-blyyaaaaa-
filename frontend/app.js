// Конфигурация
const CONFIG = {
    API_URL: 'https://crypto-casino-blyyaaaaa.vercel.app', // Замените на ваш API
    MANIFEST_URL: 'https://crypto-casino-blyyaaaaa.vercel.app/tonconnect-manifest.json',
    CONTRACT_ADDRESS: 'EQ...', // Адрес смарт-контракта
    REFERRAL_COMMISSION: 0.05, // 5% комиссия за рефералов
    HOUSE_EDGE: 0.02, // 2% комиссия казино
    MIN_BET: 0.1,
    MAX_BET: 1000,
    BONUS_DAILY: 0.1, // Ежедневный бонус 0.1 TON
    BONUS_REFERRAL: 0.5, // Бонус за реферала 0.5 TON
    LANGUAGES: {
        en: require('./locales/en.json'),
        ru: require('./locales/ru.json'),
        zh: require('./locales/zh.json'),
        es: require('./locales/es.json'),
        tr: require('./locales/tr.json')
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
        // Создаем манифест для TON Connect
        const manifest = {
            url: window.location.href,
            name: 'TON Gambit Casino',
            iconUrl: 'https://your-domain.com/icon.png',
            items: [
                {
                    name: 'ton_addr',
                    required: true
                }
            ]
        };

        // Инициализируем TON Connect UI
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifest,
            buttonRootId: 'tonconnect-button',
            language: state.language,
            uiPreferences: {
                theme: 'DARK',
                colorsSet: {
                    [TON_CONNECT_UI.COLORS.CONNECT_BUTTON]: '#00b8ff'
                }
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

    } catch (error) {
        console.error('TON Connect initialization error:', error);
        showNotification('Error connecting to TON', 'error');
    }
}

// Обработка подключения кошелька
async function handleWalletConnection(walletInfo) {
    try {
        state.wallet = walletInfo;
        
        // Получаем баланс
        const balance = await getWalletBalance(walletInfo.account.address);
        state.balance = balance;
        
        // Регистрируем пользователя на бэкенде
        const userData = await registerUser(walletInfo.account.address);
        state.user = userData;
        state.gameBalance = userData.balance;
        
        // Обновляем UI
        updateUserDisplay();
        loadUserData();
        
        // Закрываем модалку
        document.getElementById('tonconnect-modal').classList.remove('active');
        
        showNotification('Wallet connected successfully!', 'success');
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showNotification('Error connecting wallet', 'error');
    }
}

// Получение баланса кошелька
async function getWalletBalance(address) {
    try {
        // Используем TON API для получения баланса
        const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
        const data = await response.json();
        return parseFloat(data.result) / 1000000000; // Конвертируем наноТОН в TON
    } catch (error) {
        console.error('Balance fetch error:', error);
        return 0;
    }
}

// Регистрация пользователя на бэкенде
async function registerUser(address) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/user/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: address,
                referrer: getUrlParameter('ref')
            })
        });
        
        if (!response.ok) {
            throw new Error('Registration failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        // Возвращаем данные по умолчанию
        return {
            address: address,
            balance: 0,
            level: 1,
            xp: 0,
            totalWagered: 0,
            totalProfit: 0,
            referralCode: generateReferralCode(address)
        };
    }
}

// Генерация реферального кода
function generateReferralCode(address) {
    return address.slice(-8).toUpperCase();
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        // Загружаем транзакции
        const transactionsResponse = await fetch(`${CONFIG.API_URL}/api/user/transactions?address=${state.user.address}`);
        if (transactionsResponse.ok) {
            state.transactions = await transactionsResponse.json();
        }
        
        // Загружаем бонусы
        const bonusesResponse = await fetch(`${CONFIG.API_URL}/api/user/bonuses?address=${state.user.address}`);
        if (bonusesResponse.ok) {
            state.bonuses = await bonusesResponse.json();
        }
        
        // Загружаем лидерборд
        const leaderboardResponse = await fetch(`${CONFIG.API_URL}/api/leaderboard`);
        if (leaderboardResponse.ok) {
            state.leaderboard = await leaderboardResponse.json();
        }
        
        // Обновляем UI
        updateDashboard();
        updateTransactions();
        updateLeaderboard();
        updateBonuses();
        
    } catch (error) {
        console.error('Data loading error:', error);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация TON Connect
    await initTONConnect();
    
    // Настройка UI
    setupEventListeners();
    setupLanguage();
    setupGames();
    
    // Загрузка данных
    await loadInitialData();
    
    // Показываем приложение
    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
    }, 1000);
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Подключение кошелька
    document.getElementById('connect-btn').addEventListener('click', () => {
        document.getElementById('tonconnect-modal').classList.add('active');
    });
    
    // Закрытие модалки
    document.querySelectorAll('.close-modal, .close-sidebar').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('tonconnect-modal').classList.remove('active');
            document.getElementById('sidebar').classList.remove('active');
        });
    });
    
    // Боковое меню
    document.getElementById('menu-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('active');
    });
    
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
    document.getElementById('language-select').addEventListener('change', (e) => {
        state.language = e.target.value;
        updateLanguage();
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
    document.getElementById(`page-${page}`).classList.add('active');
    
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
        case 'transactions':
            updateTransactions();
            break;
        case 'leaderboard':
            updateLeaderboard();
            break;
        case 'bonuses':
            updateBonuses();
            break;
        case 'referral':
            updateReferral();
            break;
    }
}

// Мультиязычность
function setupLanguage() {
    // Определяем язык пользователя
    const userLang = navigator.language.split('-')[0];
    state.language = CONFIG.LANGUAGES[userLang] ? userLang : 'en';
    
    // Устанавливаем выбранный язык
    document.getElementById('language-select').value = state.language;
    updateLanguage();
}

function updateLanguage() {
    const translations = CONFIG.LANGUAGES[state.language];
    
    // Обновляем все тексты с data-i18n атрибутом
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });
}

// Обновление отображения пользователя
function updateUserDisplay() {
    if (state.user) {
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('connect-btn').classList.add('hidden');
        
        // Обновляем информацию
        document.getElementById('user-name').textContent = 
            `${state.user.address.slice(0, 6)}...${state.user.address.slice(-4)}`;
        
        document.getElementById('user-balance').textContent = 
            `${state.gameBalance.toFixed(2)} TON`;
        
        document.getElementById('total-wagered').textContent = 
            `${state.user.totalWagered.toFixed(2)} TON`;
        
        document.getElementById('total-profit').textContent = 
            `${state.user.totalProfit.toFixed(2)} TON`;
        
        document.getElementById('total-profit').className = 
            `profit-${state.user.totalProfit >= 0 ? 'positive' : 'negative'}`;
    }
}

// КРАШ ИГРА
function setupCrashGame() {
    const page = document.getElementById('page-crash');
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-rocket"></i>
                    CRASH
                </div>
                <div class="players-count" id="crash-players">
                    <i class="fas fa-users"></i>
                    <span>0 players</span>
                </div>
            </div>
            <div class="game-card-body">
                <div class="crash-container">
                    <div class="rocket-container">
                        <div class="rocket" id="rocket">🚀</div>
                        <div class="multiplier-display" id="crash-multiplier">1.00x</div>
                        <div class="flight-path"></div>
                    </div>
                    
                    <div class="bet-controls">
                        <div class="bet-input-group">
                            <input type="number" 
                                   class="bet-input" 
                                   id="crash-bet" 
                                   placeholder="Bet amount" 
                                   value="1" 
                                   min="${CONFIG.MIN_BET}" 
                                   max="${CONFIG.MAX_BET}" 
                                   step="0.1">
                            <div class="quick-bets">
                                <button class="quick-bet" data-bet="1">1 TON</button>
                                <button class="quick-bet" data-bet="5">5 TON</button>
                                <button class="quick-bet" data-bet="10">10 TON</button>
                                <button class="quick-bet" data-bet="50">50 TON</button>
                            </div>
                        </div>
                        
                        <div class="bet-input-group">
                            <input type="number" 
                                   class="bet-input" 
                                   id="auto-cashout" 
                                   placeholder="Auto cashout" 
                                   value="2" 
                                   min="1.1" 
                                   step="0.1">
                            <span>x</span>
                        </div>
                        
                        <button class="bet-action-btn bet-btn" id="place-bet">
                            PLACE BET
                        </button>
                        <button class="bet-action-btn cashout-btn hidden" id="cashout-btn">
                            CASHOUT <span id="cashout-amount">0 TON</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-history"></i>
                    HISTORY
                </div>
            </div>
            <div class="game-card-body">
                <div class="history-grid" id="crash-history">
                    <!-- История будет загружена динамически -->
                </div>
            </div>
        </div>
    `;
    
    // Настройка обработчиков для краш игры
    setupCrashEventListeners();
}

function setupCrashEventListeners() {
    // Быстрые ставки
    document.querySelectorAll('.quick-bet').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('crash-bet').value = btn.dataset.bet;
        });
    });
    
    // Ставка
    document.getElementById('place-bet').addEventListener('click', placeCrashBet);
    
    // Вывод
    document.getElementById('cashout-btn').addEventListener('click', cashoutCrash);
    
    // Автовывод
    document.getElementById('auto-cashout').addEventListener('change', (e) => {
        state.games.crash.autoCashout = parseFloat(e.target.value);
    });
}

async function placeCrashBet() {
    if (!state.user) {
        showNotification('Please connect wallet first', 'error');
        return;
    }
    
    const betAmount = parseFloat(document.getElementById('crash-bet').value);
    
    if (!validateBet(betAmount)) return;
    
    try {
        // Отправляем транзакцию в смарт-контракт
        const tx = await sendTransaction(betAmount, 'crash_bet');
        
        if (tx.success) {
            state.games.crash.active = true;
            state.games.crash.bet = betAmount;
            state.games.crash.multiplier = 1.0;
            
            // Обновляем UI
            document.getElementById('place-bet').classList.add('hidden');
            document.getElementById('cashout-btn').classList.remove('hidden');
            
            // Запускаем игру
            startCrashGame();
            
        } else {
            showNotification('Transaction failed', 'error');
        }
        
    } catch (error) {
        console.error('Bet placement error:', error);
        showNotification('Error placing bet', 'error');
    }
}

function startCrashGame() {
    const rocket = document.getElementById('rocket');
    const multiplierDisplay = document.getElementById('crash-multiplier');
    
    // Генерируем точку краша
    const crashPoint = generateCrashPoint();
    
    state.games.crash.interval = setInterval(() => {
        // Увеличиваем множитель
        state.games.crash.multiplier += 0.01;
        
        // Обновляем отображение
        const currentMultiplier = state.games.crash.multiplier;
        multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
        
        // Двигаем ракету
        const progress = Math.min(currentMultiplier / crashPoint, 1);
        rocket.style.bottom = `${progress * 250}px`;
        
        // Проверяем автовывод
        if (currentMultiplier >= state.games.crash.autoCashout) {
            cashoutCrash();
            return;
        }
        
        // Проверяем краш
        if (currentMultiplier >= crashPoint) {
            crashGame();
            return;
        }
        
    }, 100);
}

function generateCrashPoint() {
    // Прозрачный алгоритм определения краша
    const hash = Math.random().toString(36).substring(2);
    const hashValue = parseInt(hash.substring(0, 8), 36);
    const crashPoint = 1 + (hashValue % 10000) / 100;
    
    return Math.max(1.01, Math.min(crashPoint, 100));
}

async function cashoutCrash() {
    if (!state.games.crash.active) return;
    
    clearInterval(state.games.crash.interval);
    
    const winAmount = state.games.crash.bet * state.games.crash.multiplier;
    
    try {
        // Выплачиваем выигрыш
        const tx = await sendTransaction(winAmount, 'crash_win');
        
        if (tx.success) {
            showNotification(`You won ${winAmount.toFixed(2)} TON!`, 'success');
            updateGameHistory('crash', true, winAmount);
        }
        
    } catch (error) {
        console.error('Cashout error:', error);
    }
    
    resetCrashGame();
}

function crashGame() {
    clearInterval(state.games.crash.interval);
    
    // Анимация взрыва
    document.getElementById('rocket').textContent = '💥';
    document.getElementById('rocket').style.animation = 'explode 0.5s';
    
    showNotification('Crashed!', 'error');
    updateGameHistory('crash', false, state.games.crash.bet);
    
    setTimeout(resetCrashGame, 2000);
}

function resetCrashGame() {
    state.games.crash.active = false;
    
    document.getElementById('rocket').textContent = '🚀';
    document.getElementById('rocket').style.bottom = '0px';
    document.getElementById('rocket').style.animation = '';
    document.getElementById('crash-multiplier').textContent = '1.00x';
    
    document.getElementById('place-bet').classList.remove('hidden');
    document.getElementById('cashout-btn').classList.add('hidden');
}

// МИНЫ ИГРА
function setupMinesGame() {
    const page = document.getElementById('page-mines');
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-bomb"></i>
                    MINES
                </div>
                <div class="game-stats">
                    <span>Multiplier: <strong id="mines-multiplier">1.00x</strong></span>
                </div>
            </div>
            <div class="game-card-body">
                <div class="mines-settings">
                    <div class="setting-group">
                        <label>Number of mines:</label>
                        <div class="mine-counter">
                            <button class="counter-btn" id="decrease-mines">-</button>
                            <span id="mines-count">3</span>
                            <button class="counter-btn" id="increase-mines">+</button>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <label>Bet amount:</label>
                        <input type="number" 
                               class="bet-input" 
                               id="mines-bet" 
                               value="1" 
                               min="${CONFIG.MIN_BET}" 
                               step="0.1">
                    </div>
                    
                    <button class="bet-action-btn bet-btn" id="start-mines">
                        START GAME
                    </button>
                </div>
                
                <div class="mines-grid-container">
                    <div class="mines-grid" id="mines-grid">
                        <!-- Поле 5x5 будет сгенерировано -->
                    </div>
                </div>
                
                <div class="mines-info">
                    <div class="info-row">
                        <span>Opened:</span>
                        <strong id="opened-cells">0</strong>
                    </div>
                    <div class="info-row">
                        <span>Mines left:</span>
                        <strong id="mines-left">3</strong>
                    </div>
                    <button class="bet-action-btn cashout-btn hidden" id="cashout-mines">
                        CASHOUT <span id="mines-win-amount">0 TON</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Генерируем поле
    generateMinesGrid();
    setupMinesEventListeners();
}

function generateMinesGrid() {
    const grid = document.getElementById('mines-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => revealMine(i));
        grid.appendChild(cell);
    }
}

function setupMinesEventListeners() {
    // Управление количеством мин
    document.getElementById('decrease-mines').addEventListener('click', () => {
        let count = parseInt(document.getElementById('mines-count').textContent);
        if (count > 1) {
            count--;
            document.getElementById('mines-count').textContent = count;
            document.getElementById('mines-left').textContent = count;
        }
    });
    
    document.getElementById('increase-mines').addEventListener('click', () => {
        let count = parseInt(document.getElementById('mines-count').textContent);
        if (count < 24) {
            count++;
            document.getElementById('mines-count').textContent = count;
            document.getElementById('mines-left').textContent = count;
        }
    });
    
    // Начало игры
    document.getElementById('start-mines').addEventListener('click', startMinesGame);
    
    // Вывод
    document.getElementById('cashout-mines').addEventListener('click', cashoutMines);
}

async function startMinesGame() {
    if (!state.user) {
        showNotification('Please connect wallet first', 'error');
        return;
    }
    
    const betAmount = parseFloat(document.getElementById('mines-bet').value);
    const minesCount = parseInt(document.getElementById('mines-count').textContent);
    
    if (!validateBet(betAmount)) return;
    
    try {
        const tx = await sendTransaction(betAmount, 'mines_bet');
        
        if (tx.success) {
            state.games.mines.active = true;
            state.games.mines.bet = betAmount;
            state.games.mines.minesCount = minesCount;
            state.games.mines.grid = generateMinesPositions(minesCount);
            state.games.mines.openedCells = 0;
            state.games.mines.cashoutMultiplier = 1.0;
            
            // Блокируем кнопку старта
            document.getElementById('start-mines').disabled = true;
            
            showNotification('Game started! Click on cells to reveal them.', 'info');
        }
        
    } catch (error) {
        console.error('Mines game start error:', error);
    }
}

function generateMinesPositions(count) {
    const positions = new Set();
    while (positions.size < count) {
        positions.add(Math.floor(Math.random() * 25));
    }
    
    const grid = Array(25).fill(false);
    positions.forEach(pos => grid[pos] = true);
    
    return grid;
}

async function revealMine(index) {
    if (!state.games.mines.active) return;
    
    const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
    
    if (cell.classList.contains('revealed')) return;
    
    // Открываем клетку
    cell.classList.add('revealed');
    state.games.mines.openedCells++;
    
    // Проверяем мину
    if (state.games.mines.grid[index]) {
        // Мина!
        cell.classList.add('mine');
        cell.innerHTML = '💥';
        
        gameOverMines(false);
        return;
    }
    
    // Безопасная клетка
    cell.classList.add('safe');
    cell.innerHTML = '💎';
    
    // Обновляем множитель
    state.games.mines.cashoutMultiplier += 0.15;
    document.getElementById('mines-multiplier').textContent = 
        `${state.games.mines.cashoutMultiplier.toFixed(2)}x`;
    
    // Обновляем счетчики
    document.getElementById('opened-cells').textContent = state.games.mines.openedCells;
    
    // Проверяем победу
    const safeCells = 25 - state.games.mines.minesCount;
    if (state.games.mines.openedCells === safeCells) {
        gameOverMines(true);
        return;
    }
    
    // Активируем кнопку вывода после 3 открытых клеток
    if (state.games.mines.openedCells >= 3) {
        document.getElementById('cashout-mines').classList.remove('hidden');
        
        const winAmount = state.games.mines.bet * state.games.mines.cashoutMultiplier;
        document.getElementById('mines-win-amount').textContent = 
            `${winAmount.toFixed(2)} TON`;
    }
}

async function cashoutMines() {
    if (!state.games.mines.active) return;
    
    const winAmount = state.games.mines.bet * state.games.mines.cashoutMultiplier;
    
    try {
        const tx = await sendTransaction(winAmount, 'mines_win');
        
        if (tx.success) {
            showNotification(`You won ${winAmount.toFixed(2)} TON!`, 'success');
            updateGameHistory('mines', true, winAmount);
        }
        
    } catch (error) {
        console.error('Mines cashout error:', error);
    }
    
    resetMinesGame();
}

function gameOverMines(win) {
    state.games.mines.active = false;
    
    // Показываем все мины
    state.games.mines.grid.forEach((isMine, index) => {
        if (isMine) {
            const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
            cell.classList.add('revealed', 'mine');
            cell.innerHTML = '💣';
        }
    });
    
    if (win) {
        const winAmount = state.games.mines.bet * state.games.mines.cashoutMultiplier;
        
        showNotification(`You cleared all mines! Won ${winAmount.toFixed(2)} TON`, 'success');
        updateGameHistory('mines', true, winAmount);
    } else {
        showNotification('You hit a mine!', 'error');
        updateGameHistory('mines', false, state.games.mines.bet);
    }
    
    setTimeout(resetMinesGame, 3000);
}

function resetMinesGame() {
    state.games.mines.active = false;
    
    document.getElementById('start-mines').disabled = false;
    document.getElementById('cashout-mines').classList.add('hidden');
    document.getElementById('mines-multiplier').textContent = '1.00x';
    document.getElementById('opened-cells').textContent = '0';
    
    generateMinesGrid();
}

// РЕФЕРАЛЬНАЯ СИСТЕМА
function updateReferral() {
    const page = document.getElementById('page-referral');
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
                        <p>Your referral code:</p>
                        <div class="code-display" id="referral-code">
                            ${state.user?.referralCode || 'CONNECT WALLET'}
                        </div>
                        <button class="copy-btn" id="copy-code">
                            <i class="fas fa-copy"></i>
                            COPY CODE
                        </button>
                    </div>
                    
                    <div class="referral-stats">
                        <div class="stat-card">
                            <div class="stat-value" id="total-referees">0</div>
                            <div class="stat-label">Total Referrals</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="ref-earned">0 TON</div>
                            <div class="stat-label">Total Earned</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="pending-ref">0 TON</div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                    
                    <div class="referral-link">
                        <h4>Your referral link:</h4>
                        <div class="link-display">
                            https://t.me/your_bot?start=ref_${state.user?.referralCode || 'code'}
                        </div>
                        <button class="copy-btn" id="copy-link">
                            <i class="fas fa-link"></i>
                            COPY LINK
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-list"></i>
                    REFERRALS LIST
                </div>
            </div>
            <div class="game-card-body">
                <div class="referrals-list" id="referrals-list">
                    <!-- Список рефералов -->
                </div>
            </div>
        </div>
    `;
    
    setupReferralEvents();
}

function setupReferralEvents() {
    // Копирование кода
    document.getElementById('copy-code').addEventListener('click', () => {
        navigator.clipboard.writeText(state.user.referralCode);
        showNotification('Referral code copied!', 'success');
    });
    
    // Копирование ссылки
    document.getElementById('copy-link').addEventListener('click', () => {
        const link = `https://t.me/your_bot?start=ref_${state.user.referralCode}`;
        navigator.clipboard.writeText(link);
        showNotification('Referral link copied!', 'success');
    });
}

// БОНУСЫ
function updateBonuses() {
    const page = document.getElementById('page-bonuses');
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-gift"></i>
                    DAILY BONUSES
                </div>
            </div>
            <div class="game-card-body">
                <div class="bonus-card">
                    <h3>DAILY REWARD</h3>
                    <p>Claim your daily bonus and increase your streak!</p>
                    <div class="bonus-amount">
                        <span id="daily-amount">${CONFIG.BONUS_DAILY} TON</span>
                        <small>+ 0.01 TON per streak day</small>
                    </div>
                    <button class="claim-btn" id="claim-daily">
                        CLAIM NOW
                    </button>
                    <div class="streak-info">
                        <span>Current streak: <strong id="streak-days">${state.bonuses.daily.streak} days</strong></span>
                    </div>
                </div>
                
                <div class="bonuses-grid">
                    <div class="bonus-item">
                        <div class="bonus-icon">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <div class="bonus-details">
                            <h4>Referral Bonus</h4>
                            <p>Get ${CONFIG.BONUS_REFERRAL} TON for each friend who deposits</p>
                        </div>
                        <div class="bonus-status ${state.bonuses.referral.available ? 'available' : 'claimed'}">
                            ${state.bonuses.referral.available ? 'AVAILABLE' : 'CLAIMED'}
                        </div>
                    </div>
                    
                    <div class="bonus-item">
                        <div class="bonus-icon">
                            <i class="fas fa-award"></i>
                        </div>
                        <div class="bonus-details">
                            <h4>Level Up Bonus</h4>
                            <p>Get rewards for leveling up your account</p>
                        </div>
                        <div class="bonus-status available">
                            CLAIM
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setupBonusEvents();
}

function setupBonusEvents() {
    // Ежедневный бонус
    document.getElementById('claim-daily').addEventListener('click', claimDailyBonus);
}

async function claimDailyBonus() {
    if (!state.user) {
        showNotification('Connect wallet first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/bonus/daily`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: state.user.address
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            state.gameBalance += data.amount;
            state.bonuses.daily.streak = data.streak;
            state.bonuses.daily.lastClaim = new Date();
            
            updateUserDisplay();
            updateBonuses();
            
            showNotification(`Claimed ${data.amount} TON daily bonus!`, 'success');
        }
        
    } catch (error) {
        console.error('Bonus claim error:', error);
    }
}

// ТРАНЗАКЦИИ
function updateTransactions() {
    const page = document.getElementById('page-transactions');
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-history"></i>
                    TRANSACTION HISTORY
                </div>
            </div>
            <div class="game-card-body">
                <div class="transactions-list">
                    ${state.transactions.map(tx => `
                        <div class="transaction-item ${tx.type}">
                            <div class="tx-icon">
                                <i class="fas fa-${getTransactionIcon(tx.type)}"></i>
                            </div>
                            <div class="tx-details">
                                <div class="tx-type">${tx.description}</div>
                                <div class="tx-time">${new Date(tx.timestamp).toLocaleString()}</div>
                            </div>
                            <div class="tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
                                ${tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(2)} TON
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function getTransactionIcon(type) {
    const icons = {
        deposit: 'arrow-down',
        withdraw: 'arrow-up',
        win: 'trophy',
        loss: 'times',
        bonus: 'gift',
        referral: 'user-plus'
    };
    
    return icons[type] || 'exchange-alt';
}

// ЛИДЕРБОРД
function updateLeaderboard() {
    const page = document.getElementById('page-leaderboard');
    page.innerHTML = `
        <div class="game-card">
            <div class="game-card-header">
                <div class="game-card-title">
                    <i class="fas fa-trophy"></i>
                    LEADERBOARD
                </div>
                <select id="leaderboard-period">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="all">All Time</option>
                </select>
            </div>
            <div class="game-card-body">
                <div class="leaderboard-table">
                    <div class="leaderboard-header">
                        <div class="rank">#</div>
                        <div class="player">Player</div>
                        <div class="profit">Profit</div>
                    </div>
                    ${state.leaderboard.map((player, index) => `
                        <div class="leaderboard-row ${player.address === state.user?.address ? 'me' : ''}">
                            <div class="rank">${index + 1}</div>
                            <div class="player">
                                <div class="player-avatar">
                                    ${player.address.slice(0, 2)}
                                </div>
                                <div class="player-info">
                                    <div class="player-name">${player.address.slice(0, 6)}...${player.address.slice(-4)}</div>
                                    <div class="player-level">Level ${player.level}</div>
                                </div>
                            </div>
                            <div class="profit ${player.profit >= 0 ? 'positive' : 'negative'}">
                                ${player.profit >= 0 ? '+' : ''}${player.profit.toFixed(2)} TON
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function validateBet(amount) {
    if (amount < CONFIG.MIN_BET) {
        showNotification(`Minimum bet is ${CONFIG.MIN_BET} TON`, 'error');
        return false;
    }
    
    if (amount > CONFIG.MAX_BET) {
        showNotification(`Maximum bet is ${CONFIG.MAX_BET} TON`, 'error');
        return false;
    }
    
    if (amount > state.gameBalance) {
        showNotification('Insufficient balance', 'error');
        return false;
    }
    
    return true;
}

async function sendTransaction(amount, type) {
    try {
        // Подготавливаем транзакцию для смарт-контракта
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: CONFIG.CONTRACT_ADDRESS,
                    amount: (amount * 1000000000).toString(), // TON в наноТОН
                    payload: preparePayload(type)
                }
            ]
        };
        
        // Отправляем транзакцию через TON Connect
        const result = await connector.sendTransaction(transaction);
        
        // Ожидаем подтверждения
        await waitForTransaction(result.boc);
        
        return {
            success: true,
            hash: result.boc
        };
        
    } catch (error) {
        console.error('Transaction error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function preparePayload(type) {
    // Готовим payload для смарт-контракта
    // В реальном приложении здесь будет сериализация данных
    return '';
}

async function waitForTransaction(hash) {
    // Ожидаем подтверждения транзакции
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/api/transaction/${hash}`);
                if (response.ok) {
                    clearInterval(checkInterval);
                    resolve();
                }
            } catch (error) {
                // Продолжаем проверять
            }
        }, 2000);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Transaction timeout'));
        }, 30000);
    });
}

function updateGameHistory(game, win, amount) {
    // Обновляем историю игр
    const history = {
        game,
        win,
        amount,
        timestamp: new Date()
    };
    
    state.transactions.unshift(history);
    
    // Обновляем статистику пользователя
    if (state.user) {
        state.user.totalWagered += amount;
        state.user.totalProfit += win ? amount : -amount;
        updateUserDisplay();
    }
}

function showNotification(message, type) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Инициализация всех игр
function setupGames() {
    setupCrashGame();
    setupMinesGame();
}

// Загрузка начальных данных
async function loadInitialData() {
    // Здесь можно загрузить начальные данные
}

// Утилиты
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Экспорт для использования в консоли
window.state = state;
window.navigateTo = navigateTo;
