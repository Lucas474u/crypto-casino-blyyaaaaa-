// ===== CONFIGURATION =====
const CONFIG = {
    // TON Connect Configuration
    MANIFEST_URL: window.location.origin + '/tonconnect-manifest.json',
    WALLETS_LIST_URL: 'https://raw.githubusercontent.com/ton-connect/wallets-list/main/wallets.json',
    
    // App Configuration
    APP_NAME: 'TON ROCKET',
    APP_VERSION: '1.0.0',
    NETWORK: 'mainnet',
    
    // Demo Data
    DEMO_ONLINE_COUNT: 2458,
    DEMO_DAILY_VOLUME: 124500,
    DEMO_BIGGEST_WIN: 12850
};

// ===== STATE MANAGEMENT =====
const AppState = {
    // User State
    user: null,
    wallet: null,
    balance: 0,
    isConnected: false,
    isConnecting: false,
    
    // App State
    currentPage: 'dashboard',
    theme: 'dark',
    language: 'en',
    
    // Wallets
    wallets: [],
    installedWallets: new Set(),
    
    // TON Connect
    connector: null,
    unsubscribe: null,
    qrCode: null
};

// ===== TON CONNECT INTEGRATION =====
class TONConnect {
    constructor() {
        this.connector = null;
        this.walletInfo = null;
        this._initialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 Initializing TON Connect...');
            
            // Check if TON Connect SDK is loaded
            if (typeof TonConnect === 'undefined') {
                throw new Error('TON Connect SDK not loaded');
            }
            
            // Create manifest
            const manifest = {
                url: window.location.origin,
                name: CONFIG.APP_NAME,
                iconUrl: window.location.origin + '/icon.png',
                termsOfUseUrl: window.location.origin + '/terms',
                privacyPolicyUrl: window.location.origin + '/privacy'
            };
            
            // Initialize connector
            this.connector = new TonConnect.TonConnectSDK({
                manifest: manifest,
                wallet: {
                    list: 'all'
                }
            });
            
            // Check existing connection
            const wallets = await this.connector.getWallets();
            console.log('Available wallets:', wallets);
            
            if (this.connector.connected) {
                await this.handleConnection(this.connector.wallet);
            }
            
            // Subscribe to connection changes
            this.connector.onStatusChange(async (wallet) => {
                console.log('Wallet status changed:', wallet);
                if (wallet) {
                    await this.handleConnection(wallet);
                } else {
                    this.handleDisconnection();
                }
            });
            
            this._initialized = true;
            console.log('✅ TON Connect initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ TON Connect initialization failed:', error);
            this.showToast('TON Connect initialization failed', 'error');
            return false;
        }
    }
    
    async handleConnection(wallet) {
        try {
            this.walletInfo = wallet;
            AppState.wallet = wallet;
            AppState.isConnected = true;
            AppState.isConnecting = false;
            
            // Create user object
            AppState.user = {
                address: wallet.account.address,
                name: this.getShortAddress(wallet.account.address),
                balance: 0,
                totalWagered: 0,
                totalProfit: 0,
                referralCode: this.generateReferralCode(wallet.account.address)
            };
            
            // Update UI
            updateUserDisplay();
            
            // Close modal
            closeConnectModal();
            
            // Show success
            this.showToast('Wallet connected successfully!', 'success');
            
            // Update balance
            await this.updateBalance();
            
            // Update page if needed
            if (AppState.currentPage === 'dashboard') {
                loadDashboard();
            }
            
            // Save to localStorage
            this.saveConnection();
            
        } catch (error) {
            console.error('Connection handling error:', error);
            this.showToast('Connection error', 'error');
        }
    }
    
    handleDisconnection() {
        this.walletInfo = null;
        AppState.wallet = null;
        AppState.user = null;
        AppState.isConnected = false;
        AppState.isConnecting = false;
        
        updateUserDisplay();
        this.showToast('Wallet disconnected', 'info');
        this.clearConnection();
    }
    
    async connect(wallet) {
        if (!this._initialized) {
            this.showToast('TON Connect not initialized', 'error');
            return false;
        }
        
        try {
            AppState.isConnecting = true;
            this.showToast(`Connecting to ${wallet.name}...`, 'info');
            
            // Generate universal link
            const universalLink = this.connector.connect({
                bridgeUrl: wallet.bridge[0],
                universalLink: wallet.universal_url
            });
            
            // Open wallet
            if (wallet.universal_url) {
                window.open(universalLink, '_blank');
            } else {
                // Show QR code
                this.generateQRCode(universalLink);
            }
            
            return true;
            
        } catch (error) {
            console.error('Connection error:', error);
            AppState.isConnecting = false;
            this.showToast('Connection failed', 'error');
            return false;
        }
    }
    
    async disconnect() {
        if (!this._initialized || !this.connector.connected) return;
        
        try {
            await this.connector.disconnect();
            this.handleDisconnection();
        } catch (error) {
            console.error('Disconnection error:', error);
            this.showToast('Disconnection failed', 'error');
        }
    }
    
    generateQRCode(link) {
        const qrContainer = document.getElementById('qr-container');
        if (!qrContainer) return;
        
        qrContainer.innerHTML = '';
        
        QRCode.toCanvas(qrContainer, link, {
            width: 180,
            height: 180,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error) {
            if (error) {
                console.error('QR generation error:', error);
                qrContainer.innerHTML = `
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#666;">
                        <i class="fas fa-qrcode" style="font-size:48px;"></i>
                        <span>QR Code Error</span>
                    </div>
                `;
            }
        });
    }
    
    async updateBalance() {
        if (!AppState.user || !AppState.wallet) return;
        
        try {
            // Using TON Center API
            const response = await fetch(
                `https://toncenter.com/api/v2/getAddressBalance?address=${AppState.wallet.account.address}`
            );
            
            const data = await response.json();
            
            if (data.ok) {
                // Convert from nanoTON to TON
                AppState.user.balance = parseFloat(data.result) / 1000000000;
                updateUserDisplay();
            }
        } catch (error) {
            console.error('Balance update error:', error);
            // Use demo balance
            AppState.user.balance = 12.85;
            updateUserDisplay();
        }
    }
    
    getShortAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    generateReferralCode(address) {
        const hash = address.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0);
        return 'ROCKET' + (hash % 10000).toString().padStart(4, '0');
    }
    
    saveConnection() {
        localStorage.setItem('ton_connection', JSON.stringify({
            address: AppState.wallet?.account?.address,
            timestamp: Date.now()
        }));
    }
    
    clearConnection() {
        localStorage.removeItem('ton_connection');
    }
    
    loadConnection() {
        const saved = localStorage.getItem('ton_connection');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
    
    showToast(message, type = 'info') {
        showNotification(message, type);
    }
}

// ===== WALLETS MANAGEMENT =====
class WalletsManager {
    constructor() {
        this.wallets = [];
        this.installedWallets = new Set();
    }
    
    async detectInstalledWallets() {
        // Check for common wallet injections
        const checks = [
            { name: 'tonkeeper', check: () => window.tonkeeper !== undefined },
            { name: 'mytonwallet', check: () => window.ton !== undefined },
            { name: 'bitget', check: () => window.bitkeep !== undefined || window.bitget !== undefined },
            { name: 'telegram', check: () => window.Telegram !== undefined && window.Telegram.WebApp !== undefined }
        ];
        
        checks.forEach(check => {
            try {
                if (check.check()) {
                    this.installedWallets.add(check.name);
                }
            } catch (e) {
                console.log(`Check failed for ${check.name}:`, e);
            }
        });
        
        return Array.from(this.installedWallets);
    }
    
    async loadWallets() {
        try {
            const response = await fetch(CONFIG.WALLETS_LIST_URL);
            const data = await response.json();
            
            // Get popular wallets
            const popularWallets = [
                'tonwallet',      // Tonkeeper
                'tonhub',         // Tonhub
                'mytonwallet',    // MyTonWallet
                'bitget',         // Bitget Wallet
                'openmask'        // OpenMask
            ];
            
            this.wallets = data
                .filter(wallet => popularWallets.includes(wallet.app_name))
                .map(wallet => ({
                    ...wallet,
                    isInstalled: this.installedWallets.has(wallet.app_name),
                    isPopular: wallet.app_name === 'tonwallet' || wallet.app_name === 'tonhub'
                }));
            
            return this.wallets;
            
        } catch (error) {
            console.error('Failed to load wallets:', error);
            return this.getDefaultWallets();
        }
    }
    
    getDefaultWallets() {
        return [
            {
                app_name: 'tonwallet',
                name: 'Tonkeeper',
                image: 'https://tonkeeper.com/assets/tonconnect-icon.png',
                about_url: 'https://tonkeeper.com',
                universal_url: 'https://app.tonkeeper.com/ton-connect',
                bridge: ['https://bridge.tonapi.io/bridge'],
                platforms: ['ios', 'android', 'chrome', 'firefox'],
                isInstalled: this.installedWallets.has('tonwallet'),
                isPopular: true
            },
            {
                app_name: 'telegram',
                name: 'Telegram Wallet',
                image: 'https://telegram.org/img/t_logo.png',
                about_url: 'https://t.me/wallet',
                universal_url: 'https://t.me/wallet',
                bridge: ['https://bridge.tonapi.io/bridge'],
                platforms: ['ios', 'android'],
                isInstalled: this.installedWallets.has('telegram'),
                isPopular: true
            },
            {
                app_name: 'mytonwallet',
                name: 'MyTonWallet',
                image: 'https://mytonwallet.io/icon.png',
                about_url: 'https://mytonwallet.io',
                universal_url: 'https://connect.mytonwallet.org',
                bridge: ['https://tonconnectbridge.mytonwallet.org/bridge/'],
                platforms: ['chrome', 'firefox', 'safari'],
                isInstalled: this.installedWallets.has('mytonwallet'),
                isPopular: false
            },
            {
                app_name: 'tonhub',
                name: 'Tonhub',
                image: 'https://tonhub.com/icon.png',
                about_url: 'https://tonhub.com',
                universal_url: 'https://tonhub.com/connect',
                bridge: ['https://connect.tonhubapi.com/ton-connect'],
                platforms: ['ios', 'android'],
                isInstalled: false,
                isPopular: true
            }
        ];
    }
    
    getWalletIcon(name) {
        const icons = {
            'tonwallet': 'fas fa-shield-alt',
            'telegram': 'fab fa-telegram',
            'mytonwallet': 'fas fa-wallet',
            'tonhub': 'fas fa-cloud',
            'bitget': 'fas fa-exchange-alt',
            'openmask': 'fas fa-mask'
        };
        return icons[name] || 'fas fa-wallet';
    }
    
    getWalletColor(name) {
        const colors = {
            'tonwallet': 'tonkeeper',
            'telegram': 'telegram',
            'mytonwallet': 'mytonwallet',
            'tonhub': 'tonhub',
            'bitget': 'bitget',
            'openmask': 'openmask'
        };
        return colors[name] || 'tonkeeper';
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor() {
        this.tonConnect = new TONConnect();
        this.walletsManager = new WalletsManager();
    }
    
    async initialize() {
        console.log('🚀 Initializing TON ROCKET...');
        
        // Show loader
        this.showLoader();
        
        try {
            // Detect installed wallets
            await this.walletsManager.detectInstalledWallets();
            
            // Initialize TON Connect
            const tonConnectReady = await this.tonConnect.init();
            if (!tonConnectReady) {
                throw new Error('TON Connect initialization failed');
            }
            
            // Load wallets
            AppState.wallets = await this.walletsManager.loadWallets();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check saved connection
            const saved = this.tonConnect.loadConnection();
            if (saved && saved.address) {
                console.log('Found saved connection:', saved);
                // You could try to restore connection here
            }
            
            // Update UI
            this.updateHeaderStats();
            this.updateWalletsGrid();
            
            // Hide loader
            setTimeout(() => {
                this.hideLoader();
                this.loadPage('dashboard');
            }, 1500);
            
            console.log('✅ TON ROCKET initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.hideLoader();
            this.showNotification('Failed to initialize app', 'error');
        }
    }
    
    showLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('hidden');
    }
    
    hideLoader() {
        const loader = document.getElementById('loader');
        const app = document.getElementById('app');
        
        if (loader) {
            loader.classList.add('hidden');
        }
        
        if (app) {
            app.classList.remove('hidden');
        }
    }
    
    updateUserDisplay() {
        const userProfile = document.getElementById('user-profile');
        const connectBtn = document.getElementById('connect-wallet-btn');
        const disconnectBtn = document.getElementById('disconnect-btn');
        const userName = document.getElementById('user-name');
        const userBalance = document.getElementById('user-balance');
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const totalWagered = document.getElementById('total-wagered');
        const totalProfit = document.getElementById('total-profit');
        
        if (AppState.isConnected && AppState.user) {
            // Show user profile
            if (userProfile) userProfile.classList.remove('hidden');
            if (connectBtn) connectBtn.classList.add('hidden');
            if (disconnectBtn) disconnectBtn.classList.remove('hidden');
            
            // Update info
            if (userName) userName.textContent = `@${AppState.user.name}`;
            if (userBalance) userBalance.innerHTML = `<i class="fas fa-coins"></i><span>${AppState.user.balance.toFixed(2)} TON</span>`;
            if (sidebarUserName) sidebarUserName.textContent = AppState.user.name;
            if (totalWagered) totalWagered.textContent = `${AppState.user.totalWagered.toFixed(2)} TON`;
            if (totalProfit) {
                totalProfit.textContent = `${AppState.user.totalProfit.toFixed(2)} TON`;
                totalProfit.className = `stat-value profit ${AppState.user.totalProfit >= 0 ? '' : 'negative'}`;
            }
        } else {
            // Show connect button
            if (userProfile) userProfile.classList.add('hidden');
            if (connectBtn) connectBtn.classList.remove('hidden');
            if (disconnectBtn) disconnectBtn.classList.add('hidden');
            
            // Reset info
            if (userName) userName.textContent = '@cosmic_player';
            if (userBalance) userBalance.innerHTML = '<i class="fas fa-coins"></i><span>0.00 TON</span>';
            if (sidebarUserName) sidebarUserName.textContent = 'Guest Player';
            if (totalWagered) totalWagered.textContent = '0 TON';
            if (totalProfit) {
                totalProfit.textContent = '0 TON';
                totalProfit.className = 'stat-value profit';
            }
        }
    }
    
    updateWalletsGrid() {
        const walletsGrid = document.getElementById('wallets-grid');
        if (!walletsGrid) return;
        
        walletsGrid.innerHTML = '';
        
        AppState.wallets.forEach(wallet => {
            const walletCard = document.createElement('div');
            walletCard.className = 'wallet-card';
            if (wallet.isInstalled) walletCard.classList.add('installed');
            if (wallet.isPopular) walletCard.classList.add('popular');
            
            const iconClass = this.walletsManager.getWalletIcon(wallet.app_name);
            const colorClass = this.walletsManager.getWalletColor(wallet.app_name);
            
            walletCard.innerHTML = `
                <div class="wallet-icon ${colorClass}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="wallet-name">${wallet.name}</div>
                <div class="wallet-status ${wallet.isInstalled ? 'status-installed' : 'status-available'}">
                    ${wallet.isInstalled ? 'Installed' : 'Available'}
                </div>
                ${wallet.isPopular ? '<div class="wallet-badge">POPULAR</div>' : ''}
            `;
            
            walletCard.addEventListener('click', async () => {
                if (AppState.isConnecting) return;
                
                try {
                    await this.tonConnect.connect(wallet);
                } catch (error) {
                    console.error('Wallet connection error:', error);
                    this.showNotification(`Failed to connect to ${wallet.name}`, 'error');
                }
            });
            
            walletsGrid.appendChild(walletCard);
        });
        
        // Add Telegram wallet separately
        const telegramWallet = {
            app_name: 'telegram',
            name: 'Wallet in Telegram',
            isInstalled: this.walletsManager.installedWallets.has('telegram'),
            isPopular: true
        };
        
        const telegramCard = document.createElement('div');
        telegramCard.className = `wallet-card ${telegramWallet.isInstalled ? 'installed' : ''} popular`;
        telegramCard.innerHTML = `
            <div class="wallet-icon telegram">
                <i class="fab fa-telegram"></i>
            </div>
            <div class="wallet-name">Wallet in Telegram</div>
            <div class="wallet-status ${telegramWallet.isInstalled ? 'status-installed' : 'status-available'}">
                ${telegramWallet.isInstalled ? 'Installed' : 'Available'}
            </div>
            <div class="wallet-badge">TELEGRAM</div>
        `;
        
        telegramCard.addEventListener('click', () => {
            window.open('https://t.me/wallet', '_blank');
            this.showNotification('Opening Telegram Wallet...', 'info');
        });
        
        walletsGrid.prepend(telegramCard);
    }
    
    updateHeaderStats() {
        const onlineCount = document.querySelector('.stat-badge.online span');
        const volumeElement = document.querySelector('.stat-badge.volume span');
        
        if (onlineCount) {
            onlineCount.innerHTML = `<i class="fas fa-users"></i> ${CONFIG.DEMO_ONLINE_COUNT.toLocaleString()} Online`;
        }
        
        if (volumeElement) {
            volumeElement.innerHTML = `<i class="fas fa-chart-line"></i> 24h Vol: $${(CONFIG.DEMO_DAILY_VOLUME / 1000).toFixed(1)}K`;
        }
    }
    
    setupEventListeners() {
        // Connect Wallet Button
        document.getElementById('connect-wallet-btn')?.addEventListener('click', () => {
            this.openConnectModal();
        });
        
        // Disconnect Button
        document.getElementById('disconnect-btn')?.addEventListener('click', async () => {
            await this.tonConnect.disconnect();
        });
        
        // Modal Controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeConnectModal());
        });
        
        document.querySelector('.modal-overlay')?.addEventListener('click', () => {
            this.closeConnectModal();
        });
        
        // Menu Button
        document.getElementById('menu-btn')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('active');
        });
        
        // Close Sidebar
        document.querySelectorAll('.close-sidebar').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('sidebar').classList.remove('active');
            });
        });
        
        // Navigation
        document.querySelectorAll('.nav-item, .menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.hasAttribute('href') && item.getAttribute('href') !== '#') {
                    return;
                }
                
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.loadPage(page);
                    document.getElementById('sidebar').classList.remove('active');
                }
            });
        });
        
        // Quick Deposit FAB
        document.getElementById('quick-deposit')?.addEventListener('click', () => {
            if (!AppState.isConnected) {
                this.openConnectModal();
                this.showNotification('Connect wallet to deposit', 'info');
            } else {
                // Show deposit modal
                this.showNotification('Deposit feature coming soon!', 'info');
            }
        });
        
        // Theme Toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }
    
    openConnectModal() {
        const modal = document.getElementById('connect-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Generate QR code if TON Connect is initialized
            if (this.tonConnect._initialized && this.tonConnect.connector) {
                const universalLink = this.tonConnect.connector.connect({
                    bridgeUrl: 'https://bridge.tonapi.io/bridge'
                });
                this.tonConnect.generateQRCode(universalLink);
            }
        }
    }
    
    closeConnectModal() {
        const modal = document.getElementById('connect-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    async loadPage(page) {
        if (AppState.currentPage === page) return;
        
        // Update navigation
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item, .menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show page
        const pageElement = document.getElementById(`page-${page}`);
        if (pageElement) {
            pageElement.classList.add('active');
            AppState.currentPage = page;
        }
        
        // Update active nav items
        document.querySelectorAll(`[data-page="${page}"]`).forEach(item => {
            item.classList.add('active');
        });
        
        // Update nav highlight
        const navHighlight = document.querySelector('.nav-highlight');
        const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navHighlight && activeNav) {
            const navRect = activeNav.getBoundingClientRect();
            const containerRect = activeNav.parentElement.getBoundingClientRect();
            navHighlight.style.width = `${navRect.width}px`;
            navHighlight.style.transform = `translateX(${navRect.left - containerRect.left}px)`;
        }
        
        // Load page content
        await this.loadPageContent(page);
    }
    
    async loadPageContent(page) {
        const pageElement = document.getElementById(`page-${page}`);
        if (!pageElement) return;
        
        // Show loading
        pageElement.innerHTML = `
            <div class="loading-page">
                <div class="loading-spinner">
                    <i class="fas fa-rocket"></i>
                </div>
                <p>Loading ${page}...</p>
            </div>
        `;
        
        // Load page
        switch(page) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'crash':
                this.loadCrashGame();
                break;
            case 'mines':
                this.loadMinesGame();
                break;
            case 'referral':
                this.loadReferralPage();
                break;
            case 'bonuses':
                this.loadBonusesPage();
                break;
            case 'leaderboard':
                this.loadLeaderboard();
                break;
            default:
                this.loadComingSoon(page);
        }
    }
    
    async loadDashboard() {
        const page = document.getElementById('page-dashboard');
        if (!page) return;
        
        const isConnected = AppState.isConnected;
        const userName = AppState.user?.name || 'Player';
        const userBalance = AppState.user?.balance || 0;
        
        page.innerHTML = `
            <div class="dashboard">
                <div class="dashboard-header">
                    <h1>Welcome to TON ROCKET 🚀</h1>
                    <p class="subtitle">The Ultimate Crypto Casino Experience</p>
                    
                    ${!isConnected ? `
                        <div class="connect-cta">
                            <div class="cta-card">
                                <div class="cta-icon">
                                    <i class="fas fa-rocket"></i>
                                </div>
                                <div class="cta-content">
                                    <h3>Connect Your Wallet</h3>
                                    <p>Start playing and claim your welcome bonus!</p>
                                </div>
                                <button class="cta-btn" onclick="uiManager.openConnectModal()">
                                    <i class="fas fa-plug"></i>
                                    Connect Now
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-wallet"></i>
                            <h4>Your Balance</h4>
                        </div>
                        <div class="stat-value">${userBalance.toFixed(2)} TON</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>+2.5% today</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-users"></i>
                            <h4>Online Players</h4>
                        </div>
                        <div class="stat-value">${CONFIG.DEMO_ONLINE_COUNT.toLocaleString()}</div>
                        <div class="stat-change">
                            <span>Live</span>
                            <div class="pulse-dot"></div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-chart-line"></i>
                            <h4>24h Volume</h4>
                        </div>
                        <div class="stat-value">$${(CONFIG.DEMO_DAILY_VOLUME / 1000).toFixed(1)}K</div>
                        <div class="stat-change positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>+15.3%</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-trophy"></i>
                            <h4>Biggest Win</h4>
                        </div>
                        <div class="stat-value">$${(CONFIG.DEMO_BIGGEST_WIN / 1000).toFixed(1)}K</div>
                        <div class="stat-change">
                            <span>Today</span>
                        </div>
                    </div>
                </div>
                
                <div class="games-section">
                    <div class="section-header">
                        <h2>🔥 Popular Games</h2>
                        <a href="#" class="view-all" onclick="uiManager.loadPage('crash')">
                            View All <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                    
                    <div class="games-grid">
                        <div class="game-card" onclick="uiManager.loadPage('crash')">
                            <div class="game-image" style="background: linear-gradient(135deg, #6366F1, #8B5CF6);">
                                <i class="fas fa-rocket"></i>
                            </div>
                            <div class="game-info">
                                <h3>Crash</h3>
                                <p>Multiplier game with rockets</p>
                                <div class="game-stats">
                                    <span class="players">2.4k playing</span>
                                    <span class="profit positive">+18% ROI</span>
                                </div>
                            </div>
                            <div class="game-badge hot">HOT</div>
                        </div>
                        
                        <div class="game-card" onclick="uiManager.loadPage('mines')">
                            <div class="game-image" style="background: linear-gradient(135deg, #EC4899, #F472B6);">
                                <i class="fas fa-bomb"></i>
                            </div>
                            <div class="game-info">
                                <h3>Mines</h3>
                                <p>Find diamonds, avoid mines</p>
                                <div class="game-stats">
                                    <span class="players">1.8k playing</span>
                                    <span class="profit positive">+12% ROI</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="game-card" onclick="uiManager.loadPage('plinko')">
                            <div class="game-image" style="background: linear-gradient(135deg, #10B981, #34D399);">
                                <i class="fas fa-basketball-ball"></i>
                            </div>
                            <div class="game-info">
                                <h3>Plinko</h3>
                                <p>Classic drop game</p>
                                <div class="game-stats">
                                    <span class="players">1.2k playing</span>
                                    <span class="profit positive">+8% ROI</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="game-card" onclick="uiManager.loadPage('dice')">
                            <div class="game-image" style="background: linear-gradient(135deg, #F59E0B, #FBBF24);">
                                <i class="fas fa-dice"></i>
                            </div>
                            <div class="game-info">
                                <h3>Dice</h3>
                                <p>Roll and win big</p>
                                <div class="game-stats">
                                    <span class="players">956 playing</span>
                                    <span class="profit positive">+10% ROI</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${isConnected ? `
                    <div class="user-section">
                        <div class="section-header">
                            <h2>📊 Your Stats</h2>
                        </div>
                        
                        <div class="user-stats">
                            <div class="user-stat">
                                <div class="stat-icon">
                                    <i class="fas fa-chart-bar"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-label">Win Rate</div>
                                    <div class="stat-value">68.5%</div>
                                </div>
                            </div>
                            
                            <div class="user-stat">
                                <div class="stat-icon">
                                    <i class="fas fa-coins"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-label">Total Wagered</div>
                                    <div class="stat-value">${AppState.user.totalWagered.toFixed(2)} TON</div>
                                </div>
                            </div>
                            
                            <div class="user-stat">
                                <div class="stat-icon">
                                    <i class="fas fa-trophy"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-label">Biggest Win</div>
                                    <div class="stat-value">12.8 TON</div>
                                </div>
                            </div>
                            
                            <div class="user-stat">
                                <div class="stat-icon">
                                    <i class="fas fa-bolt"></i>
                                </div>
                                <div class="stat-content">
                                    <div class="stat-label">Current Streak</div>
                                    <div class="stat-value">5 Wins</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="promo-section">
                    <div class="promo-card">
                        <div class="promo-content">
                            <h3>🎁 Welcome Bonus!</h3>
                            <p>Get <strong>0.5 TON</strong> free on your first deposit</p>
                            ${!isConnected ? `
                                <button class="promo-btn" onclick="uiManager.openConnectModal()">
                                    <i class="fas fa-gift"></i>
                                    Claim Bonus
                                </button>
                            ` : `
                                <button class="promo-btn" onclick="uiManager.claimBonus()">
                                    <i class="fas fa-gift"></i>
                                    Claim Now
                                </button>
                            `}
                        </div>
                        <div class="promo-image">
                            <i class="fas fa-rocket"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add dashboard styles
        this.addDashboardStyles();
    }
    
    addDashboardStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .dashboard {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .dashboard-header {
                text-align: center;
                margin-bottom: var(--space-2xl);
            }
            
            .dashboard-header h1 {
                font-size: 48px;
                font-weight: 900;
                background: var(--gradient-primary);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: var(--space-sm);
                font-family: 'Space Grotesk', sans-serif;
            }
            
            .dashboard-header .subtitle {
                font-size: 18px;
                color: var(--text-secondary);
                font-weight: 500;
                margin-bottom: var(--space-xl);
            }
            
            .connect-cta {
                max-width: 600px;
                margin: 0 auto;
            }
            
            .cta-card {
                background: var(--gradient-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-xl);
                padding: var(--space-xl);
                display: flex;
                align-items: center;
                gap: var(--space-xl);
                box-shadow: var(--shadow-glow);
            }
            
            .cta-icon {
                width: 80px;
                height: 80px;
                background: var(--gradient-primary);
                border-radius: var(--radius-lg);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .cta-icon i {
                font-size: 32px;
                color: white;
            }
            
            .cta-content {
                flex: 1;
            }
            
            .cta-content h3 {
                font-size: 24px;
                font-weight: 800;
                color: var(--text-primary);
                margin-bottom: var(--space-xs);
            }
            
            .cta-content p {
                font-size: 14px;
                color: var(--text-secondary);
            }
            
            .cta-btn {
                background: var(--gradient-primary);
                border: none;
                border-radius: var(--radius-lg);
                padding: 16px 32px;
                color: white;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                transition: all var(--transition-fast);
                white-space: nowrap;
            }
            
            .cta-btn:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-glow-lg);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--space-lg);
                margin-bottom: var(--space-2xl);
            }
            
            @media (max-width: 1200px) {
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 640px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
            }
            
            .stat-card {
                background: var(--gradient-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: var(--space-xl);
                transition: all var(--transition-fast);
            }
            
            .stat-card:hover {
                border-color: var(--primary);
                transform: translateY(-4px);
                box-shadow: var(--shadow-glow);
            }
            
            .stat-header {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                margin-bottom: var(--space-lg);
            }
            
            .stat-header i {
                font-size: 20px;
                color: var(--primary);
            }
            
            .stat-header h4 {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .stat-value {
                font-size: 32px;
                font-weight: 800;
                color: var(--text-primary);
                margin-bottom: var(--space-sm);
                line-height: 1;
            }
            
            .stat-change {
                display: flex;
                align-items: center;
                gap: var(--space-xs);
                font-size: 12px;
                font-weight: 600;
            }
            
            .stat-change.positive {
                color: var(--success);
            }
            
            .stat-change .pulse-dot {
                width: 8px;
                height: 8px;
                background: var(--success);
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
            }
            
            .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-xl);
            }
            
            .section-header h2 {
                font-size: 24px;
                font-weight: 800;
                color: var(--text-primary);
            }
            
            .view-all {
                display: flex;
                align-items: center;
                gap: var(--space-xs);
                color: var(--primary);
                text-decoration: none;
                font-size: 14px;
                font-weight: 600;
                transition: all var(--transition-fast);
            }
            
            .view-all:hover {
                gap: var(--space-sm);
            }
            
            .games-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--space-lg);
                margin-bottom: var(--space-2xl);
            }
            
            @media (max-width: 1200px) {
                .games-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 640px) {
                .games-grid {
                    grid-template-columns: 1fr;
                }
            }
            
            .game-card {
                background: var(--gradient-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-xl);
                padding: var(--space-lg);
                cursor: pointer;
                transition: all var(--transition-fast);
                position: relative;
                overflow: hidden;
            }
            
            .game-card:hover {
                border-color: var(--primary);
                transform: translateY(-8px);
                box-shadow: var(--shadow-glow-lg);
            }
            
            .game-image {
                width: 64px;
                height: 64px;
                border-radius: var(--radius-lg);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: var(--space-lg);
            }
            
            .game-image i {
                font-size: 28px;
                color: white;
            }
            
            .game-info h3 {
                font-size: 20px;
                font-weight: 800;
                color: var(--text-primary);
                margin-bottom: var(--space-xs);
            }
            
            .game-info p {
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: var(--space-md);
            }
            
            .game-stats {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                font-weight: 600;
            }
            
            .game-stats .players {
                color: var(--text-secondary);
            }
            
            .game-stats .profit {
                color: var(--success);
            }
            
            .game-badge {
                position: absolute;
                top: var(--space-lg);
                right: var(--space-lg);
                background: var(--gradient-primary);
                color: white;
                font-size: 10px;
                font-weight: 800;
                padding: 4px 10px;
                border-radius: var(--radius-full);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .game-badge.hot {
                background: linear-gradient(135deg, #EF4444, #F59E0B);
            }
            
            .user-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--space-lg);
                margin-bottom: var(--space-2xl);
            }
            
            @media (max-width: 1200px) {
                .user-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 640px) {
                .user-stats {
                    grid-template-columns: 1fr;
                }
            }
            
            .user-stat {
                background: var(--gradient-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: var(--space-xl);
                display: flex;
                align-items: center;
                gap: var(--space-lg);
            }
            
            .stat-icon {
                width: 48px;
                height: 48px;
                background: rgba(99, 102, 241, 0.1);
                border-radius: var(--radius-lg);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .stat-icon i {
                font-size: 20px;
                color: var(--primary);
            }
            
            .stat-content {
                flex: 1;
            }
            
            .stat-label {
                font-size: 12px;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: var(--space-xs);
            }
            
            .stat-content .stat-value {
                font-size: 20px;
                font-weight: 800;
                color: var(--text-primary);
                margin: 0;
            }
            
            .promo-card {
                background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%);
                border-radius: var(--radius-xl);
                padding: var(--space-2xl);
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                overflow: hidden;
            }
            
            .promo-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--gradient-glow);
                animation: slideGlow 3s ease-in-out infinite;
            }
            
            .promo-content {
                position: relative;
                z-index: 1;
                flex: 1;
            }
            
            .promo-content h3 {
                font-size: 32px;
                font-weight: 900;
                color: white;
                margin-bottom: var(--space-sm);
            }
            
            .promo-content p {
                font-size: 18px;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: var(--space-xl);
            }
            
            .promo-btn {
                background: white;
                color: var(--primary);
                border: none;
                border-radius: var(--radius-lg);
                padding: 16px 32px;
                font-size: 16px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: var(--space-sm);
                transition: all var(--transition-fast);
            }
            
            .promo-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(255, 255, 255, 0.3);
            }
            
            .promo-image {
                position: relative;
                z-index: 1;
                width: 120px;
                height: 120px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: var(--radius-xl);
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            }
            
            .promo-image i {
                font-size: 48px;
                color: white;
                animation: rocketLaunch 2s ease-in-out infinite;
            }
            
            .loading-page {
                text-align: center;
                padding: var(--space-2xl);
                color: var(--text-secondary);
            }
            
            .loading-spinner {
                width: 80px;
                height: 80px;
                margin: 0 auto var(--space-lg);
                position: relative;
            }
            
            .loading-spinner i {
                font-size: 48px;
                color: var(--primary);
                animation: rocketLaunch 2s ease-in-out infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    loadCrashGame() {
        const page = document.getElementById('page-crash');
        if (!page) return;
        
        page.innerHTML = `
            <div class="game-page">
                <div class="game-header">
                    <h1>🚀 Crash Game</h1>
                    <p>Place your bet and watch the rocket fly!</p>
                </div>
                
                ${!AppState.isConnected ? `
                    <div class="connect-required">
                        <div class="connect-card">
                            <i class="fas fa-wallet"></i>
                            <h3>Connect Your Wallet</h3>
                            <p>You need to connect a TON wallet to play Crash</p>
                            <button class="connect-btn" onclick="uiManager.openConnectModal()">
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="game-coming-soon">
                        <div class="coming-soon-card">
                            <i class="fas fa-tools"></i>
                            <h3>Game Under Development</h3>
                            <p>Crash game is coming soon! Stay tuned for launch.</p>
                            <div class="countdown">
                                <div class="countdown-item">
                                    <span class="number">00</span>
                                    <span class="label">Days</span>
                                </div>
                                <div class="countdown-item">
                                    <span class="number">00</span>
                                    <span class="label">Hours</span>
                                </div>
                                <div class="countdown-item">
                                    <span class="number">00</span>
                                    <span class="label">Minutes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
    
    loadMinesGame() {
        const page = document.getElementById('page-mines');
        if (!page) return;
        
        page.innerHTML = `
            <div class="game-page">
                <div class="game-header">
                    <h1>💣 Mines Game</h1>
                    <p>Find diamonds and avoid the mines!</p>
                </div>
                
                ${!AppState.isConnected ? `
                    <div class="connect-required">
                        <div class="connect-card">
                            <i class="fas fa-wallet"></i>
                            <h3>Connect Your Wallet</h3>
                            <p>You need to connect a TON wallet to play Mines</p>
                            <button class="connect-btn" onclick="uiManager.openConnectModal()">
                                Connect Wallet
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="game-coming-soon">
                        <div class="coming-soon-card">
                            <i class="fas fa-tools"></i>
                            <h3>Game Under Development</h3>
                            <p>Mines game is coming soon! Stay tuned for launch.</p>
                            <div class="countdown">
                                <div class="countdown-item">
                                    <span class="number">00</span>
                                    <span class="label">Days</span>
                                </div>
                                <div class="countdown-item">
                                    <span class="number">00</span>
                                    <span class="label">Hours</span>
                                </div>
                                <div class="countdown-item">
                                    <span class="number">00</span>
                                    <span class="label">Minutes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
    
    loadReferralPage() {
        const page = document.getElementById('page-referral');
        if (!page) return;
        
        const referralCode = AppState.user?.referralCode || 'CONNECT-WALLET';
        
        page.innerHTML = `
            <div class="referral-page">
                <div class="page-header">
                    <h1>👥 Referral Program</h1>
                    <p>Earn 5% commission from your friends' bets</p>
                </div>
                
                <div class="referral-stats">
                    <div class="referral-stat-card">
                        <i class="fas fa-users"></i>
                        <div class="stat-content">
                            <div class="stat-value">0</div>
                            <div class="stat-label">Total Referrals</div>
                        </div>
                    </div>
                    
                    <div class="referral-stat-card">
                        <i class="fas fa-coins"></i>
                        <div class="stat-content">
                            <div class="stat-value">0 TON</div>
                            <div class="stat-label">Total Earned</div>
                        </div>
                    </div>
                    
                    <div class="referral-stat-card">
                        <i class="fas fa-clock"></i>
                        <div class="stat-content">
                            <div class="stat-value">0 TON</div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                </div>
                
                <div class="referral-code-section">
                    <h3>Your Referral Code</h3>
                    <div class="code-display">
                        <code>${referralCode}</code>
                        <button class="copy-btn" onclick="copyToClipboard('${referralCode}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="referral-link-section">
                    <h3>Your Referral Link</h3>
                    <div class="link-display">
                        <span>https://tonrocket.com/ref/${referralCode}</span>
                        <button class="copy-btn" onclick="copyToClipboard('https://tonrocket.com/ref/${referralCode}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    loadBonusesPage() {
        const page = document.getElementById('page-bonuses');
        if (!page) return;
        
        page.innerHTML = `
            <div class="bonuses-page">
                <div class="page-header">
                    <h1>🎁 Bonuses & Rewards</h1>
                    <p>Claim your bonuses and boost your balance</p>
                </div>
                
                <div class="bonuses-grid">
                    <div class="bonus-card large">
                        <div class="bonus-header">
                            <i class="fas fa-calendar-day"></i>
                            <div class="bonus-info">
                                <h3>Daily Bonus</h3>
                                <p>Claim every 24 hours</p>
                            </div>
                        </div>
                        <div class="bonus-amount">
                            <span class="amount">0.1 TON</span>
                            <span class="hint">+0.01 TON per streak day</span>
                        </div>
                        <button class="claim-btn" ${!AppState.isConnected ? 'disabled' : ''}>
                            ${AppState.isConnected ? 'Claim Now' : 'Connect to Claim'}
                        </button>
                    </div>
                    
                    <div class="bonus-card">
                        <div class="bonus-icon">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <div class="bonus-content">
                            <h4>Referral Bonus</h4>
                            <p>0.5 TON per friend</p>
                        </div>
                        <div class="bonus-status available">Available</div>
                    </div>
                    
                    <div class="bonus-card">
                        <div class="bonus-icon">
                            <i class="fas fa-gift"></i>
                        </div>
                        <div class="bonus-content">
                            <h4>Welcome Bonus</h4>
                            <p>0.5 TON on first deposit</p>
                        </div>
                        <div class="bonus-status ${AppState.isConnected ? 'claimed' : 'available'}">
                            ${AppState.isConnected ? 'Claimed' : 'Available'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    loadLeaderboard() {
        const page = document.getElementById('page-leaderboard');
        if (!page) return;
        
        page.innerHTML = `
            <div class="leaderboard-page">
                <div class="page-header">
                    <h1>🏆 Leaderboard</h1>
                    <p>Top players this week</p>
                </div>
                
                <div class="leaderboard-table">
                    <div class="table-header">
                        <div class="rank-col">Rank</div>
                        <div class="player-col">Player</div>
                        <div class="profit-col">Profit</div>
                    </div>
                    
                    <div class="table-body">
                        ${Array.from({length: 10}, (_, i) => `
                            <div class="table-row ${i < 3 ? 'top-three' : ''}">
                                <div class="rank-col">
                                    <span class="rank-number">${i + 1}</span>
                                    ${i < 3 ? '<span class="rank-medal">🏅</span>' : ''}
                                </div>
                                <div class="player-col">
                                    <div class="player-info">
                                        <div class="player-avatar">${String.fromCharCode(65 + i)}</div>
                                        <div class="player-name">Player${i + 1}</div>
                                    </div>
                                </div>
                                <div class="profit-col">
                                    <span class="profit-value positive">+${(Math.random() * 100).toFixed(2)} TON</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    loadComingSoon(page) {
        const pageElement = document.getElementById(`page-${page}`);
        if (!pageElement) return;
        
        pageElement.innerHTML = `
            <div class="coming-soon">
                <div class="coming-soon-content">
                    <i class="fas fa-rocket"></i>
                    <h2>Coming Soon</h2>
                    <p>The ${page} page is under development</p>
                    <button class="back-btn" onclick="uiManager.loadPage('dashboard')">
                        <i class="fas fa-arrow-left"></i>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.toUpperCase()}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    toggleTheme() {
        AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', AppState.theme);
        
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            if (AppState.theme === 'dark') {
                themeBtn.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
            } else {
                themeBtn.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
            }
        }
        
        this.showNotification(`Switched to ${AppState.theme} mode`, 'info');
    }
    
    claimBonus() {
        if (!AppState.isConnected) {
            this.openConnectModal();
            return;
        }
        
        this.showNotification('Welcome bonus claimed! +0.5 TON', 'success');
        // In real app, call backend API
    }
}

// ===== HELPER FUNCTIONS =====
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => uiManager.showNotification('Copied to clipboard!', 'success'))
        .catch(err => uiManager.showNotification('Failed to copy', 'error'));
}

// ===== GLOBAL EXPORTS =====
window.uiManager = new UIManager();
window.copyToClipboard = copyToClipboard;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    uiManager.initialize();
});

// Add theme attribute
document.documentElement.setAttribute('data-theme', 'dark');
