const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const { TonClient, WalletContractV4, toNano, fromNano } = require('ton');
const { mnemonicToPrivateKey } = require('ton-crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ton-casino', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Database schemas
const userSchema = new mongoose.Schema({
    walletAddress: { type: String, unique: true, required: true },
    balance: { type: Number, default: 0 },
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
    userAddress: { type: String, required: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'bet', 'win'], required: true },
    amount: { type: Number, required: true },
    gameType: { type: String },
    result: { type: mongoose.Schema.Types.Mixed },
    txHash: { type: String },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const gameSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    userAddress: { type: String, required: true },
    gameType: { type: String, required: true },
    betAmount: { type: Number, required: true },
    serverSeed: { type: String, required: true },
    clientSeed: { type: String, required: true },
    nonce: { type: Number, required: true },
    result: { type: mongoose.Schema.Types.Mixed },
    multiplier: { type: Number },
    winAmount: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const GameSession = mongoose.model('GameSession', gameSessionSchema);

// TON Client setup
const tonClient = new TonClient({
    endpoint: process.env.TON_NETWORK === 'mainnet' 
        ? 'https://mainnet.toncenter.com/api/v2/jsonRPC'
        : 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: process.env.TON_API_KEY
});

// Provably Fair RNG
class ProvablyFairRNG {
    constructor() {
        this.serverSeed = this.generateSeed();
        this.clientSeed = null;
    }

    generateSeed() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    setClientSeed(clientSeed) {
        this.clientSeed = clientSeed;
    }

    generate(gameType, nonce) {
        const hmac = require('crypto').createHmac('sha256', this.serverSeed);
        hmac.update(`${this.clientSeed}:${gameType}:${nonce}`);
        const hash = hmac.digest('hex');
        
        // Convert first 8 bytes to number between 0 and 1
        const number = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
        return number;
    }

    getResult(gameType, nonce) {
        const random = this.generate(gameType, nonce);
        
        switch(gameType) {
            case 'dice':
                // 49.5% win chance, 2x payout
                return random < 0.495 ? 2 : 0;
            
            case 'crash':
                // Crash game algorithm
                const houseEdge = 0.01;
                const crashPoint = 1 / (1 - houseEdge - random * 0.99);
                return Math.max(1, Math.floor(crashPoint * 100) / 100);
            
            case 'mines':
                // Mines game (3x3 with 3 mines)
                const positions = Array(9).fill(false);
                let minesPlaced = 0;
                while (minesPlaced < 3) {
                    const pos = Math.floor(random * 9);
                    if (!positions[pos]) {
                        positions[pos] = true;
                        minesPlaced++;
                    }
                }
                return positions;
            
            default:
                return 0;
        }
    }
}

// API Endpoints

// Get user info
app.get('/api/user/:address', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.address });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create deposit address
app.post('/api/deposit/address', async (req, res) => {
    try {
        const { userId } = req.body;
        // Generate unique deposit address for user
        // In production, use separate contract or multiple wallets
        res.json({
            depositAddress: process.env.CASINO_WALLET_ADDRESS,
            memo: `deposit_${userId}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process withdrawal
app.post('/api/withdraw', async (req, res) => {
    try {
        const { address, amount, signature } = req.body;
        
        // Verify user has sufficient balance
        const user = await User.findOne({ walletAddress: address });
        if (!user || user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create withdrawal transaction
        const tx = new Transaction({
            userAddress: address,
            type: 'withdraw',
            amount: amount,
            status: 'pending'
        });
        await tx.save();

        // Update user balance
        user.balance -= amount;
        user.totalWithdrawn += amount;
        await user.save();

        // In production: Send TON transaction here
        // await sendTON(address, amount);

        res.json({ 
            success: true, 
            transactionId: tx._id,
            message: 'Withdrawal processed'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start game session
app.post('/api/game/start', async (req, res) => {
    try {
        const { address, gameType, betAmount, clientSeed } = req.body;
        
        // Verify user has sufficient balance
        const user = await User.findOne({ walletAddress: address });
        if (!user || user.balance < betAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create provably fair session
        const rng = new ProvablyFairRNG();
        rng.setClientSeed(clientSeed);
        const nonce = Date.now();
        
        const session = new GameSession({
            sessionId: require('crypto').randomBytes(16).toString('hex'),
            userAddress: address,
            gameType,
            betAmount,
            serverSeed: rng.serverSeed,
            clientSeed,
            nonce
        });

        await session.save();

        // Deduct bet amount
        user.balance -= betAmount;
        user.gamesPlayed += 1;
        await user.save();

        // Create transaction record
        const tx = new Transaction({
            userAddress: address,
            type: 'bet',
            amount: betAmount,
            gameType,
            status: 'confirmed'
        });
        await tx.save();

        res.json({
            sessionId: session.sessionId,
            serverSeedHash: require('crypto')
                .createHash('sha256')
                .update(rng.serverSeed)
                .digest('hex')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Complete game and get result
app.post('/api/game/complete', async (req, res) => {
    try {
        const { sessionId, action } = req.body;
        
        const session = await GameSession.findOne({ sessionId });
        if (!session || session.isCompleted) {
            return res.status(400).json({ error: 'Invalid session' });
        }

        // Calculate result
        const rng = new ProvablyFairRNG();
        rng.serverSeed = session.serverSeed;
        rng.setClientSeed(session.clientSeed);
        
        let result, winAmount = 0;
        
        switch(session.gameType) {
            case 'crash':
                const crashPoint = rng.getResult('crash', session.nonce);
                if (action === 'cashout' && action.multiplier < crashPoint) {
                    winAmount = session.betAmount * action.multiplier;
                }
                result = { crashPoint };
                break;
                
            case 'dice':
                const multiplier = rng.getResult('dice', session.nonce);
                winAmount = multiplier > 0 ? session.betAmount * multiplier : 0;
                result = { multiplier };
                break;
                
            case 'mines':
                const minePositions = rng.getResult('mines', session.nonce);
                if (!minePositions[action.position]) {
                    winAmount = session.betAmount * 2; // Simplified
                }
                result = { minePositions };
                break;
        }

        // Update session
        session.result = result;
        session.winAmount = winAmount;
        session.isCompleted = true;
        await session.save();

        // Update user balance if won
        if (winAmount > 0) {
            const user = await User.findOne({ walletAddress: session.userAddress });
            user.balance += winAmount;
            user.gamesWon += 1;
            await user.save();

            // Record win transaction
            const tx = new Transaction({
                userAddress: session.userAddress,
                type: 'win',
                amount: winAmount,
                gameType: session.gameType,
                result: result,
                status: 'confirmed'
            });
            await tx.save();
        }

        res.json({
            result,
            winAmount,
            serverSeed: session.serverSeed // Reveal seed for verification
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify game fairness
app.get('/api/game/verify/:sessionId', async (req, res) => {
    try {
        const session = await GameSession.findOne({ sessionId: req.params.sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Recalculate to verify
        const rng = new ProvablyFairRNG();
        rng.serverSeed = session.serverSeed;
        rng.setClientSeed(session.clientSeed);
        const expectedResult = rng.getResult(session.gameType, session.nonce);

        res.json({
            session,
            expectedResult,
            verification: JSON.stringify(expectedResult) === JSON.stringify(session.result)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket for real-time updates
const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map();

wss.on('connection', (ws, req) => {
    const address = req.url.split('/').pop();
    clients.set(address, ws);
    
    ws.on('message', (message) => {
        // Handle real-time messages
    });
    
    ws.on('close', () => {
        clients.delete(address);
    });
});

function broadcastGameResult(address, result) {
    const client = clients.get(address);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: 'game_result',
            data: result
        }));
    }
}

// Monitor TON blockchain for deposits
async function monitorDeposits() {
    // In production, implement TON transaction monitoring
    // Check for deposits to casino wallet
    // Update user balances accordingly
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    monitorDeposits();
});
