const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ton-casino', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Модели
const UserSchema = new mongoose.Schema({
    address: { type: String, unique: true, required: true },
    balance: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    totalWagered: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    referralCode: { type: String, unique: true },
    referrer: { type: String, default: null },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    referralEarnings: { type: Number, default: 0 },
    lastDailyBonus: { type: Date },
    dailyStreak: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'bet', 'win', 'bonus', 'referral'], required: true },
    amount: { type: Number, required: true },
    game: { type: String, enum: ['crash', 'mines', null] },
    details: { type: Object },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    txHash: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const GameSessionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: String, required: true },
    bet: { type: Number, required: true },
    result: { type: Number },
    multiplier: { type: Number },
    profit: { type: Number },
    endedAt: { type: Date }
});

const BonusSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['daily', 'referral', 'level_up'], required: true },
    amount: { type: Number, required: true },
    claimed: { type: Boolean, default: false },
    claimedAt: { type: Date },
    expiresAt: { type: Date }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const GameSession = mongoose.model('GameSession', GameSessionSchema);
const Bonus = mongoose.model('Bonus', BonusSchema);

// Генерация реферального кода
function generateReferralCode(address) {
    const hash = require('crypto').createHash('sha256').update(address).digest('hex');
    return hash.substring(0, 8).toUpperCase();
}

// Аутентификация middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// API Routes

// Регистрация пользователя
app.post('/api/user/register', async (req, res) => {
    try {
        const { address, referrer } = req.body;

        let user = await User.findOne({ address });
        
        if (user) {
            return res.json(user);
        }

        // Создаем нового пользователя
        const referralCode = generateReferralCode(address);
        user = new User({
            address,
            referralCode,
            referrer: referrer || null
        });

        await user.save();

        // Если есть реферер, начисляем бонус
        if (referrer) {
            const referrerUser = await User.findOne({ referralCode: referrer });
            if (referrerUser) {
                referrerUser.referrals.push(user._id);
                await referrerUser.save();

                // Создаем бонус за реферала
                const bonus = new Bonus({
                    user: referrerUser._id,
                    type: 'referral',
                    amount: 0.5 // 0.5 TON за реферала
                });
                await bonus.save();
            }
        }

        res.json(user);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Получение информации о пользователе
app.get('/api/user/:address', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ address: req.params.address })
            .populate('referrals', 'address balance createdAt');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Пополнение баланса
app.post('/api/user/deposit', authenticate, async (req, res) => {
    try {
        const { amount, txHash } = req.body;
        
        // Валидация транзакции на блокчейне
        // Здесь должна быть проверка TON транзакции
        
        // Обновляем баланс пользователя
        req.user.balance += amount;
        await req.user.save();

        // Создаем транзакцию
        const transaction = new Transaction({
            user: req.user._id,
            type: 'deposit',
            amount,
            txHash,
            status: 'completed'
        });
        await transaction.save();

        res.json({ success: true, balance: req.user.balance });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: 'Deposit failed' });
    }
});

// Вывод средств
app.post('/api/user/withdraw', authenticate, async (req, res) => {
    try {
        const { amount, address } = req.body;

        if (req.user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Комиссия казино 2%
        const casinoFee = amount * 0.02;
        const withdrawAmount = amount - casinoFee;

        // Обновляем баланс
        req.user.balance -= amount;
        await req.user.save();

        // Создаем транзакцию на вывод
        const transaction = new Transaction({
            user: req.user._id,
            type: 'withdraw',
            amount: -withdrawAmount,
            details: { to: address, fee: casinoFee },
            status: 'pending'
        });
        await transaction.save();

        // Здесь должна быть логика отправки TON на указанный адрес
        // sendTON(address, withdrawAmount);

        res.json({ success: true, amount: withdrawAmount, fee: casinoFee });
    } catch (error) {
        console.error('Withdraw error:', error);
        res.status(500).json({ error: 'Withdraw failed' });
    }
});

// Получение транзакций
app.get('/api/user/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Ежедневный бонус
app.post('/api/bonus/daily', authenticate, async (req, res) => {
    try {
        const now = new Date();
        const lastClaim = req.user.lastDailyBonus;
        
        // Проверяем, можно ли получить бонус
        if (lastClaim) {
            const lastClaimDate = new Date(lastClaim);
            const diffHours = (now - lastClaimDate) / (1000 * 60 * 60);
            
            if (diffHours < 24) {
                const waitHours = Math.ceil(24 - diffHours);
                return res.status(400).json({ 
                    error: `Please wait ${waitHours} hours` 
                });
            }
            
            // Проверяем стрик
            const diffDays = Math.floor((now - lastClaimDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                // Продолжаем стрик
                req.user.dailyStreak += 1;
            } else {
                // Сбрасываем стрик
                req.user.dailyStreak = 1;
            }
        } else {
            req.user.dailyStreak = 1;
        }
        
        // Рассчитываем бонус
        const baseBonus = 0.1; // 0.1 TON
        const streakBonus = req.user.dailyStreak * 0.01; // +0.01 TON за каждый день стрика
        const totalBonus = baseBonus + streakBonus;
        
        // Начисляем бонус
        req.user.balance += totalBonus;
        req.user.lastDailyBonus = now;
        await req.user.save();
        
        // Создаем транзакцию
        const transaction = new Transaction({
            user: req.user._id,
            type: 'bonus',
            amount: totalBonus,
            details: { type: 'daily', streak: req.user.dailyStreak }
        });
        await transaction.save();
        
        res.json({
            success: true,
            amount: totalBonus,
            streak: req.user.dailyStreak
        });
        
    } catch (error) {
        console.error('Daily bonus error:', error);
        res.status(500).json({ error: 'Failed to claim bonus' });
    }
});

// Реферальные бонусы
app.get('/api/bonus/referral', authenticate, async (req, res) => {
    try {
        const bonuses = await Bonus.find({
            user: req.user._id,
            type: 'referral',
            claimed: false
        });
        
        res.json(bonuses);
    } catch (error) {
        console.error('Get referral bonuses error:', error);
        res.status(500).json({ error: 'Failed to get bonuses' });
    }
});

// Запись игры
app.post('/api/game/log', authenticate, async (req, res) => {
    try {
        const { game, bet, result, multiplier, profit } = req.body;
        
        // Создаем сессию игры
        const gameSession = new GameSession({
            user: req.user._id,
            game,
            bet,
            result,
            multiplier,
            profit,
            endedAt: new Date()
        });
        await gameSession.save();
        
        // Обновляем статистику пользователя
        req.user.totalWagered += bet;
        req.user.totalProfit += profit || 0;
        
        // Добавляем опыт
        const xpGained = Math.floor(bet * 10);
        req.user.xp += xpGained;
        
        // Проверяем уровень
        const xpForNextLevel = req.user.level * 1000;
        if (req.user.xp >= xpForNextLevel) {
            req.user.level += 1;
            req.user.xp = req.user.xp - xpForNextLevel;
            
            // Награда за уровень
            const levelBonus = req.user.level * 0.1;
            req.user.balance += levelBonus;
            
            // Создаем бонус за уровень
            const bonus = new Bonus({
                user: req.user._id,
                type: 'level_up',
                amount: levelBonus
            });
            await bonus.save();
        }
        
        await req.user.save();
        
        // Если был реферер, начисляем комиссию
        if (req.user.referrer) {
            const referrerUser = await User.findOne({ referralCode: req.user.referrer });
            if (referrerUser) {
                const referralCommission = bet * 0.05; // 5% комиссия
                referrerUser.referralEarnings += referralCommission;
                referrerUser.balance += referralCommission;
                await referrerUser.save();
                
                // Логируем реферальную комиссию
                const referralTransaction = new Transaction({
                    user: referrerUser._id,
                    type: 'referral',
                    amount: referralCommission,
                    details: { from: req.user.address, bet }
                });
                await referralTransaction.save();
            }
        }
        
        res.json({ success: true, xpGained, level: req.user.level });
        
    } catch (error) {
        console.error('Game log error:', error);
        res.status(500).json({ error: 'Failed to log game' });
    }
});

// Лидерборд
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { period = 'daily' } = req.query;
        
        let startDate;
        const now = new Date();
        
        switch (period) {
            case 'daily':
                startDate = new Date(now.setDate(now.getDate() - 1));
                break;
            case 'weekly':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'monthly':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            default:
                startDate = new Date(0); // Все время
        }
        
        const leaderboard = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $project: {
                    address: 1,
                    level: 1,
                    totalProfit: 1,
                    totalWagered: 1
                }
            },
            {
                $sort: { totalProfit: -1 }
            },
            {
                $limit: 100
            }
        ]);
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Статистика платформы
app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalWagered = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$totalWagered" } } }
        ]);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyUsers = await User.countDocuments({ createdAt: { $gte: today } });
        const dailyVolume = await GameSession.aggregate([
            { $match: { endedAt: { $gte: today } } },
            { $group: { _id: null, total: { $sum: "$bet" } } }
        ]);
        
        res.json({
            totalUsers,
            totalWagered: totalWagered[0]?.total || 0,
            dailyUsers,
            dailyVolume: dailyVolume[0]?.total || 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
