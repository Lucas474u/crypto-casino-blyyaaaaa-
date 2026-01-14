import { useState, useEffect } from 'react';
import { useTonWallet } from "@tonconnect/ui-react";
import styled, { keyframes } from 'styled-components';

const diceRoll = keyframes`
    0% { transform: rotate(0deg); }
    25% { transform: rotate(90deg); }
    50% { transform: rotate(180deg); }
    75% { transform: rotate(270deg); }
    100% { transform: rotate(360deg); }
`;

const DiceContainer = styled.div`
    background: rgba(0, 0, 0, 0.2);
    border-radius: 20px;
    padding: 30px;
    margin: 20px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Dice = styled.div<{ rolling: boolean; value: number }>`
    width: 100px;
    height: 100px;
    background: white;
    border-radius: 15px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
    font-weight: bold;
    color: #333;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: ${props => props.rolling ? diceRoll : 'none'} 0.5s linear infinite;
    transform: ${props => !props.rolling ? `rotate(${props.value * 60}deg)` : 'none'};
`;

const BetControls = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 20px 0;
`;

const BetButton = styled.button<{ active?: boolean }>`
    padding: 15px;
    border: none;
    border-radius: 10px;
    background: ${props => props.active 
        ? 'linear-gradient(135deg, #667eea, #764ba2)' 
        : 'rgba(255, 255, 255, 0.1)'};
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const PlayButton = styled.button`
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border: none;
    padding: 20px;
    border-radius: 15px;
    color: white;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
    margin-top: 20px;
    transition: all 0.3s ease;
    
    &:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ResultDisplay = styled.div<{ win: boolean }>`
    text-align: center;
    font-size: 1.5rem;
    margin: 20px 0;
    padding: 15px;
    border-radius: 10px;
    background: ${props => props.win 
        ? 'rgba(0, 255, 136, 0.1)' 
        : 'rgba(255, 68, 68, 0.1)'};
    color: ${props => props.win ? '#00ff88' : '#ff4444'};
    border: 2px solid ${props => props.win 
        ? 'rgba(0, 255, 136, 0.3)' 
        : 'rgba(255, 68, 68, 0.3)'};
`;

export const DiceGame = () => {
    const wallet = useTonWallet();
    const [betAmount, setBetAmount] = useState(0.1);
    const [selectedNumber, setSelectedNumber] = useState<number>(1);
    const [isRolling, setIsRolling] = useState(false);
    const [diceValue, setDiceValue] = useState(1);
    const [result, setResult] = useState<{win: boolean, multiplier: number} | null>(null);
    const [balance, setBalance] = useState(0);
    const [clientSeed, setClientSeed] = useState('');

    useEffect(() => {
        // Generate client seed on load
        setClientSeed(generateRandomSeed());
    }, []);

    const generateRandomSeed = () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const placeBet = async () => {
        if (!wallet) {
            alert('Please connect wallet first');
            return;
        }

        setIsRolling(true);
        setResult(null);

        try {
            // Start game session on backend
            const response = await fetch('/api/game/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${wallet.account.address}`
                },
                body: JSON.stringify({
                    address: wallet.account.address,
                    gameType: 'dice',
                    betAmount,
                    clientSeed
                })
            });

            const data = await response.json();

            // Simulate dice roll animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get game result
            const resultResponse = await fetch('/api/game/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: data.sessionId,
                    action: { selectedNumber }
                })
            });

            const resultData = await resultResponse.json();

            // Calculate win
            const win = resultData.winAmount > 0;
            const multiplier = win ? 2 : 0;
            
            setDiceValue(selectedNumber);
            setResult({
                win,
                multiplier
            });

            // Update balance
            if (win) {
                setBalance(prev => prev + (betAmount * multiplier));
            } else {
                setBalance(prev => prev - betAmount);
            }

            // Generate new client seed for next game
            setClientSeed(generateRandomSeed());

        } catch (error) {
            console.error('Game error:', error);
            alert('Game error: ' + error);
        } finally {
            setIsRolling(false);
        }
    };

    const quickBets = [0.1, 0.5, 1, 2, 5, 10];
    const numbers = [1, 2, 3, 4, 5, 6];

    return (
        <DiceContainer>
            <h3>🎲 Dice Game</h3>
            <p>Choose a number (1-6). Win 2x if dice matches your number.</p>
            
            <Dice rolling={isRolling} value={diceValue}>
                {isRolling ? '🎲' : diceValue}
            </Dice>

            {result && (
                <ResultDisplay win={result.win}>
                    {result.win 
                        ? `🎉 You won ${(betAmount * result.multiplier).toFixed(4)} TON!` 
                        : '😢 You lost'}
                </ResultDisplay>
            )}

            <div style={{ margin: '20px 0' }}>
                <label>Bet Amount (TON):</label>
                <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                    min="0.1"
                    step="0.1"
                    style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '5px',
                        borderRadius: '5px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white'
                    }}
                />
                
                <BetControls>
                    {quickBets.map(amount => (
                        <BetButton
                            key={amount}
                            active={betAmount === amount}
                            onClick={() => setBetAmount(amount)}
                        >
                            {amount} TON
                        </BetButton>
                    ))}
                </BetControls>
            </div>

            <div style={{ margin: '20px 0' }}>
                <label>Select Number:</label>
                <BetControls>
                    {numbers.map(num => (
                        <BetButton
                            key={num}
                            active={selectedNumber === num}
                            onClick={() => setSelectedNumber(num)}
                        >
                            {num}
                        </BetButton>
                    ))}
                </BetControls>
            </div>

            <PlayButton 
                onClick={placeBet}
                disabled={isRolling || !wallet}
            >
                {isRolling ? '🎲 Rolling...' : `ROLL DICE - BET ${betAmount} TON`}
            </PlayButton>

            {wallet && (
                <div style={{ 
                    marginTop: '20px', 
                    fontSize: '0.9rem',
                    opacity: 0.7,
                    textAlign: 'center'
                }}>
                    <div>Client Seed: {clientSeed.substring(0, 16)}...</div>
                    <div>Provably Fair - Seeds revealed after game</div>
                </div>
            )}
        </DiceContainer>
    );
};
