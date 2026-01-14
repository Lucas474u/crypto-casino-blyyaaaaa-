import React, { useState, useEffect } from 'react';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import './ConnectWallet.css';

const ConnectWallet: React.FC = () => {
  const wallet = useTonWallet();
  const [balance, setBalance] = useState<string>('0');

  // Получаем баланс кошелька
  useEffect(() => {
    if (wallet) {
      fetchBalance(wallet.account.address);
    }
  }, [wallet]);

  const fetchBalance = async (address: string) => {
    try {
      const response = await fetch(
        `https://tonapi.io/v2/accounts/${address}`
      );
      const data = await response.json();
      const tonBalance = (data.balance / 1000000000).toFixed(2);
      setBalance(tonBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  return (
    <div className="wallet-container">
      {wallet ? (
        <div className="wallet-connected">
          <div className="wallet-info">
            <span className="wallet-balance">
              <img src="/ton-icon.png" alt="TON" className="ton-icon-small" />
              {balance} TON
            </span>
            <div className="wallet-address">
              {`${wallet.account.address.slice(0, 6)}...${wallet.account.address.slice(-4)}`}
            </div>
          </div>
          <button className="btn-disconnect" onClick={() => window.location.reload()}>
            Disconnect
          </button>
        </div>
      ) : (
        <TonConnectButton 
          className="ton-connect-button"
          manifestUrl="https://miladsoft.github.io/ton-connect/tonconnect-manifest.json"
        />
      )}
    </div>
  );
};

export default ConnectWallet;
