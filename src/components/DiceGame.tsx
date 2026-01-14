import { useState } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { Dice5, Target, TrendingUp, TrendingDown } from 'lucide-react'

export default function DiceGame() {
  const [tonConnectUI] = useTonConnectUI()
  const [betAmount, setBetAmount] = useState('1')
  const [targetNumber, setTargetNumber] = useState(50)
  const [result, setResult] = useState<number | null>(null)
  const [win, setWin] = useState<boolean | null>(null)
  const [rolling, setRolling] = useState(false)

  const rollDice = async () => {
    if (!tonConnectUI.connected) {
      alert('Please connect wallet first')
      return
    }

    setRolling(true)
    
    // Симуляция броска с анимацией
    setTimeout(() => {
      const rollResult = Math.floor(Math.random() * 100) + 1
      setResult(rollResult)
      const isWin = rollResult > targetNumber
      setWin(isWin)
      setRolling(false)
      
      // Отправка транзакции
      sendTransaction(isWin)
    }, 2000)
  }

  const sendTransaction = async (isWin: boolean) => {
    const winAmount = isWin 
      ? parseFloat(betAmount) * (100 / (100 - targetNumber)) * 0.98
      : 0

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
          amount: Math.floor(winAmount * 1000000000).toString(),
        }
      ]
    }

    try {
      await tonConnectUI.sendTransaction(transaction)
    } catch (e) {
      console.error('Transaction error:', e)
    }
  }

  const calculatePayout = () => {
    if (targetNumber >= 99) return 1.01
    return parseFloat(((100 / (100 - targetNumber)) * 0.98).toFixed(2))
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-8">
        {/* Левая часть - управление */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Dice5 className="w-6 h-6 text-purple-400" />
              Dice Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Bet Amount (TON)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.1"
                  max="100"
                  step="0.1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
                <div className="flex gap-2 mt-2">
                  {['0.1', '0.5', '1', '5', '10'].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex-1"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">
                  Target Number: <span className="text-white font-bold">{targetNumber}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ton-blue"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>Roll Over 1</span>
                  <span>Roll Over 99</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Win Chance</span>
                  <span className="text-lg font-bold text-green-400">
                    {100 - targetNumber}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Payout</span>
                  <span className="text-xl font-bold text-yellow-400">
                    x{calculatePayout()}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">Potential Win</span>
                  <span className="text-lg font-bold text-white">
                    {(parseFloat(betAmount) * calculatePayout()).toFixed(2)} TON
                  </span>
                </div>
              </div>

              <button
                onClick={rollDice}
                disabled={rolling || !tonConnectUI.connected}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {rolling ? 'Rolling...' : 'Roll Dice'}
              </button>
            </div>
          </div>
        </div>

        {/* Правая часть - игровое поле */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-8">
            <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-1000 ${
              rolling ? 'animate-spin border-purple-500' : 
              win === true ? 'border-green-500' : 
              win === false ? 'border-red-500' : 'border-gray-700'
            }`}>
              <div className="text-center">
                {result ? (
                  <>
                    <div className="text-6xl font-bold mb-2">{result}</div>
                    <div className="text-lg text-gray-400">Result</div>
                    <div className={`mt-4 flex items-center justify-center gap-2 text-xl font-bold ${
                      win ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {win ? (
                        <>
                          <TrendingUp className="w-6 h-6" />
                          WIN!
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-6 h-6" />
                          LOSE
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Dice5 className="w-32 h-32 mx-auto text-gray-600" />
                    <div className="mt-4 text-gray-400">Click Roll to start</div>
                  </>
                )}
              </div>
            </div>
            
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 px-6 py-2 rounded-full border border-gray-700">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="font-bold">Target: {targetNumber}+</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-gray-900/50 rounded-xl p-4 text-center">
              <div className="text-gray-400 mb-1">Win Chance</div>
              <div className="text-2xl font-bold text-green-400">{100 - targetNumber}%</div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 text-center">
              <div className="text-gray-400 mb-1">Payout</div>
              <div className="text-2xl font-bold text-yellow-400">x{calculatePayout()}</div>
            </div>
          </div>

          {result !== null && (
            <div className={`mt-8 p-4 rounded-lg w-full text-center ${
              win 
                ? 'bg-green-900/30 border border-green-700' 
                : 'bg-red-900/30 border border-red-700'
            }`}>
              <p className="text-lg">
                {win 
                  ? `🎉 You won ${(parseFloat(betAmount) * calculatePayout()).toFixed(2)} TON!`
                  : `💔 You lost ${betAmount} TON`}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Rolled {result} vs Target {targetNumber}+
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
