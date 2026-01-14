import { useState, useEffect, useRef } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { Rocket, Zap, DollarSign, Timer } from 'lucide-react'

export default function CrashGame() {
  const [tonConnectUI] = useTonConnectUI()
  const [betAmount, setBetAmount] = useState('1')
  const [multiplier, setMultiplier] = useState(1.0)
  const [gameActive, setGameActive] = useState(false)
  const [cashedOut, setCashedOut] = useState(false)
  const [history, setHistory] = useState<number[]>([2.5, 1.8, 3.2, 1.1, 4.7])
  const [timeLeft, setTimeLeft] = useState(5)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (gameActive && !cashedOut) {
      gameRef.current = setInterval(() => {
        setMultiplier(prev => {
          const newMultiplier = prev + 0.01
          // Случайное падение с вероятностью 0.1% за каждый шаг
          if (Math.random() < 0.001) {
            endGame(false)
            return prev
          }
          return parseFloat(newMultiplier.toFixed(2))
        })
      }, 100)
    }

    return () => {
      if (gameRef.current) clearInterval(gameRef.current)
    }
  }, [gameActive, cashedOut])

  useEffect(() => {
    if (timeLeft > 0 && !gameActive) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !gameActive) {
      startGame()
    }
  }, [timeLeft, gameActive])

  const startGame = () => {
    if (!tonConnectUI.connected) {
      alert('Please connect wallet first')
      return
    }
    
    setMultiplier(1.0)
    setGameActive(true)
    setCashedOut(false)
  }

  const cashOut = () => {
    if (gameActive && !cashedOut) {
      endGame(true)
    }
  }

  const endGame = (userCashedOut: boolean) => {
    setGameActive(false)
    setCashedOut(true)
    if (gameRef.current) clearInterval(gameRef.current)
    
    if (userCashedOut) {
      // Добавляем результат в историю
      setHistory(prev => [multiplier, ...prev.slice(0, 4)])
      // Отправка транзакции
      sendTransaction(true)
    } else {
      // Игра упала
      sendTransaction(false)
    }
    
    // Перезапуск таймера
    setTimeout(() => {
      setTimeLeft(5)
    }, 2000)
  }

  const sendTransaction = async (isWin: boolean) => {
    const winAmount = isWin 
      ? parseFloat(betAmount) * multiplier * 0.98
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-8">
        {/* Левая часть - управление */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-orange-400" />
              Game Settings
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
                  disabled={gameActive}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white disabled:opacity-50"
                />
                <div className="flex gap-2 mt-2">
                  {['0.1', '0.5', '1', '5', '10'].map(amount => (
                    <button
                      key={amount}
                      onClick={() => !gameActive && setBetAmount(amount)}
                      disabled={gameActive}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex-1 disabled:opacity-50"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Current Bet</span>
                  <span className="text-lg font-bold">{betAmount} TON</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Multiplier</span>
                  <span className="text-2xl font-bold text-green-400">x{multiplier.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">Potential Win</span>
                  <span className="text-xl font-bold text-yellow-400">
                    {(parseFloat(betAmount) * multiplier).toFixed(2)} TON
                  </span>
                </div>
              </div>

              <button
                onClick={cashOut}
                disabled={!gameActive || cashedOut}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  gameActive && !cashedOut
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90'
                    : 'bg-gray-700 cursor-not-allowed'
                }`}
              >
                {cashedOut ? 'Cashed Out!' : 'Cash Out'}
              </button>

              <button
                onClick={startGame}
                disabled={gameActive || !tonConnectUI.connected}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                Place Bet
              </button>
            </div>
          </div>

          {/* История игр */}
          <div className="bg-gray-900/30 rounded-xl p-6">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Recent Games
            </h4>
            <div className="space-y-2">
              {history.map((mult, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Game #{history.length - index}</span>
                  <span className={`font-bold ${
                    mult > 2 ? 'text-green-400' : 
                    mult > 1.5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    x{mult.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Центральная часть - график */}
        <div className="col-span-2">
          <div className="relative h-[500px] bg-gray-900/30 rounded-2xl p-8 border border-gray-700">
            <div className="absolute top-8 left-8 right-8 bottom-8">
              {/* График множителя */}
              <div className="relative h-full">
                {/* Сетка */}
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border-t border-gray-700/50"></div>
                  ))}
                </div>
                
                {/* Кривая множителя */}
                <div className="relative h-full">
                  <svg className="w-full h-full">
                    <path
                      d={`M 0,${400} ${gameActive ? `Q 200,${400 - multiplier * 50} 400,${400 - multiplier * 100}` : ''}`}
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0088cc" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Текущий множитель */}
                <div className="absolute top-4 right-4">
                  <div className={`text-5xl font-bold animate-float ${
                    multiplier > 3 ? 'text-green-400' : 
                    multiplier > 2 ? 'text-yellow-400' : 
                    multiplier > 1 ? 'text-blue-400' : 'text-gray-400'
                  }`}>
                    x{multiplier.toFixed(2)}
                  </div>
                  {gameActive && (
                    <div className="text-center mt-2">
                      <div className="inline-flex items-center gap-2 bg-green-900/30 px-4 py-2 rounded-full border border-green-700">
                        <Rocket className="w-4 h-4" />
                        <span className="text-sm">Rocket flying!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Статистика */}
                <div className="absolute bottom-4 left-0 right-0">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <div className="text-2xl font-bold">{betAmount} TON</div>
                      <div className="text-gray-400 text-sm">Bet Amount</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{(parseFloat(betAmount) * multiplier).toFixed(2)} TON</div>
                      <div className="text-gray-400 text-sm">Current Win</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <Timer className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                      <div className="text-2xl font-bold">
                        {gameActive ? 'LIVE' : `${timeLeft}s`}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {gameActive ? 'Game Active' : 'Next Round'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Инструкция */}
            <div className="absolute bottom-4 right-4 max-w-xs">
              <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
                <h4 className="font-bold mb-2">🎮 How to Play</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Place your bet before timer hits 0</li>
                  <li>• Multiplier increases over time</li>
                  <li>• Cash out before crash to win</li>
                  <li>• If you don't cash out before crash, you lose</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Индикаторы */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Low Risk', mult: '1.5x', color: 'green' },
              { label: 'Medium', mult: '2.5x', color: 'yellow' },
              { label: 'High Risk', mult: '5x', color: 'orange' },
              { label: 'Extreme', mult: '10x', color: 'red' },
            ].map((item, index) => (
              <div key={index} className={`bg-gray-900/50 rounded-xl p-4 text-center border ${
                multiplier >= parseFloat(item.mult) 
                  ? `border-${item.color}-500` 
                  : 'border-gray-700'
              }`}>
                <div className={`text-2xl font-bold text-${item.color}-400`}>
                  {item.mult}
                </div>
                <div className="text-gray-400 text-sm mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
