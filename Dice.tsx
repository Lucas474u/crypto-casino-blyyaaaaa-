import React, { useState } from 'react';
import { useTonConnect } from '@tonconnect/ui-react';
import './Dice.css';

const Dice: React.FC = () => {
  const { sender, connected } = useTonConnect();
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [targetNumber, setTargetNumber] = useState<number>(50);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [result, setResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean>(false);
  const [winAmount, setWinAmount] = useState<string>('0');

  // Ваш админ адрес TON (замените на свой)
  const ADMIN_ADDRESS = 'UQDtXe2aK_1i5BzKdaRi0LseTW8PbuvrCcX7qfREHhJ0typh';
  
  const calculateMultiplier = (target: number) => {
    return (99 / target).toFixed(2);
  };

  const handleRoll = async () => {
    if (!connected) {
      alert('Please connect your wallet first!');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    setIsRolling(true);
    setResult(null);
    setWin(false);

    // Анимация броска
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Генерация случайного результата (1-100)
    const diceResult = Math.floor(Math.random() * 100) + 1;
    setResult(diceResult);

    const isWin = diceResult < targetNumber;
    setWin(isWin);

    if (isWin) {
      const multiplier = parseFloat(calculateMultiplier(targetNumber));
      const winnings = (amount * multiplier).toFixed(4);
      setWinAmount(winnings);
      
      // Отправка выигрыша на адрес игрока
      try {
        await sender.send({
          to: ADMIN_ADDRESS,
          value: Math.floor(amount * 1000000000), // Преобразование в nanotons
          bounce: false,
        });
      } catch (error) {
        console.error('Error sending winnings:', error);
      }
    } else {
      // Отправка проигрыша на админ адрес
      try {
        await sender.send({
          to: ADMIN_ADDRESS,
          value: Math.floor(amount * 1000000000), // Преобразование в nanotons
          bounce: false,
        });
      } catch (error) {
        console.error('Error sending bet:', error);
      }
    }

    setIsRolling(false);
  };

  const multiplier = calculateMultiplier(targetNumber);

  return (
    <div className="dice-game">
      <h2>DICE GAME</h2>
      
      <div className="dice-container">
        <div className={`dice ${isRolling ? 'rolling' : ''}`}>
          {result !== null ? result : '?'}
        </div>
      </div>

      <div className="game-controls">
        <div className="input-group">
          <label>Bet Amount (TON)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="0.1"
            step="0.1"
            disabled={isRolling}
          />
        </div>

        <div className="input-group">
          <label>Roll Under: {targetNumber}</label>
          <input
            type="range"
            min="1"
            max="95"
            value={targetNumber}
            onChange={(e) => setTargetNumber(parseInt(e.target.value))}
            disabled={isRolling}
          />
          <div className="multiplier-display">
            Multiplier: <span className="multiplier-value">{multiplier}x</span>
          </div>
        </div>

        <button 
          className={`roll-button ${isRolling ? 'rolling' : ''}`}
          onClick={handleRoll}
          disabled={isRolling}
        >
          {isRolling ? 'ROLLING...' : 'ROLL DICE'}
        </button>
      </div>

      {result !== null && (
        <div className={`result ${win ? 'win' : 'lose'}`}>
          <h3>{win ? '🎉 YOU WIN!' : '😔 YOU LOSE'}</h3>
          <p>Result: {result} (Target: under {targetNumber})</p>
          {win && (
            <p className="winnings">You won: {winAmount} TON</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dice;
