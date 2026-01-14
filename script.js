class TONCasino {
    constructor() {
        this.tonConnectUI = null;
        this.wallet = null;
        this.referralCode = null;
        this.lastSpin = null;
        this.init();
    }

    init() {
        this.initTONConnect();
        this.setupEventListeners();
        this.initWheel();
        this.generateReferralLink();
        this.updateCooldownTimer();
        setInterval(() => this.updateCooldownTimer(), 1000);
    }

    initTONConnect() {
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://yourdomain.com/tonconnect-manifest.json',
            buttonRootId: 'connect-wallet',
            uiPreferences: {
                theme: 'DARK'
            }
        });

        // Check if already connected
        this.tonConnectUI.connectionRestored.then((connected) => {
            if (connected) {
                this.handleWalletConnection();
            }
        });
    }

    async handleWalletConnection() {
        try {
            this.wallet = await this.tonConnectUI.connectWallet();
            this.updateWalletInfo();
            
            // Show wallet info, hide connect button
            document.getElementById('wallet-info').style.display = 'flex';
            document.getElementById('connect-wallet').style.display = 'none';
            
            // Generate referral code from wallet address
            this.generateReferralCode(this.wallet.account.address);
            
        } catch (error) {
            console.error('Connection failed:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    }

    updateWalletInfo() {
        if (!this.wallet) return;
        
        // Update balance (simulated - in production use TON API)
        document.getElementById('wallet-balance').textContent = '100.5 TON';
        
        // You can implement actual balance fetching here:
        // fetch(`https://tonapi.io/v2/accounts/${this.wallet.account.address}`)
        //   .then(response => response.json())
        //   .then(data => {
        //       const balance = data.balance / 1000000000;
        //       document.getElementById('wallet-balance').textContent = `${balance} TON`;
        //   });
    }

    generateReferralCode(walletAddress) {
        // Generate unique referral code from wallet address
        this.referralCode = btoa(walletAddress).slice(0, 8);
        document.getElementById('referral-link').value = 
            `https://yourcasino.com/ref/${this.referralCode}`;
    }

    generateReferralLink() {
        const link = `https://yourcasino.com/ref/${this.referralCode || 'WELCOME'}`;
        document.getElementById('referral-link').value = link;
    }

    setupEventListeners() {
        // Connect wallet button
        document.getElementById('connect-wallet').addEventListener('click', () => {
            this.handleWalletConnection();
        });

        // Disconnect wallet
        document.getElementById('disconnect-wallet').addEventListener('click', () => {
            this.tonConnectUI.disconnect();
            document.getElementById('wallet-info').style.display = 'none';
            document.getElementById('connect-wallet').style.display = 'flex';
            this.wallet = null;
        });

        // Copy referral link
        document.getElementById('copy-link').addEventListener('click', () => {
            const link = document.getElementById('referral-link');
            link.select();
            navigator.clipboard.writeText(link.value);
            
            // Show success feedback
            const originalText = this.copyButton.innerHTML;
            this.copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                this.copyButton.innerHTML = originalText;
            }, 2000);
        });

        // Game buttons
        document.querySelectorAll('.btn-play').forEach(button => {
            button.addEventListener('click', (e) => {
                const game = e.target.closest('.game-card').dataset.game;
                this.openGameModal(game);
            });
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('game-modal').style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('game-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    openGameModal(game) {
        if (!this.wallet) {
            alert('Please connect your wallet first!');
            return;
        }

        const modal = document.getElementById('game-modal');
        const content = document.getElementById('game-content');
        
        content.innerHTML = this.getGameHTML(game);
        modal.style.display = 'block';
        
        // Initialize specific game logic
        this.initGame(game);
    }

    getGameHTML(game) {
        const games = {
            plinko: `
                <div class="game-plinko">
                    <h3>PLINKO</h3>
                    <div class="plinko-board" id="plinko-board">
                        <canvas id="plinko-canvas" width="600" height="400"></canvas>
                    </div>
                    <div class="game-controls">
                        <input type="number" id="bet-amount" placeholder="Bet amount in TON" min="0.1" step="0.1" value="1">
                        <select id="risk-level">
                            <option value="low">Low Risk (1-10x)</option>
                            <option value="medium">Medium Risk (1-50x)</option>
                            <option value="high">High Risk (1-100x)</option>
                        </select>
                        <button id="drop-ball" class="btn-bet">DROP BALL</button>
                    </div>
                    <div id="plinko-result"></div>
                </div>
            `,
            mines: `
                <div class="game-mines">
                    <h3>MINES</h3>
                    <div class="mines-grid" id="mines-grid">
                        ${Array(25).fill().map((_, i) => 
                            `<div class="mine-cell" data-cell="${i}">${i + 1}</div>`
                        ).join('')}
                    </div>
                    <div class="game-controls">
                        <input type="number" id="bet-amount" placeholder="Bet amount in TON" min="0.1" step="0.1" value="1">
                        <select id="mines-count">
                            ${Array(24).fill().map((_, i) => 
                                `<option value="${i + 1}">${i + 1} Mines</option>`
                            ).join('')}
                        </select>
                        <button id="place-bet" class="btn-bet">PLACE BET</button>
                    </div>
                    <div id="mines-result"></div>
                </div>
            `,
            dice: `
                <div class="game-dice">
                    <h3>DICE</h3>
                    <div class="dice-container">
                        <div class="dice" id="dice">?</div>
                    </div>
                    <div class="game-controls">
                        <input type="number" id="bet-amount" placeholder="Bet amount in TON" min="0.1" step="0.1" value="1">
                        <div class="dice-options">
                            <label>Roll Under: <input type="range" id="dice-target" min="1" max="95" value="50"></label>
                            <span id="target-value">50</span>
                        </div>
                        <div class="multiplier">
                            Multiplier: <span id="dice-multiplier">2x</span>
                        </div>
                        <button id="roll-dice" class="btn-bet">ROLL DICE</button>
                    </div>
                    <div id="dice-result"></div>
                </div>
            `,
            crash: `
                <div class="game-crash">
                    <h3>CRASH</h3>
                    <div class="crash-graph">
                        <canvas id="crash-canvas" width="600" height="300"></canvas>
                        <div class="crash-multiplier" id="crash-multiplier">1.00x</div>
                    </div>
                    <div class="game-controls">
                        <input type="number" id="bet-amount" placeholder="Bet amount in TON" min="0.1" step="0.1" value="1">
                        <input type="number" id="cashout-at" placeholder="Auto cashout at" min="1.1" step="0.1" value="2">
                        <button id="place-bet" class="btn-bet">PLACE BET</button>
                        <button id="cashout" class="btn-cashout" disabled>CASHOUT</button>
                    </div>
                    <div id="crash-result"></div>
                </div>
            `
        };
        
        return games[game] || '<p>Game not found</p>';
    }

    initGame(game) {
        switch(game) {
            case 'plinko':
                this.initPlinko();
                break;
            case 'mines':
                this.initMines();
                break;
            case 'dice':
                this.initDice();
                break;
            case 'crash':
                this.initCrash();
                break;
        }
    }

    initPlinko() {
        const canvas = document.getElementById('plinko-canvas');
        const ctx = canvas.getContext('2d');
        
        // Draw plinko board
        ctx.fillStyle = '#15151f';
        ctx.fillRect(0, 0, 600, 400);
        
        // Draw pegs
        ctx.fillStyle = '#0088cc';
        for(let row = 0; row < 10; row++) {
            for(let col = 0; col <= row; col++) {
                const x = 300 + (col - row/2) * 40;
                const y = 50 + row * 35;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw multiplier slots
        const multipliers = ['100x', '50x', '20x', '10x', '5x', '2x', '1x', '2x', '5x', '10x', '20x', '50x', '100x'];
        multipliers.forEach((mult, i) => {
            const x = 50 + i * 40;
            const y = 380;
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(x - 30, y - 20, 60, 30);
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(mult, x, y);
        });
    }

    initDice() {
        const slider = document.getElementById('dice-target');
        const valueDisplay = document.getElementById('target-value');
        const multiplierDisplay = document.getElementById('dice-multiplier');
        
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            valueDisplay.textContent = value;
            const multiplier = (99 / value).toFixed(2);
            multiplierDisplay.textContent = `${multiplier}x`;
        });
        
        document.getElementById('roll-dice').addEventListener('click', () => {
            this.rollDice();
        });
    }

    async rollDice() {
        const betAmount = parseFloat(document.getElementById('bet-amount').value);
        const target = parseInt(document.getElementById('dice-target').value);
        
        if (!this.wallet || betAmount <= 0) {
            alert('Please connect wallet and enter valid bet amount');
            return;
        }
        
        // Show rolling animation
        const dice = document.getElementById('dice');
        dice.textContent = '🎲';
        dice.style.animation = 'spin 0.5s linear infinite';
        
        // Simulate rolling
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate random result
        const result = Math.floor(Math.random() * 100) + 1;
        dice.textContent = result;
        dice.style.animation = '';
        
        // Check win
        const multiplier = (99 / target).toFixed(2);
        if (result < target) {
            const winAmount = (betAmount * multiplier).toFixed(2);
            document.getElementById('dice-result').innerHTML = `
                <div class="win-message">
                    <h4>🎉 YOU WIN!</h4>
                    <p>Rolled: ${result} (under ${target})</p>
                    <p>You won: ${winAmount} TON</p>
                </div>
            `;
            
            // Send transaction on win
            await this.sendTransaction(winAmount);
        } else {
            document.getElementById('dice-result').innerHTML = `
                <div class="lose-message">
                    <h4>😔 YOU LOSE</h4>
                    <p>Rolled: ${result} (over ${target})</p>
                </div>
            `;
        }
    }

    initWheel() {
        const canvas = document.getElementById('wheelCanvas');
        const ctx = canvas.getContext('2d');
        const prizes = ['5 TON', '10 TON', '25 TON', '50 TON', '100 TON', '500 TON'];
        const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#EF476F'];
        
        // Draw wheel
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 180;
        const arc = (2 * Math.PI) / prizes.length;
        
        prizes.forEach((prize, i) => {
            const angle = i * arc;
            ctx.beginPath();
            ctx.fillStyle = colors[i];
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle, angle + arc);
            ctx.closePath();
            ctx.fill();
            
            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arc / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(prize, radius - 10, 10);
            ctx.restore();
        });
        
        // Draw center circle
        ctx.beginPath();
        ctx.fillStyle = '#15151f';
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw pointer
        ctx.beginPath();
        ctx.fillStyle = '#FFD700';
        ctx.moveTo(centerX, centerY - radius - 20);
        ctx.lineTo(centerX - 15, centerY - radius);
        ctx.lineTo(centerX + 15, centerY - radius);
        ctx.closePath();
        ctx.fill();
        
        this.wheelCtx = ctx;
        this.wheelPrizes = prizes;
        this.wheelColors = colors;
        this.isSpinning = false;
        
        // Add spin event
        document.getElementById('spin-wheel').addEventListener('click', () => {
            if (!this.isSpinning && this.canSpin()) {
                this.spinWheel();
            }
        });
    }

    canSpin() {
        if (!this.wallet) {
            alert('Please connect your wallet to spin!');
            return false;
        }
        
        if (this.isSpinning) {
            return false;
        }
        
        // Check cooldown
        if (this.lastSpin) {
            const now = new Date();
            const last = new Date(this.lastSpin);
            const diffHours = (now - last) / (1000 * 60 * 60);
            
            if (diffHours < 24) {
                alert('You can spin again in ' + this.getRemainingCooldown());
                return false;
            }
        }
        
        return true;
    }

    getRemainingCooldown() {
        if (!this.lastSpin) return '0:00:00';
        
        const now = new Date();
        const last = new Date(this.lastSpin);
        const nextSpin = new Date(last.getTime() + 24 * 60 * 60 * 1000);
        const diff = nextSpin - now;
        
        if (diff <= 0) return '0:00:00';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateCooldownTimer() {
        const timer = document.getElementById('cooldown-timer');
        timer.textContent = this.getRemainingCooldown();
    }

    spinWheel() {
        this.isSpinning = true;
        const spinButton = document.getElementById('spin-wheel');
        spinButton.disabled = true;
        
        const canvas = document.getElementById('wheelCanvas');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        let rotation = 0;
        const spins = 5 + Math.random() * 3; // 5-8 full rotations
        const totalRotation = spins * 2 * Math.PI;
        const duration = 3000; // 3 seconds
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            rotation = easeProgress * totalRotation;
            
            // Clear and redraw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.translate(-centerX, -centerY);
            
            // Redraw wheel
            const radius = 180;
            const arc = (2 * Math.PI) / this.wheelPrizes.length;
            
            this.wheelPrizes.forEach((prize, i) => {
                const angle = i * arc;
                ctx.beginPath();
                ctx.fillStyle = this.wheelColors[i];
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, angle, angle + arc);
                ctx.closePath();
                ctx.fill();
                
                // Draw text
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angle + arc / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Arial';
                ctx.fillText(prize, radius - 10, 10);
                ctx.restore();
            });
            
            ctx.restore();
            
            // Draw center and pointer
            ctx.beginPath();
            ctx.fillStyle = '#15151f';
            ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.fillStyle = '#FFD700';
            ctx.moveTo(centerX, centerY - radius - 20);
            ctx.lineTo(centerX - 15, centerY - radius);
            ctx.lineTo(centerX + 15, centerY - radius);
            ctx.closePath();
            ctx.fill();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.onWheelStop(rotation);
            }
        };
        
        animate();
    }

    onWheelStop(rotation) {
        this.isSpinning = false;
        this.lastSpin = new Date().toISOString();
        
        // Calculate prize
        const normalizedRotation = rotation % (2 * Math.PI);
        const arc = (2 * Math.PI) / this.wheelPrizes.length;
        const prizeIndex = Math.floor((2 * Math.PI - normalizedRotation) / arc) % this.wheelPrizes.length;
        const prize = this.wheelPrizes[prizeIndex];
        
        // Show prize
        alert(`🎉 Congratulations! You won: ${prize}`);
        
        // Enable button and update cooldown
        const spinButton = document.getElementById('spin-wheel');
        spinButton.disabled = true;
        
        // Send prize to wallet
        this.sendPrize(prize);
    }

    async sendPrize(prize) {
        if (!this.wallet) return;
        
        const amount = parseFloat(prize);
        if (isNaN(amount)) return;
        
        try {
            const transaction = {
                messages: [{
                    address: this.wallet.account.address,
                    amount: (amount * 1000000000).toString(), // Convert to nanotons
                }],
            };
            
            const result = await this.tonConnectUI.sendTransaction(transaction);
            console.log('Prize sent:', result);
        } catch (error) {
            console.error('Failed to send prize:', error);
        }
    }

    async sendTransaction(amount) {
        if (!this.wallet) return;
        
        try {
            // This is a simplified version - in production you would:
            // 1. Send bet to smart contract
            // 2. Receive result from contract
            // 3. Process payout
            
            console.log(`Sending transaction for ${amount} TON`);
            
            // For now, we'll just show a success message
            return true;
        } catch (error) {
            console.error('Transaction failed:', error);
            return false;
        }
    }
}

// Initialize casino when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.casino = new TONCasino();
});

// Additional CSS for games
const style = document.createElement('style');
style.textContent = `
    .game-controls {
        margin: 20px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .game-controls input, 
    .game-controls select {
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: white;
        font-size: 1rem;
    }
    
    .btn-bet {
        background: linear-gradient(45deg, var(--primary), var(--secondary));
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .btn-bet:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 136, 204, 0.3);
    }
    
    .btn-cashout {
        background: linear-gradient(45deg, #00ff88, #00cc66);
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .mines-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
        margin: 20px 0;
    }
    
    .mine-cell {
        aspect-ratio: 1;
        background: var(--primary);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .mine-cell:hover {
        background: var(--primary-dark);
        transform: scale(1.05);
    }
    
    .dice-container {
        margin: 30px 0;
        display: flex;
        justify-content: center;
    }
    
    .dice {
        width: 100px;
        height: 100px;
        background: white;
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
        color: var(--background);
        font-weight: 700;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    }
    
    .win-message {
        background: rgba(0, 255, 136, 0.1);
        border: 1px solid #00ff88;
        border-radius: 10px;
        padding: 20px;
        margin-top: 20px;
        text-align: center;
    }
    
    .lose-message {
        background: rgba(255, 71, 87, 0.1);
        border: 1px solid #ff4757;
        border-radius: 10px;
        padding: 20px;
        margin-top: 20px;
        text-align: center;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
