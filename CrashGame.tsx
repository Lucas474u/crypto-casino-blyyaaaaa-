// src/components/CrashGame.tsx
import { useState, useEffect } from 'react';
import { useTonWallet } from "@tonconnect/ui-react";
import styled from 'styled-components';
import { placeBet } from '../utils/ton-utils';

const GameContainer = styled.div`
    padding: 20px;
`;

const MultiplierDisplay = styled.div<{ multiplier: number }>`
    font-size: 4rem;
    font-weight: bold;
    text-align: center;
    margin: 20px 0;
    color: ${props => props.multiplier > 1 ? '#00ff88' : '#ff4444'};
    text-shadow: 0 0 20px ${props => props.multiplier > 1 ? 
        'rgba(0, 255, 136, 0.5)' : 'rgba(255, 68, 68, 0.5)'};
    transition: all 0.1s ease;
`;

const Rocket = styled.div<{ flying: boolean }>`
    font-size: 3rem;
    animation: ${props => props.flying ? 'fly 2s infinite' : 'none'};
    transform: ${props => props.flying ? 'translateY(-20px)' : 'none'};
    
    @keyframes fly {
        0% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
        100% { transform: translateY(0); }
    }
`;

const BetButton = styled.button<{ color: string }>`
    background: ${props => props.color};
    border: none;
    padding: 15px 30px;
    border-radius: 10px;
    color: white;
    font-weight: bold;
    font-size: 1.2rem;
    cursor: pointer;
    margin: 10px;
    transition: all 0.3s ease;
    
    &:hover {
        transform: scale(1.05);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const CrashGame = () => {
    const wallet = useTonWallet();
    const [multiplier, setMultiplier] = useState(1.00);
    const [isFlying, setIsFlying] = useState(false);
    const [betAmount, setBetAmount] = useState('0.1');
    const [hasBet, setHasBet] = useState(false);
    const [cashedOut, setCashedOut] = useState(false);
    const [gameHistory, setGameHistory] = useState<number[]>([]);

    const startGame = async () => {
        if (!wallet) {
            alert('Please connect wallet first');
            return;
        }

        try {
            await placeBet(wallet, betAmount, 'crash', {});
            setHasBet(true);
            setIsFlying(true);
            setCashedOut(false);
            
            let currentMultiplier = 1.00;
            const crashPoint = 1 + Math.random() * 10; // Реальная логика с RNG
            
            const interval = setInterval(() => {
                currentMultiplier += 0.01;
                setMultiplier(parseFloat(currentMultiplier.toFixed(2)));
                
                if (currentMultiplier >= crashPoint) {
                    clearInterval(interval);
                    setIsFlying(false);
                    setHasBet(false);
                    setGameHistory(prev => [crashPoint, ...prev.slice(0, 9)]);
                    
                    if (!cashedOut) {
                        alert(`🚀 Crashed at ${crashPoint.toFixed(2)}x! You lost.`);
                    }
                }
            }, 100);
            
        } catch (error) {
            alert('Bet failed: ' + error);
        }
    };

    const cashOut = () => {
        if (hasBet) {
            setCashedOut(true);
            setIsFlying(false);
            setHasBet(false);
            const winAmount = (parseFloat(betAmount) * multiplier).toFixed(4);
            alert(`✅ Cashed out at ${multiplier.toFixed(2)}x! You won ${winAmount} TON`);
        }
    };

    return (
        <GameContainer>
            <Rocket flying={isFlying}>🚀</Rocket>
            <MultiplierDisplay multiplier={multiplier}>
                {multiplier.toFixed(2)}x
            </MultiplierDisplay>
            
            <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="0.1"
                step="0.1"
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            
            <div>
                <BetButton 
                    color="linear-gradient(135deg, #00b09b, #96c93d)"
                    onClick={startGame}
                    disabled={hasBet || !wallet}
                >
                    {hasBet ? 'FLYING...' : 'PLACE BET'}
                </BetButton>
                
                <BetButton 
                    color="linear-gradient(135deg, #ff7e5f, #feb47b)"
                    onClick={cashOut}
                    disabled={!hasBet || cashedOut}
                >
                    CASH OUT
                </BetButton>
            </div>
            
            <div style={{ marginTop: '20px' }}>
                <h4>Recent crashes:</h4>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {gameHistory.map((crash, i) => (
                        <span key={i} style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '5px 10px',
                            borderRadius: '5px'
                        }}>
                            {crash.toFixed(2)}x
                        </span>
                    ))}
                </div>
            </div>
        </GameContainer>
    );
};
