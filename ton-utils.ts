// src/utils/ton-utils.ts
import { SendTransactionRequest } from "@tonconnect/ui-react";
import { TON_CONFIG } from '../config/ton-connect.config';
import { Address, toNano } from 'ton';

export async function depositTON(wallet: any, amount: string) {
    const transaction: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
            {
                address: TON_CONFIG.CASINO_ADDRESS,
                amount: toNano(amount).toString(),
                payload: 'Deposit to casino' // Можно добавить кастомную логику
            }
        ]
    };
    
    return wallet.sendTransaction(transaction);
}

export async function withdrawTON(wallet: any, amount: string) {
    const transaction: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            {
                address: wallet.account.address,
                amount: toNano(amount).toString(),
                payload: 'Withdraw from casino'
            }
        ]
    };
    
    return wallet.sendTransaction(transaction);
}

export async function placeBet(wallet: any, amount: string, gameType: string, betData: any) {
    const transaction: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            {
                address: TON_CONFIG.CASINO_ADDRESS,
                amount: toNano(amount).toString(),
                payload: JSON.stringify({
                    type: 'bet',
                    game: gameType,
                    data: betData,
                    timestamp: Date.now()
                })
            }
        ]
    };
    
    return wallet.sendTransaction(transaction);
}

export async function getBalance(address: string): Promise<string> {
    try {
        const response = await fetch(`${TON_CONFIG.RPC_URL}/getAddressBalance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: address
            })
        });
        
        const data = await response.json();
        return (parseInt(data.result) / 1000000000).toFixed(2);
    } catch (error) {
        console.error('Error fetching balance:', error);
        return '0';
    }
}

export async function sendWin(address: string, amount: string) {
    // Функция для отправки выигрыша с вашего адреса
    const transaction: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
            {
                address: address,
                amount: toNano(amount).toString(),
                payload: 'You win!'
            }
        ]
    };
    
    return transaction;
}
