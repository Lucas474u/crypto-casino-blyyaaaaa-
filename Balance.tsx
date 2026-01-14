// src/components/Balance.tsx
import { useState, useEffect } from 'react';
import { useTonWallet } from "@tonconnect/ui-react";
import styled from 'styled-components';
import { depositTON, withdrawTON, getBalance } from '../utils/ton-utils';

const BalanceContainer = styled.div`
    background: rgba(0, 0, 0, 0.3);
    border-radius: 15px;
    padding: 20px;
    margin: 20px auto;
    max-width: 500px;
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BalanceAmount = styled.div`
    font-size: 2.5rem;
    font-weight: bold;
    background: linear-gradient(to right, #00b4db, #0083b0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    margin: 10px 0;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
`;

const ActionButton = styled.button<{ variant: 'deposit' | 'withdraw' }>`
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    background: ${props => props.variant === 'deposit' 
        ? 'linear-gradient(135deg, #00b09b, #96c93d)' 
        : 'linear-gradient(135deg, #ff7e5f, #feb47b)'};
    color: white;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.2);
    color: white;
    font-size: 16px;
    margin: 10px 0;
    
    &:focus {
        outline: none;
        border-color: #667eea;
    }
`;

export const PlayerBalance = () => {
    const wallet = useTonWallet();
    const [balance, setBalance] = useState<string>('0');
    const [amount, setAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (wallet) {
            fetchBalance();
        }
    }, [wallet]);

    const fetchBalance = async () => {
        if (wallet) {
            const userBalance = await getBalance(wallet.account.address);
            setBalance(userBalance);
        }
    };

    const handleDeposit = async () => {
        if (!wallet || !amount || parseFloat(amount) <= 0) return;
        
        setLoading(true);
        try {
            await depositTON(wallet, amount);
            await fetchBalance();
            setAmount('');
            alert('✅ Deposit successful!');
        } catch (error) {
            alert('❌ Deposit failed: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!wallet || !amount || parseFloat(amount) <= 0) return;
        
        setLoading(true);
        try {
            await withdrawTON(wallet, amount);
            await fetchBalance();
            setAmount('');
            alert('✅ Withdrawal successful!');
        } catch (error) {
            alert('❌ Withdrawal failed: ' + error);
        } finally {
            setLoading(false);
        }
    };

    if (!wallet) {
        return (
            <BalanceContainer>
                <p>Connect your wallet to see balance</p>
            </BalanceContainer>
        );
    }

    return (
        <BalanceContainer>
            <h3>Your Casino Balance</h3>
            <BalanceAmount>{balance} TON</BalanceAmount>
            
            <Input
                type="number"
                placeholder="Enter amount in TON"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.1"
                step="0.1"
            />
            
            <ButtonGroup>
                <ActionButton 
                    variant="deposit" 
                    onClick={handleDeposit}
                    disabled={loading || !amount}
                >
                    {loading ? 'Processing...' : '💰 Deposit'}
                </ActionButton>
                
                <ActionButton 
                    variant="withdraw" 
                    onClick={handleWithdraw}
                    disabled={loading || !amount}
                >
                    {loading ? 'Processing...' : '💸 Withdraw'}
                </ActionButton>
            </ButtonGroup>
        </BalanceContainer>
    );
};
