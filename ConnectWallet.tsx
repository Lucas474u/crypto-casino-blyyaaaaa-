// src/components/ConnectWallet.tsx
import { TonConnectButton, useTonWallet } from "@tonconnect/ui-react";
import styled from "styled-components";

const ConnectWalletContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    margin: 20px auto;
    max-width: 400px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
    }
`;

const WalletInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    font-weight: 600;
    font-size: 16px;
`;

const BalanceDisplay = styled.div`
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
`;

export const ConnectWallet = () => {
    const wallet = useTonWallet();
    
    return (
        <ConnectWalletContainer>
            {wallet ? (
                <WalletInfo>
                    <span>✅ Connected</span>
                    <BalanceDisplay>
                        {wallet.account.balance ? 
                            `${(parseInt(wallet.account.balance) / 1000000000).toFixed(2)} TON` : 
                            'Loading...'}
                    </BalanceDisplay>
                </WalletInfo>
            ) : (
                <TonConnectButton 
                    className="custom-button"
                    style={{
                        borderRadius: '10px',
                        padding: '12px 24px',
                        fontWeight: '600',
                        fontSize: '16px',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                />
            )}
        </ConnectWalletContainer>
    );
};
