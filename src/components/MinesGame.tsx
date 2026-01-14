import { useState, useEffect } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { Bomb, Gem, Trophy, AlertCircle } from 'lucide-react'

const GRID_SIZE = 5
const TOTAL_MINES = 5

export default function MinesGame() {
  const [tonConnectUI] = useTonConnectUI()
  const [grid, setGrid] = useState<Array<'hidden' | 'mine' | 'gem'>>([])
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [betAmount, setBetAmount] = useState('1')
  const [multiplier, setMultiplier] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)

  useEffect(() => {
    initializeGrid()
  }, [])

  const initializeGrid = () => {
    const newGrid = Array(GRID_SIZE * GRID_SIZE).fill('hidden')
    const mines = new Set<number>()
    
    while (mines.size < TOTAL_MINES) {
      mines.add(Math.floor(Math.random() * GRID_SIZE * GRID_SIZE))
    }
    
    const finalGrid = newGrid.map((_, index) => 
      mines.has(index) ? 'mine' : 'gem'
    )
    
    setGrid(finalGrid)
    setRevealed(Array(GRID_SIZE * GRID_SIZE).fill(false))
    setMultiplier(1)
    setGameOver(false)
    setGameWon(false)
    setGameStarted(false)
  }

  const handleCellClick = (index: number) => {
    if (!gameStarted || gameOver || revealed[index]) return
    
    const newRevealed = [...revealed]
    newRevealed[index] = true
    setRevealed(newRevealed)
    
    if (grid[index] === 'mine') {
      setGameOver(true)
      // Отправка транзакции при проигрыше
      sendTransaction(false)
    } else {
      const gemCount = newRevealed.filter((r, i) => r && grid[i] === 'gem').length
      const newMultiplier = 1 + (gemCount * 0.2)
      setMultiplier(newMultiplier)
      
      if (gemCount === (GRID_SIZE * GRID_SIZE - TOTAL_MINES)) {
        setGameWon(true)
        setGameOver(true)
        // Отправка транзакции при выигрыше
        sendTransaction(true)
      }
    }
  }

  const startGame = async () => {
    if (!tonConnectUI.connected) {
      alert('Please connect wallet first')
      return
    }
    
    // Здесь будет логика отправки ставки
    setGameStarted(true)
  }

  const sendTransaction = async (isWin: boolean) => {
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", // Casino address
          amount: isWin 
            ? Math.floor(parseFloat(betAmount) * multiplier * 1000000000).toString()
            : "0",
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
      <div className="grid grid-cols-2 gap-8">
        {/* Левая часть - управление */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bomb className="w-6 h-6 text-red-400" />
              Game Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Bet Amount (TON)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0.1"
                    max="100"
                    step="0.1"
                    disabled={gameStarted}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1', '5'].map(amount => (
                      <button
                        key={amount}
                        onClick={() => !gameStarted && setBetAmount(amount)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Current Multiplier</span>
                  <span className="text-2xl font-bold text-green-400">x{multiplier.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Potential Win</span>
                  <span className="text-xl font-bold text-yellow-400">
                    {(parseFloat(betAmount) * multiplier).toFixed(2)} TON
                  </span>
                </div>
              </div>

              <button
                onClick={gameStarted ? initializeGrid : startGame}
                disabled={tonConnectUI.connected && !gameStarted && (!betAmount || parseFloat(betAmount) <= 0)}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  gameStarted
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90'
                }`}
              >
                {gameStarted ? 'Cash Out' : 'Start Game'}
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-blue-700/30">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              How to Play
            </h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• Select your bet amount</li>
              <li>• Click cells to reveal gems</li>
              <li>• Each gem increases multiplier by 0.2x</li>
              <li>• Hit a mine and lose your bet</li>
              <li>• Cash out anytime to collect winnings</li>
            </ul>
          </div>
        </div>

        {/* Правая часть - игровое поле */}
        <div>
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold mb-2">Minesweeper</h3>
            <p className="text-gray-400">Find gems, avoid mines</p>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {grid.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!gameStarted || gameOver}
                className={`aspect-square rounded-xl transition-all duration-300 flex items-center justify-center text-2xl ${
                  revealed[index]
                    ? cell === 'mine'
                      ? 'bg-gradient-to-br from-red-600 to-red-800 animate-pulse'
                      : 'bg-gradient-to-br from-emerald-500 to-green-700'
                    : 'bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
                } ${!gameStarted ? 'opacity-50' : ''}`}
              >
                {revealed[index] ? (
                  cell === 'mine' ? (
                    <Bomb className="w-8 h-8" />
                  ) : (
                    <Gem className="w-8 h-8 text-yellow-300" />
                  )
                ) : null}
              </button>
            ))}
          </div>

          {gameOver && (
            <div className={`text-center p-6 rounded-xl ${
              gameWon 
                ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-emerald-700'
                : 'bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-700'
            }`}>
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h4 className="text-2xl font-bold mb-2">
                {gameWon ? '🎉 You Won!' : '💥 Game Over!'}
              </h4>
              <p className="text-gray-300">
                {gameWon 
                  ? `You won ${(parseFloat(betAmount) * multiplier).toFixed(2)} TON!`
                  : 'Better luck next time!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
