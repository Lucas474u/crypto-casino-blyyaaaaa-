// ===== CONFIGURATION =====
const CONFIG = {
    // TON Connect Configuration
    MANIFEST_URL: 'https://crypto-casino-blyyaaaaa.vercel.app/tonconnect-manifest.json',
    WALLETS_LIST_URL: 'https://raw.githubusercontent.com/ton-connect/wallets-list/main/wallets.json',
    
    // API Endpoints
    TON_API_URL: 'https://toncenter.com/api/v2',
    TON_API_KEY: '045d99debf6b8527dee4f34cb22347fec997027bf8770923b247cbd8a974e49c',
    
    // App Configuration
    APP_NAME: 'TON Rocket Casino',
    APP_VERSION: '1.0.0',
    
    // Default State
    DEFAULT_LANGUAGE: 'en',
    
    // Demo Data
    DEMO_ONLINE_COUNT: 1247,
    DEMO_DAILY_VOLUME: 12458
};

// ===== STATE MANAGEMENT =====
const AppState = {
    // User State
    user: null,
    wallet: null,
    balance: 0,
    isConnected: false,
    
    // App State
    language: CONFIG.DEFAULT_LANGUAGE,
    currentPage: 'dashboard',
    isLoading: false,
    
    // Wallets List
    wallets: [],
    installedWallets: [],
    
    // TON Connect
    connector: null,
    tonConnectUI: null
};

// ===== WALLET INTEGRATION =====
class WalletIntegration {
    constructor() {
        this.walletList = [];
        this.installedWallets = new Set();
    }
    
    // Check for installed wallets
    async detectInstalledWallets() {
        const installed = new Set();
        
        // Check for Tonkeeper
        if (window.tonkeeper) {
            installed.add('tonwallet');
        }
        
        // Check for MyTonWallet
        if (window.ton) {
            installed.add('mytonwallet');
        }
        
        // Check for Bitget Wallet
        if (window.bitkeep || window.bitget) {
            installed.add('bitget');
        }
        
        // Check for Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            installed.add('telegram-wallet');
        }
        
        // Check browser extensions
        try {
            // Tonkeeper Extension
            if (typeof window.tonkeeper !== 'undefined') {
                installed.add('tonkeeper-ext');
            }
        } catch (e) {}
        
        this.installedWallets = installed;
        return Array.from(installed);
    }
    
    // Get wallet details by name
    getWalletDetails(name) {
        const wallets = {
            'tonwallet': {
                name: 'Tonkeeper',
                icon: 'fas fa-shield-alt',
                color: '#007AFF',
                universalUrl: 'https://app.tonkeeper.com/ton-connect',
                isInstalled: this.installedWallets.has('tonwallet'),
                isPopular: true
            },
            'telegram-wallet': {
                name: 'Wallet in Telegram',
                icon: 'fab fa-telegram',
                color: '#0088CC',
                universalUrl: 'https://t.me/wallet',
                isInstalled: this.installedWallets.has('telegram-wallet'),
                isPopular: false
            },
            'mytonwallet': {
                name: 'MyTonWallet',
                icon: 'fas fa-wallet',
                color: '#5856D6',
                universalUrl: 'https://connect.mytonwallet.org',
                isInstalled: this.installedWallets.has('mytonwallet'),
                isPopular: false
            },
            'tonhub': {
                name: 'Tonhub',
                icon: 'fas fa-cloud',
                color: '#34C759',
                universalUrl: 'https://tonhub.com/connect',
                isInstalled: false,
                isPopular: false
            },
            'bitget': {
                name: 'Bitget Wallet',
                icon: 'fas fa-exchange-alt',
                color: '#FF9500',
                universalUrl: 'https://web3.bitget.com/ton-connect',
                isInstalled: this.installedWallets.has('bitget'),
                isPopular: false
            },
            'openmask': {
                name: 'OpenMask',
                icon: 'fas fa-mask',
                color: '#FF3B30',
                universalUrl: 'https://openmask.io/connect',
                isInstalled: false,
                isPopular: false
            }
        };
        
        return wallets[name] || {
            name: name,
            icon: 'fas fa-wallet',
            color: '#8E8E93',
            universalUrl: null,
            isInstalled: false,
            isPopular: false
        };
    }
    
    // Get all available wallets
    async getAvailableWallets() {
        try {
            const response = await fetch(CONFIG.WALLETS_LIST_URL);
            const data = await response.json();
            
            // Filter and map wallets
            const availableWallets = data
                .filter(wallet => wallet.bridge && wallet.bridge.length > 0)
                .map(wallet => ({
                    id: wallet.app_name,
                    name: wallet.name,
                    image: wallet.image,
                    about_url: wallet.about_url,
                    universal_url: wallet.universal_url,
                    bridge: wallet.bridge,
                    platforms: wallet.platforms,
                    isInstalled: this.installedWallets.has(wallet.app_name)
                }));
            
            return availableWallets;
        } catch (error) {
            console.error('Failed to fetch wallets list:', error);
            return this.getFallbackWallets();
        }
    }
    
    // Fallback wallets if API fails
    getFallbackWallets() {
        const wallets = [
            'tonwallet',
            'telegram-wallet',
            'mytonwallet',
            'tonhub',
            'bitget',
            'openmask'
        ];
        
        return wallets.map(name => {
            const details = this.getWalletDetails(name);
            return {
                id: name,
                name: details.name,
                isInstalled: details.isInstalled,
                isPopular: details.isPopular,
                universal_url: details.universalUrl
            };
        });
    }
}

// ===== TON CONNECT INTEGRATION =====
class TONConnectIntegration {
    constructor() {
        this.connector = null;
        this.tonConnectUI = null;
        this.wallet = null;
        this.isInitialized = false;
    }
    
    // Initialize TON Connect
    async initialize() {
        try {
            console.log('Initializing TON Connect...');
            
            // Check if TON Connect UI is available
            if (typeof TON_CONNECT_UI === 'undefined') {
                throw new Error('TON Connect UI not loaded');
            }
            
            // Create manifest
            const manifest = {
                url: window.location.origin,
                name: CONFIG.APP_NAME,
                iconUrl: 'https://ton-rocket-casino.vercel.app/icon.png',
                termsOfUseUrl: 'https://ton-rocket-casino.vercel.app/terms',
                privacyPolicyUrl: 'https://ton-rocket-casino.vercel.app/privacy'
            };
            
            // Initialize TON Connect UI
            this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                manifest: manifest,
                buttonRootId: 'tonconnect-button',
                language: AppState.language,
                uiPreferences: {
                    theme: 'DARK',
                    colorsSet: {
                        [TON_CONNECT_UI.COLORS.CONNECT_BUTTON]: CONFIG.PRIMARY_COLOR,
                        [TON_CONNECT_UI.COLORS.CONNECT_BUTTON_TEXT]: '#FFFFFF',
                        [TON_CONNECT_UI.COLORS.MODAL_BACKGROUND]: '#1C1C1E',
                        [TON_CONNECT_UI.COLORS.MODAL_TEXT]: '#FFFFFF'
                    }
                },
                actionsConfiguration: {
                    twaReturnUrl: 'https://t.me/tonrocket_bot'
                }
            });
            
            this.connector = this.tonConnectUI.connector;
            this.isInitialized = true;
            
            console.log('TON Connect initialized successfully');
            
            // Subscribe to connection status changes
            this.connector.onStatusChange(async (wallet) => {
                console.log('Wallet status changed:', wallet);
                
                if (wallet) {
                    await this.handleWalletConnected(wallet);
                } else {
                    this.handleWalletDisconnected();
                }
            });
            
            // Check existing connection
            if (this.connector.connected) {
                const wallet = this.connector.wallet;
                if (wallet) {
                    await this.handleWalletConnected(wallet);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('TON Connect initialization failed:', error);
            this.isInitialized = false;
            return false;
        }
    }
    
    // Handle wallet connection
    async handleWalletConnected(wallet) {
        try {
            console.log('Wallet connected:', wallet);
            
            AppState.wallet = wallet;
            AppState.isConnected = true;
            
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
            
            // Close connect modal
            closeConnectModal();
            
            // Show success notification
            showNotification('Wallet connected successfully!', 'success');
            
            // Update balance
            await this.updateWalletBalance();
            
            // Navigate to dashboard if not already
            if (AppState.currentPage === 'dashboard') {
                updateDashboard();
            }
            
            // Save connection state
            this.saveConnectionState();
            
        } catch (error) {
            console.error('Error handling wallet connection:', error);
            showNotification('Error processing wallet connection', 'error');
        }
    }
    
    // Handle wallet disconnection
    handleWalletDisconnected() {
        console.log('Wallet disconnected');
        
        AppState.wallet = null;
        AppState.user = null;
        AppState.isConnected = false;
        
        // Update UI
        updateUserDisplay();
        
        // Clear connection state
        this.clearConnectionState();
        
        showNotification('Wallet disconnected', 'info');
    }
    
    // Connect to specific wallet
    async connectToWallet(walletId) {
        if (!this.isInitialized || !this.tonConnectUI) {
            showNotification('TON Connect not initialized', 'error');
            return;
        }
        
        try {
            console.log('Connecting to wallet:', walletId);
            
            // Show loading state
            showNotification(`Connecting to ${walletId}...`, 'info');
            
            // Use TON Connect UI to connect
            await this.tonConnectUI.connectWallet();
            
        } catch (error) {
            console.error('Failed to connect to wallet:', error);
            
            // If TON Connect fails, try universal link
            const wallet = walletIntegration.getWalletDetails(walletId);
            if (wallet.universalUrl) {
                this.openUniversalLink(wallet.universalUrl, wallet.name);
            } else {
                showNotification(`Failed to connect to ${walletId}`, 'error');
            }
        }
    }
    
    // Open universal link for wallet
    openUniversalLink(url, walletName) {
        if (!url) return;
        
        // Generate TON Connect deep link
        const tonConnectLink = `${url}?v=2&id=${Date.now()}&ret=back`;
        
        // Open in new window
        window.open(tonConnectLink, '_blank', 'noopener,noreferrer');
        
        showNotification(`Please confirm connection in ${walletName}`, 'info');
    }
    
    // Disconnect wallet
    async disconnectWallet() {
        if (!this.isInitialized || !this.tonConnectUI) return;
        
        try {
            await this.tonConnectUI.disconnect();
            this.handleWalletDisconnected();
        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
            showNotification('Failed to disconnect wallet', 'error');
        }
    }
    
    // Update wallet balance
    async updateWalletBalance() {
        if (!AppState.wallet || !AppState.user) return;
        
        try {
            const address = AppState.wallet.account.address;
            const response = await fetch(`${CONFIG.TON_API_URL}/getAddressBalance?address=${address}&api_key=${CONFIG.TON_API_KEY}`);
            const data = await response.json();
            
            if (data.ok) {
                // Convert nanoTON to TON
                AppState.user.balance = parseFloat(data.result) / 1000000000;
                updateUserDisplay();
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            // Use demo balance
            AppState.user.balance = 5.2;
            updateUserDisplay();
        }
    }
    
    // Generate QR code for wallet connection
    async generateQRCode() {
        if (!this.isInitialized || !this.connector) return;
        
        try {
            const connectionSource = this.connector.connect({
                bridgeUrl: 'https://bridge.tonapi.io/bridge'
            });
            
            const { link, universalLink } = connectionSource;
            
            // Generate QR code
            const qrContainer = document.getElementById('qr-container');
            if (qrContainer) {
                qrContainer.innerHTML = '';
                
                // Create QR code
                const qrCode = document.createElement('div');
                qrCode.id = 'tonconnect-qr';
                
                // Initialize QR code
                QRCode.toCanvas(qrCode, link, {
                    width: 180,
                    height: 180,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, function(error) {
                    if (error) {
                        console.error('QR code generation failed:', error);
                        showQRPlaceholder();
                    }
                });
                
                qrContainer.appendChild(qrCode);
            }
            
            return { link, universalLink };
            
        } catch (error) {
            console.error('QR code generation failed:', error);
            showQRPlaceholder();
            return null;
        }
    }
    
    // Helper functions
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
    
    saveConnectionState() {
        localStorage.setItem('ton_connect_state', JSON.stringify({
            isConnected: true,
            address: AppState.wallet?.account?.address,
            timestamp: Date.now()
        }));
    }
    
    clearConnectionState() {
        localStorage.removeItem('ton_connect_state');
    }
    
    loadConnectionState() {
        const saved = localStorage.getItem('ton_connect_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.isConnected && state.address) {
                    return state;
                }
            } catch (e) {
                console.error('Failed to load connection state:', e);
            }
        }
        return null;
    }
}

// ===== UI UPDATES =====
function updateUserDisplay() {
    const userProfile = document.getElementById('user-profile');
    const connectBtn = document.getElementById('connect-wallet-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const userName = document.getElementById('user-name');
    const userBalance = document.getElementById('user-balance');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const totalWagered = document.getElementById('total-wagered');
    const totalProfit = document.getElementById('total-profit');
    
    if (AppState.isConnected && AppState.user) {
        // Show user profile, hide connect button
        if (userProfile) userProfile.classList.remove('hidden');
        if (connectBtn) connectBtn.classList.add('hidden');
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
        
        // Update user info
        if (userName) userName.textContent = `@${AppState.user.name}`;
        if (userBalance) userBalance.textContent = `${AppState.user.balance.toFixed(2)} TON`;
        if (sidebarUserName) sidebarUserName.textContent = AppState.user.name;
        if (totalWagered) totalWagered.textContent = `${AppState.user.totalWagered.toFixed(2)} TON`;
        if (totalProfit) {
            totalProfit.textContent = `${AppState.user.totalProfit.toFixed(2)} TON`;
            totalProfit.className = `stat-value profit ${AppState.user.totalProfit >= 0 ? '' : 'negative'}`;
        }
        
    } else {
        // Show connect button, hide user profile
        if (userProfile) userProfile.classList.add('hidden');
        if (connectBtn) connectBtn.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
        
        // Reset user info
        if (userName) userName.textContent = '@player';
        if (userBalance) userBalance.textContent = '0 TON';
        if (sidebarUserName) sidebarUserName.textContent = 'Guest';
        if (totalWagered) totalWagered.textContent = '0 TON';
        if (totalProfit) {
            totalProfit.textContent = '0 TON';
            totalProfit.className = 'stat-value profit';
        }
    }
}

function updateWalletsGrid() {
    const walletsGrid = document.getElementById('wallets-grid');
    if (!walletsGrid) return;
    
    // Clear loading state
    walletsGrid.innerHTML = '';
    
    // Add wallet cards
    AppState.wallets.forEach(wallet => {
        const walletCard = document.createElement('div');
        walletCard.className = 'wallet-card';
        if (wallet.isInstalled) walletCard.classList.add('installed');
        if (wallet.isPopular) walletCard.classList.add('popular');
        
        const walletDetails = walletIntegration.getWalletDetails(wallet.id);
        
        walletCard.innerHTML = `
            <div class="wallet-icon" style="background: ${walletDetails.color}">
                <i class="${walletDetails.icon}"></i>
            </div>
            <div class="wallet-name">${walletDetails.name}</div>
            <div class="wallet-status ${wallet.isInstalled ? 'status-installed' : 'status-available'}">
                ${wallet.isInstalled ? 'Installed' : 'Available'}
            </div>
            ${wallet.isPopular ? '<div class="wallet-badge popular">Popular</div>' : ''}
        `;
        
        walletCard.addEventListener('click', () => {
            tonConnectIntegration.connectToWallet(wallet.id);
        });
        
        walletsGrid.appendChild(walletCard);
    });
}

function showQRPlaceholder() {
    const qrContainer = document.getElementById('qr-container');
    if (qrContainer) {
        qrContainer.innerHTML = `
            <div class="qr-placeholder">
                <i class="fas fa-qrcode"></i>
                <p>QR code generation failed</p>
            </div>
        `;
    }
}

// ===== MODAL CONTROLS =====
function openConnectModal() {
    const modal = document.getElementById('connect-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Generate QR code
        if (tonConnectIntegration.isInitialized) {
            tonConnectIntegration.generateQRCode();
        }
        
        // Update wallets list
        updateWalletsGrid();
    }
}

function closeConnectModal() {
    const modal = document.getElementById('connect-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===== NAVIGATION =====
function navigateTo(page) {
    if (AppState.currentPage === page) return;
    
    // Update active state
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item, .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show new page
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
        AppState.currentPage = page;
    }
    
    // Update navigation items
    document.querySelectorAll(`[data-page="${page}"]`).forEach(item => {
        item.classList.add('active');
    });
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
    
    // Load page content
    loadPageContent(page);
}

async function loadPageContent(page) {
    const pageElement = document.getElementById(`page-${page}`);
    if (!pageElement) return;
    
    // Show loading state
    pageElement.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>Loading ${page}...</p>
        </div>
    `;
    
    // Load page specific content
    switch(page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'crash':
            loadCrashGame();
            break;
        case 'mines':
            loadMinesGame();
            break;
        case 'plinko':
            loadPlinkoGame();
            break;
        case 'dice':
            loadDiceGame();
            break;
        case 'referral':
            loadReferralPage();
            break;
        case 'bonuses':
            loadBonusesPage();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'support':
            loadSupportPage();
            break;
    }
}

// ===== PAGE CONTENT =====
async function loadDashboard() {
    const page = document.getElementById('page-dashboard');
    if (!page) return;
    
    page.innerHTML = `
        <div class="dashboard-container">
            <div class="welcome-section">
                <h1>Welcome to TON Rocket 🚀</h1>
                <p class="subtitle">Premium casino experience on TON blockchain</p>
                
                ${!AppState.isConnected ? `
                    <div class="connect-promo">
                        <p>Connect your wallet to start playing and claim your welcome bonus!</p>
                        <button class="connect-promo-btn" onclick="openConnectModal()">
                            <i class="fas fa-bolt"></i>
                            Connect Wallet Now
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="stats-cards">
                <div class="stat-card-large">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${CONFIG.DEMO_ONLINE_COUNT.toLocaleString()}</div>
                        <div class="stat-label">Players Online</div>
                    </div>
                </div>
                
                <div class="stat-card-large">
                    <div class="stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${CONFIG.DEMO_DAILY_VOLUME.toLocaleString()} TON</div>
                        <div class="stat-label">Daily Volume</div>
                    </div>
                </div>
            </div>
            
            <div class="games-grid">
                <h2 class="section-title">Popular Games</h2>
                <div class="games-list">
                    <div class="game-card" onclick="navigateTo('crash')">
                        <div class="game-icon" style="background: var(--gradient-primary)">
                            <i class="fas fa-rocket"></i>
                        </div>
                        <div class="game-info">
                            <h3>Crash</h3>
                            <p>Multiplier game</p>
                            <div class="game-stats">
                                <span class="online">1.2k playing</span>
                                <span class="profit">+15% ROI</span>
                            </div>
                        </div>
                        <div class="game-badge hot">HOT</div>
                    </div>
                    
                    <div class="game-card" onclick="navigateTo('mines')">
                        <div class="game-icon" style="background: var(--gradient-warning)">
                            <i class="fas fa-bomb"></i>
                        </div>
                        <div class="game-info">
                            <h3>Mines</h3>
                            <p>Strategy game</p>
                            <div class="game-stats">
                                <span class="online">856 playing</span>
                                <span class="profit">+12% ROI</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="game-card" onclick="navigateTo('plinko')">
                        <div class="game-icon" style="background: var(--gradient-success)">
                            <i class="fas fa-basketball-ball"></i>
                        </div>
                        <div class="game-info">
                            <h3>Plinko</h3>
                            <p>Luck-based game</p>
                            <div class="game-stats">
                                <span class="online">642 playing</span>
                                <span class="profit">+8% ROI</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="game-card" onclick="navigateTo('dice')">
                        <div class="game-icon" style="background: var(--gradient-danger)">
                            <i class="fas fa-dice"></i>
                        </div>
                        <div class="game-info">
                            <h3>Dice</h3>
                            <p>Classic dice game</p>
                            <div class="game-stats">
                                <span class="online">458 playing</span>
                                <span class="profit">+10% ROI</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${AppState.isConnected ? `
                <div class="user-stats">
                    <h2 class="section-title">Your Statistics</h2>
                    <div class="stats-grid">
                        <div class="user-stat">
                            <div class="stat-label">Total Bets</div>
                            <div class="stat-value">42</div>
                        </div>
                        <div class="user-stat">
                            <div class="stat-label">Win Rate</div>
                            <div class="stat-value success">65%</div>
                        </div>
                        <div class="user-stat">
                            <div class="stat-label">Biggest Win</div>
                            <div class="stat-value">12.5 TON</div>
                        </div>
                        <div class="user-stat">
                            <div class="stat-label">Current Streak</div>
                            <div class="stat-value warning">3 Wins</div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="promo-banner">
                <div class="promo-content">
                    <h3>🎁 Welcome Bonus!</h3>
                    <p>Get 0.5 TON free on your first deposit</p>
                    ${!AppState.isConnected ? `
                        <button class="promo-btn" onclick="openConnectModal()">
                            Claim Bonus
                        </button>
                    ` : `
                        <button class="promo-btn" onclick="claimWelcomeBonus()">
                            Claim Now
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    // Add CSS for dashboard
    const style = document.createElement('style');
    style.textContent = `
        .dashboard-container {
            padding: var(--spacing-sm);
        }
        
        .welcome-section {
            text-align: center;
            margin-bottom: var(--spacing-xl);
            padding: var(--spacing-lg);
            background: var(--gradient-primary);
            border-radius: var(--radius-lg);
            color: white;
        }
        
        .welcome-section h1 {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: var(--spacing-xs);
        }
        
        .welcome-section .subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: var(--spacing-lg);
        }
        
        .connect-promo {
            background: rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            backdrop-filter: blur(10px);
        }
        
        .connect-promo p {
            margin-bottom: var(--spacing-md);
            font-size: 14px;
        }
        
        .connect-promo-btn {
            background: white;
            color: var(--primary);
            border: none;
            padding: 12px 24px;
            border-radius: var(--radius-full);
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-sm);
            transition: all var(--transition-fast);
        }
        
        .connect-promo-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-xl);
        }
        
        .stat-card-large {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--spacing-lg);
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }
        
        .stat-icon {
            width: 48px;
            height: 48px;
            background: var(--gradient-primary);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .stat-icon i {
            font-size: 20px;
            color: white;
        }
        
        .stat-content .stat-value {
            font-size: 24px;
            font-weight: 800;
            color: var(--text-primary);
            line-height: 1;
            margin-bottom: 4px;
        }
        
        .stat-content .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--spacing-md);
        }
        
        .games-list {
            display: grid;
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-xl);
        }
        
        .game-card {
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
            padding: var(--spacing-md);
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            cursor: pointer;
            transition: all var(--transition-fast);
            position: relative;
        }
        
        .game-card:hover {
            background: var(--bg-surface);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .game-icon {
            width: 56px;
            height: 56px;
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .game-icon i {
            font-size: 24px;
            color: white;
        }
        
        .game-info {
            flex: 1;
        }
        
        .game-info h3 {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 2px;
        }
        
        .game-info p {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xs);
        }
        
        .game-stats {
            display: flex;
            gap: var(--spacing-md);
            font-size: 11px;
        }
        
        .game-stats .online {
            color: var(--text-secondary);
        }
        
        .game-stats .profit {
            color: var(--success);
            font-weight: 600;
        }
        
        .game-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: var(--gradient-danger);
            color: white;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: var(--radius-full);
        }
        
        .game-badge.hot {
            background: var(--gradient-danger);
        }
        
        .user-stats {
            margin-bottom: var(--spacing-xl);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-md);
        }
        
        .user-stat {
            background: var(--bg-tertiary);
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            text-align: center;
        }
        
        .user-stat .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xs);
        }
        
        .user-stat .stat-value {
            font-size: 20px;
            font-weight: 800;
            color: var(--text-primary);
        }
        
        .user-stat .stat-value.success {
            color: var(--success);
        }
        
        .user-stat .stat-value.warning {
            color: var(--warning);
        }
        
        .promo-banner {
            background: var(--gradient-warning);
            border-radius: var(--radius-lg);
            padding: var(--spacing-lg);
            text-align: center;
            color: #000;
        }
        
        .promo-content h3 {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: var(--spacing-xs);
        }
        
        .promo-content p {
            margin-bottom: var(--spacing-md);
            font-weight: 500;
        }
        
        .promo-btn {
            background: #000;
            color: var(--warning);
            border: none;
            padding: 10px 24px;
            border-radius: var(--radius-full);
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        
        .promo-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
        
        .loading-content {
            text-align: center;
            padding: var(--spacing-2xl);
            color: var(--text-secondary);
        }
        
        .loading-content .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto var(--spacing-md);
        }
        
        @media (max-width: 480px) {
            .stats-cards,
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .welcome-section h1 {
                font-size: 24px;
            }
        }
    `;
    document.head.appendChild(style);
}

function loadCrashGame() {
    const page = document.getElementById('page-crash');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🚀 Crash Game</h1>
                <p>Place your bet and watch the rocket fly!</p>
            </div>
            
            ${!AppState.isConnected ? `
                <div class="connect-required">
                    <i class="fas fa-wallet"></i>
                    <h3>Connect your wallet to play</h3>
                    <p>You need to connect a TON wallet to start playing</p>
                    <button class="connect-game-btn" onclick="openConnectModal()">
                        Connect Wallet
                    </button>
                </div>
            ` : `
                <div class="crash-game">
                    <!-- Game will be implemented here -->
                    <div class="coming-soon">
                        <i class="fas fa-tools"></i>
                        <h3>Game under development</h3>
                        <p>Crash game coming soon!</p>
                    </div>
                </div>
            `}
        </div>
    `;
}

function loadMinesGame() {
    const page = document.getElementById('page-mines');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>💣 Mines Game</h1>
                <p>Find diamonds and avoid the mines!</p>
            </div>
            
            ${!AppState.isConnected ? `
                <div class="connect-required">
                    <i class="fas fa-wallet"></i>
                    <h3>Connect your wallet to play</h3>
                    <p>You need to connect a TON wallet to start playing</p>
                    <button class="connect-game-btn" onclick="openConnectModal()">
                        Connect Wallet
                    </button>
                </div>
            ` : `
                <div class="mines-game">
                    <!-- Game will be implemented here -->
                    <div class="coming-soon">
                        <i class="fas fa-tools"></i>
                        <h3>Game under development</h3>
                        <p>Mines game coming soon!</p>
                    </div>
                </div>
            `}
        </div>
    `;
}

function loadPlinkoGame() {
    // Similar structure as other games
    const page = document.getElementById('page-plinko');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🎯 Plinko Game</h1>
                <p>Drop the ball and win big!</p>
            </div>
            
            ${!AppState.isConnected ? `
                <div class="connect-required">
                    <i class="fas fa-wallet"></i>
                    <h3>Connect your wallet to play</h3>
                    <p>You need to connect a TON wallet to start playing</p>
                    <button class="connect-game-btn" onclick="openConnectModal()">
                        Connect Wallet
                    </button>
                </div>
            ` : `
                <div class="plinko-game">
                    <div class="coming-soon">
                        <i class="fas fa-tools"></i>
                        <h3>Game under development</h3>
                        <p>Plinko game coming soon!</p>
                    </div>
                </div>
            `}
        </div>
    `;
}

function loadDiceGame() {
    // Similar structure as other games
    const page = document.getElementById('page-dice');
    if (!page) return;
    
    page.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🎲 Dice Game</h1>
                <p>Classic dice game with crypto rewards</p>
            </div>
            
            ${!AppState.isConnected ? `
                <div class="connect-required">
                    <i class="fas fa-wallet"></i>
                    <h3>Connect your wallet to play</h3>
                    <p>You need to connect a TON wallet to start playing</p>
                    <button class="connect-game-btn" onclick="openConnectModal()">
                        Connect Wallet
                    </button>
                </div>
            ` : `
                <div class="dice-game">
                    <div class="coming-soon">
                        <i class="fas fa-tools"></i>
                        <h3>Game under development</h3>
                        <p>Dice game coming soon!</p>
                    </div>
                </div>
            `}
        </div>
    `;
}

function loadReferralPage() {
    const page = document.getElementById('page-referral');
    if (!page) return;
    
    const referralCode = AppState.user?.referralCode || 'CONNECT-WALLET';
    
    page.innerHTML = `
        <div class="referral-container">
            <div class="referral-header">
                <h1>👥 Referral Program</h1>
                <p>Earn 5% from your friends' bets</p>
            </div>
            
            <div class="referral-stats">
                <div class="referral-stat">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">0</div>
                        <div class="stat-label">Total Referrals</div>
                    </div>
                </div>
                
                <div class="referral-stat">
                    <div class="stat-icon">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">0 TON</div>
                        <div class="stat-label">Total Earned</div>
                    </div>
                </div>
                
                <div class="referral-stat">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">0 TON</div>
                        <div class="stat-label">Pending Rewards</div>
                    </div>
                </div>
            </div>
            
            <div class="referral-code-card">
                <div class="code-header">
                    <i class="fas fa-link"></i>
                    <h3>Your Referral Code</h3>
                </div>
                <div class="code-display">
                    <code>${referralCode}</code>
                    <button class="copy-btn" onclick="copyToClipboard('${referralCode}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <p class="code-hint">Share this code with your friends</p>
            </div>
            
            <div class="referral-link-card">
                <div class="link-header">
                    <i class="fas fa-share-alt"></i>
                    <h3>Your Referral Link</h3>
                </div>
                <div class="link-display">
                    <span>https://tonrocket.com/ref/${referralCode}</span>
                    <button class="copy-btn" onclick="copyToClipboard('https://tonrocket.com/ref/${referralCode}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="social-share">
                    <button class="social-btn telegram" onclick="shareToTelegram('${referralCode}')">
                        <i class="fab fa-telegram"></i>
                    </button>
                    <button class="social-btn twitter" onclick="shareToTwitter('${referralCode}')">
                        <i class="fab fa-twitter"></i>
                    </button>
                    <button class="social-btn whatsapp" onclick="shareToWhatsApp('${referralCode}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </div>
            
            <div class="referral-info">
                <h3>How it works</h3>
                <ul>
                    <li>Share your referral link with friends</li>
                    <li>They sign up and make their first deposit</li>
                    <li>You earn 5% of their bets forever</li>
                    <li>Withdraw your earnings anytime</li>
                </ul>
            </div>
        </div>
    `;
}

function loadBonusesPage() {
    const page = document.getElementById('page-bonuses');
    if (!page) return;
    
    page.innerHTML = `
        <div class="bonuses-container">
            <div class="bonuses-header">
                <h1>🎁 Bonuses & Rewards</h1>
                <p>Claim your bonuses and increase your balance</p>
            </div>
            
            <div class="daily-bonus-card">
                <div class="bonus-header">
                    <div class="bonus-icon">
                        <i class="fas fa-calendar-day"></i>
                    </div>
                    <div class="bonus-info">
                        <h3>Daily Bonus</h3>
                        <p>Claim every 24 hours</p>
                    </div>
                </div>
                <div class="bonus-amount">
                    <span class="amount">0.1 TON</span>
                    <span class="streak">+0.01 TON per streak day</span>
                </div>
                <button class="claim-bonus-btn" ${!AppState.isConnected ? 'disabled' : ''}>
                    ${AppState.isConnected ? 'Claim Now' : 'Connect Wallet to Claim'}
                </button>
                <div class="streak-info">
                    <span>Current streak: <strong>0 days</strong></span>
                </div>
            </div>
            
            <div class="bonuses-grid">
                <div class="bonus-card">
                    <div class="bonus-card-header">
                        <div class="bonus-card-icon">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <h4>Referral Bonus</h4>
                    </div>
                    <div class="bonus-card-body">
                        <p>Get 0.5 TON for each friend who deposits</p>
                        <div class="bonus-status available">Available</div>
                    </div>
                </div>
                
                <div class="bonus-card">
                    <div class="bonus-card-header">
                        <div class="bonus-card-icon">
                            <i class="fas fa-award"></i>
                        </div>
                        <h4>Welcome Bonus</h4>
                    </div>
                    <div class="bonus-card-body">
                        <p>0.5 TON on first deposit</p>
                        <div class="bonus-status ${AppState.isConnected ? 'claimed' : 'available'}">
                            ${AppState.isConnected ? 'Claimed' : 'Available'}
                        </div>
                    </div>
                </div>
                
                <div class="bonus-card">
                    <div class="bonus-card-header">
                        <div class="bonus-card-icon">
                            <i class="fas fa-level-up-alt"></i>
                        </div>
                        <h4>Level Up Bonus</h4>
                    </div>
                    <div class="bonus-card-body">
                        <p>Get rewards for leveling up</p>
                        <div class="bonus-status available">Available</div>
                    </div>
                </div>
                
                <div class="bonus-card">
                    <div class="bonus-card-header">
                        <div class="bonus-card-icon">
                            <i class="fas fa-gem"></i>
                        </div>
                        <h4>VIP Bonus</h4>
                    </div>
                    <div class="bonus-card-body">
                        <p>Special bonuses for VIP players</p>
                        <div class="bonus-status locked">Locked</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadLeaderboard() {
    const page = document.getElementById('page-leaderboard');
    if (!page) return;
    
    page.innerHTML = `
        <div class="leaderboard-container">
            <div class="leaderboard-header">
                <h1>🏆 Leaderboard</h1>
                <div class="period-selector">
                    <button class="period-btn active">Daily</button>
                    <button class="period-btn">Weekly</button>
                    <button class="period-btn">Monthly</button>
                    <button class="period-btn">All Time</button>
                </div>
            </div>
            
            <div class="leaderboard-table">
                <div class="table-header">
                    <div class="rank-col">Rank</div>
                    <div class="player-col">Player</div>
                    <div class="profit-col">Profit</div>
                </div>
                
                <div class="table-body">
                    ${Array.from({length: 10}, (_, i) => `
                        <div class="table-row ${i === 2 ? 'current-user' : ''}">
                            <div class="rank-col">
                                <span class="rank-number">${i + 1}</span>
                                ${i < 3 ? '<span class="rank-medal">🥇</span>' : ''}
                            </div>
                            <div class="player-col">
                                <div class="player-info">
                                    <div class="player-avatar">${String.fromCharCode(65 + i)}</div>
                                    <div class="player-details">
                                        <div class="player-name">Player${i + 1}</div>
                                        <div class="player-level">Level ${Math.floor(Math.random() * 10) + 1}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="profit-col">
                                <span class="profit-value positive">+${(Math.random() * 100).toFixed(2)} TON</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${AppState.isConnected ? `
                <div class="user-position">
                    <h3>Your Position</h3>
                    <div class="position-card">
                        <div class="position-rank">#42</div>
                        <div class="position-info">
                            <div class="position-name">${AppState.user?.name}</div>
                            <div class="position-profit">+15.20 TON</div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function loadTransactions() {
    const page = document.getElementById('page-transactions');
    if (!page) return;
    
    page.innerHTML = `
        <div class="transactions-container">
            <div class="transactions-header">
                <h1>📋 Transactions</h1>
                <div class="filter-options">
                    <select class="filter-select">
                        <option value="all">All Transactions</option>
                        <option value="deposit">Deposits</option>
                        <option value="withdraw">Withdrawals</option>
                        <option value="bet">Bets</option>
                        <option value="win">Wins</option>
                        <option value="bonus">Bonuses</option>
                    </select>
                </div>
            </div>
            
            ${!AppState.isConnected ? `
                <div class="empty-state">
                    <i class="fas fa-wallet"></i>
                    <h3>No transactions yet</h3>
                    <p>Connect your wallet to see your transaction history</p>
                    <button class="connect-btn" onclick="openConnectModal()">
                        Connect Wallet
                    </button>
                </div>
            ` : `
                <div class="transactions-list">
                    ${Array.from({length: 5}, (_, i) => {
                        const types = ['deposit', 'withdraw', 'bet', 'win', 'bonus'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        const amounts = [0.5, 1.0, 2.5, 5.0, 10.0];
                        const amount = amounts[Math.floor(Math.random() * amounts.length)];
                        const isPositive = ['deposit', 'win', 'bonus'].includes(type);
                        
                        return `
                            <div class="transaction-item">
                                <div class="transaction-icon ${type}">
                                    <i class="fas fa-${type === 'deposit' ? 'arrow-down' : type === 'withdraw' ? 'arrow-up' : type === 'bet' ? 'dice' : type === 'win' ? 'trophy' : 'gift'}"></i>
                                </div>
                                <div class="transaction-info">
                                    <div class="transaction-type">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                                    <div class="transaction-time">${new Date(Date.now() - i * 3600000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                </div>
                                <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                                    ${isPositive ? '+' : '-'}${amount.toFixed(2)} TON
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

function loadSupportPage() {
    const page = document.getElementById('page-support');
    if (!page) return;
    
    page.innerHTML = `
        <div class="support-container">
            <div class="support-header">
                <h1>🛟 Support Center</h1>
                <p>We're here to help you</p>
            </div>
            
            <div class="support-options">
                <div class="support-card" onclick="openFAQ()">
                    <div class="support-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <h3>FAQ</h3>
                    <p>Frequently asked questions</p>
                </div>
                
                <div class="support-card" onclick="openTelegramSupport()">
                    <div class="support-icon">
                        <i class="fab fa-telegram"></i>
                    </div>
                    <h3>Telegram Support</h3>
                    <p>24/7 live support</p>
                </div>
                
                <div class="support-card" onclick="openEmailSupport()">
                    <div class="support-icon">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <h3>Email Support</h3>
                    <p>support@tonrocket.com</p>
                </div>
                
                <div class="support-card" onclick="openBugReport()">
                    <div class="support-icon">
                        <i class="fas fa-bug"></i>
                    </div>
                    <h3>Report Bug</h3>
                    <p>Found an issue? Let us know</p>
                </div>
            </div>
            
            <div class="contact-form">
                <h3>Contact Us</h3>
                <div class="form-group">
                    <input type="text" placeholder="Your Name" class="form-input">
                </div>
                <div class="form-group">
                    <input type="email" placeholder="Your Email" class="form-input">
                </div>
                <div class="form-group">
                    <textarea placeholder="Your Message" class="form-textarea" rows="4"></textarea>
                </div>
                <button class="submit-btn">Send Message</button>
            </div>
        </div>
    `;
}

// ===== UTILITY FUNCTIONS =====
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-left: 4px solid;
            border-radius: var(--radius-md);
            padding: var(--spacing-md);
            max-width: 320px;
            z-index: 3000;
            animation: notificationSlideIn 0.3s ease;
            box-shadow: var(--shadow-lg);
        }
        
        .notification.success {
            border-left-color: var(--success);
        }
        
        .notification.error {
            border-left-color: var(--danger);
        }
        
        .notification.warning {
            border-left-color: var(--warning);
        }
        
        .notification.info {
            border-left-color: var(--info);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .notification-icon {
            font-weight: bold;
            font-size: 16px;
        }
        
        .notification.success .notification-icon {
            color: var(--success);
        }
        
        .notification.error .notification-icon {
            color: var(--danger);
        }
        
        .notification.warning .notification-icon {
            color: var(--warning);
        }
        
        .notification.info .notification-icon {
            color: var(--info);
        }
        
        .notification-text {
            flex: 1;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        @keyframes notificationSlideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes notificationSlideOut {
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
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('Copied to clipboard!', 'success'))
        .catch(err => showNotification('Failed to copy', 'error'));
}

function shareToTelegram(code) {
    const text = `Join me on TON Rocket Casino! Use my referral code: ${code} to get bonus!`;
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://tonrocket.com')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Opening Telegram...', 'info');
}

function shareToTwitter(code) {
    const text = `Join me on @TONRocket Casino! Use code: ${code} for bonus! 🚀 #TON #CryptoCasino`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Opening Twitter...', 'info');
}

function shareToWhatsApp(code) {
    const text = `Join me on TON Rocket Casino! Use my referral code: ${code} to get bonus!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showNotification('Opening WhatsApp...', 'info');
}

function claimWelcomeBonus() {
    if (!AppState.isConnected) {
        openConnectModal();
        return;
    }
    
    showNotification('Welcome bonus claimed! +0.5 TON', 'success');
    // In real app, this would call backend API
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Connect Wallet Button
    document.getElementById('connect-wallet-btn')?.addEventListener('click', openConnectModal);
    
    // Disconnect Button
    document.getElementById('disconnect-btn')?.addEventListener('click', () => {
        tonConnectIntegration.disconnectWallet();
    });
    
    // Close Modal Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeConnectModal);
    });
    
    // Modal Overlay
    document.querySelector('.modal-overlay')?.addEventListener('click', closeConnectModal);
    
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
    
    // Navigation Items
    document.querySelectorAll('.menu-item, .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                navigateTo(page);
            }
        });
    });
    
    // Language Selector
    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const lang = option.dataset.lang;
            AppState.language = lang;
            showNotification(`Language changed to ${lang.toUpperCase()}`, 'info');
            // Update language in UI
        });
    });
    
    // View All Wallets Button
    document.getElementById('view-all-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        // In a real app, this would show more wallets
        showNotification('Showing all available wallets', 'info');
    });
}

// ===== INITIALIZATION =====
const walletIntegration = new WalletIntegration();
const tonConnectIntegration = new TONConnectIntegration();

async function initializeApp() {
    console.log('Initializing TON Rocket Casino...');
    
    try {
        // Hide loader after 1 second minimum
        setTimeout(hideLoader, 1000);
        
        // Detect installed wallets
        await walletIntegration.detectInstalledWallets();
        
        // Get available wallets
        AppState.wallets = await walletIntegration.getAvailableWallets();
        
        // Initialize TON Connect
        await tonConnectIntegration.initialize();
        
        // Load saved connection state
        const savedState = tonConnectIntegration.loadConnectionState();
        if (savedState && !AppState.isConnected) {
            // Try to restore connection
            console.log('Restoring saved connection state...');
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Update UI
        updateUserDisplay();
        updateWalletsGrid();
        
        // Load initial page
        navigateTo('dashboard');
        
        // Update header stats
        document.getElementById('online-count').textContent = CONFIG.DEMO_ONLINE_COUNT.toLocaleString();
        document.getElementById('daily-volume').textContent = `${CONFIG.DEMO_DAILY_VOLUME.toLocaleString()} TON`;
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('App initialization failed:', error);
        showNotification('Failed to initialize app', 'error');
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    const app = document.getElementById('app');
    
    if (loader) loader.classList.add('hidden');
    if (app) app.classList.remove('hidden');
}

// ===== START APP =====
document.addEventListener('DOMContentLoaded', initializeApp);

// Export to global scope for HTML onclick handlers
window.navigateTo = navigateTo;
window.openConnectModal = openConnectModal;
window.closeConnectModal = closeConnectModal;
window.copyToClipboard = copyToClipboard;
window.shareToTelegram = shareToTelegram;
window.shareToTwitter = shareToTwitter;
window.shareToWhatsApp = shareToWhatsApp;
window.claimWelcomeBonus = claimWelcomeBonus;
