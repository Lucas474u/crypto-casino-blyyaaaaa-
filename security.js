const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SecurityManager {
    constructor() {
        this.rateLimits = new Map();
    }

    // Anti-bot protection
    verifyHumanInteraction(sessionId, token) {
        // Implement CAPTCHA or other verification
        return true;
    }

    // Fraud detection
    detectFraudulentPattern(transactions) {
        const patterns = {
            rapidBets: transactions.filter(t => 
                t.type === 'bet' && 
                Date.now() - t.createdAt < 1000
            ).length > 5,
            
            depositImmediateWithdraw: transactions.some(t => 
                t.type === 'deposit' && 
                transactions.some(w => 
                    w.type === 'withdraw' && 
                    w.createdAt - t.createdAt < 30000
                )
            )
        };

        return Object.values(patterns).some(p => p);
    }

    // Session management
    createSession(userAddress) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const token = jwt.sign(
            { address: userAddress, sessionId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return { sessionId, token };
    }

    verifySignature(message, signature, publicKey) {
        // Verify TON wallet signature
        // Implement using ton-crypto library
        return true;
    }

    // Rate limiting per IP
    checkRateLimit(ip, endpoint) {
        const key = `${ip}:${endpoint}`;
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }
        
        const requests = this.rateLimits.get(key);
        const recentRequests = requests.filter(time => now - time < windowMs);
        
        // Clean old requests
        this.rateLimits.set(key, recentRequests);
        
        // Check limit
        if (recentRequests.length >= 60) { // 60 requests per minute
            return false;
        }
        
        recentRequests.push(now);
        return true;
    }
}

module.exports = SecurityManager;
