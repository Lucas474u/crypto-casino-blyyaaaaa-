// ===== TON Connect Manager =====
class TonConnectManager {
    constructor() {
        this.connector = null;
        this.wallet = null;
        this.isConnected = false;
        this.initialized = false;
        
        // Popular wallets
        this.wallets = [
            {
                name: 'Tonkeeper',
                app_name: 'tonkeeper',
                image: 'tonkeeper',
                bridgeUrl: 'https://bridge.tonapi.io/bridge',
                universalUrl: 'https://app.tonkeeper.com/ton-connect',
                isInstalled: false
            },
            {
                name: 'Telegram Wallet',
                app_name: 'telegram',
                image: 'telegram',
                universalUrl: 'https://t.me/wallet/start',
                isInstalled: false
            },
            {
                name: 'MyTonWallet',
                app_name: 'mytonwallet',
                image: 'mytonwallet',
                universalUrl: 'https://connect.mytonwallet.org',
                isInstalled: false
            },
            {
                name: 'Tonhub',
                app_name: 'tonhub',
                image: 'tonhub',
                universalUrl: 'https://tonhub.com/connect',
                isInstalled: false
            }
        ];
    }

    async initialize() {
        try {
            console.log('🚀 Initializing TON Connect...');
            
            // Check if SDK is loaded
            if (typeof TonConnect !== 'function') {
                throw new Error('TON Connect SDK not loaded');
            }
            
            // Create manifest
            const manifest = {
                url: window.location.origin,
                name: 'TON ROCKET',
                iconUrl: window.location.origin + '/icon.png',
                termsOfUseUrl: window.location.origin + '/terms',
                privacyPolicyUrl: window.location.origin + '/privacy'
            };
            
            // Initialize connector
            this.connector = new TonConnect({
                manifest: manifest
            });
            
            console.log('✅ TON Connect initialized');
            this.initialized = true;
            
            // Check for existing connection
            await this.checkConnection();
            
            return true;
            
        } catch (error) {
            console.error('❌ TON Connect init failed:', error);
            this.showError('Failed to initialize TON Connect. Please refresh the page.');
            return false;
        }
    }

    async checkConnection() {
        try {
            if (!this.connector) return;
            
            // Check if already connected
            const connected = this.connector.connected;
            console.log('Connection status:', connected);
            
            if (connected && this.connector.wallet) {
                await this.handleConnection(this.connector.wallet);
            }
            
            // Listen for connection changes
            this.connector.onStatusChange((wallet) => {
                console.log('Wallet status changed:', wallet);
                if (wallet) {
                    this.handleConnection(wallet);
                } else {
                    this.handleDisconnection();
                }
            });
            
        } catch (error) {
            console.error('Connection check error:', error);
        }
    }

    async handleConnection(wallet) {
        try {
            this.wallet = wallet;
            this.isConnected = true;
            
            // Update UI
            this.updateUI();
            
            // Show success
            this.showMessage('Wallet connected successfully!');
            
            // Load balance
            await this.loadBalance();
            
        } catch (error) {
            console.error('Handle connection error:', error);
            this.showError('Connection error');
        }
    }

    handleDisconnection() {
        this.wallet = null;
        this.isConnected = false;
        this.updateUI();
        this.showMessage('Wallet disconnected');
    }

    async connect(walletName) {
        if (!this.initialized) {
            this.showError('TON Connect not initialized');
            return false;
        }
        
        try {
            const wallet = this.wallets.find(w => w.app_name === walletName);
            if (!wallet) {
                this.showError('Wallet not found');
                return false;
            }
            
            console.log('Connecting to:', wallet.name);
            
            // Generate connection link
            const connection = this.connector.connect({
                bridgeUrl: wallet.bridgeUrl,
                universalLink: wallet.universalUrl
            });
            
            // Open wallet or show QR
            if (this.isMobile() && wallet.universalUrl) {
                window.location.href = connection;
            } else {
                this.showQRCode(connection);
            }
            
            return true;
            
        } catch (error) {
            console.error('Connect error:', error);
            this.showError('Connection failed: ' + error.message);
            return false;
        }
    }

    async disconnect() {
        if (!this.initialized || !this.isConnected) return;
        
        try {
            await this.connector.disconnect();
            this.handleDisconnection();
        } catch (error) {
            console.error('Disconnect error:', error);
            this.showError('Disconnect failed');
        }
    }

    async loadBalance() {
        if (!this.isConnected || !this.wallet) return;
        
        try {
            const address = this.wallet.account.address;
            
            // Use TON Center API
            const response = await fetch(
                `https://toncenter.com/api/v2/getAddressBalance?address=${address}`
            );
            
            const data = await response.json();
            
            if (data.ok) {
                // Convert from nanoTON to TON
                const balance = parseFloat(data.result) / 1000000000;
                this.updateBalance(balance);
            } else {
                // Demo balance for testing
                this.updateBalance(12.85);
            }
            
        } catch (error) {
            console.error('Balance load error:', error);
            this.updateBalance(0);
        }
    }

    // ===== UI Methods =====
    updateUI() {
        const connectBtn = document.getElementById('connect-btn');
        const userInfo = document.getElementById('user-info');
        const userAddress = document.getElementById('user-address');
        
        if (this.isConnected && this.wallet) {
            // Show user info
            connectBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            
            // Update address
            const shortAddress = this.getShortAddress(this.wallet.account.address);
            userAddress.textContent = shortAddress;
            
        } else {
            // Show connect button
            connectBtn.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    }

    updateBalance(balance) {
        const balanceElement = document.getElementById('user-balance');
        if (balanceElement) {
            balanceElement.textContent = balance.toFixed(2) + ' TON';
        }
    }

    showQRCode(link) {
        const qrCode = document.getElementById('qr-code');
        if (!qrCode) return;
        
        qrCode.innerHTML = '';
        
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
                console.error('QR Code error:', error);
                qrCode.innerHTML = '<div style="color:#666;">QR Code Error</div>';
            }
        });
    }

    renderWallets() {
        const walletsGrid = document.getElementById('wallets-grid');
        if (!walletsGrid) return;
        
        walletsGrid.innerHTML = '';
        
        this.wallets.forEach(wallet => {
            const walletBtn = document.createElement('div');
            walletBtn.className = 'wallet-btn';
            walletBtn.innerHTML = `
                <div class="wallet-icon">
                    ${this.getWalletIcon(wallet.app_name)}
                </div>
                <div>${wallet.name}</div>
                ${wallet.isInstalled ? '<small style="color:#10B981;">Installed</small>' : ''}
            `;
            
            walletBtn.addEventListener('click', () => {
                this.connect(wallet.app_name);
            });
            
            walletsGrid.appendChild(walletBtn);
        });
    }

    getWalletIcon(walletName) {
        const icons = {
            'tonkeeper': '<i class="fas fa-shield-alt"></i>',
            'telegram': '<i class="fab fa-telegram"></i>',
            'mytonwallet': '<i class="fas fa-wallet"></i>',
            'tonhub': '<i class="fas fa-cloud"></i>'
        };
        return icons[walletName] || '<i class="fas fa-wallet"></i>';
    }

    getShortAddress(address) {
        if (!address) return '';
        return address.slice(0, 6) + '...' + address.slice(-4);
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    showMessage(text) {
        alert(text); // You can replace with a toast notification
    }

    showError(text) {
        alert('❌ ' + text); // You can replace with a toast notification
    }
}

// ===== Global Instance =====
const tonConnect = new TonConnectManager();

// ===== DOM Events =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting TON ROCKET...');
    
    // Initialize TON Connect
    const success = await tonConnect.initialize();
    
    if (!success) {
        document.getElementById('connect-btn').innerHTML = 
            '<i class="fas fa-exclamation-triangle"></i> Connect Failed';
        return;
    }
    
    // Render wallets
    tonConnect.renderWallets();
    
    // Setup event listeners
    document.getElementById('connect-btn').addEventListener('click', () => {
        document.getElementById('connect-modal').classList.add('active');
    });
    
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('connect-modal').classList.remove('active');
    });
    
    document.getElementById('disconnect-btn').addEventListener('click', () => {
        tonConnect.disconnect();
    });
    
    // Close modal on overlay click
    document.getElementById('connect-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('connect-modal')) {
            document.getElementById('connect-modal').classList.remove('active');
        }
    });
    
    console.log('✅ App initialized successfully');
});
