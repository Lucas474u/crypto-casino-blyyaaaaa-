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
                  {['0.1', '0.5', '1', '5', '10'].map(amount
