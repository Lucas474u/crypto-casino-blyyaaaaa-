import { useTonWallet } from '@tonconnect/ui-react'
import { Coins, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function Balance() {
  const wallet = useTonWallet()
  const [balance, setBalance] = useState<string>('0.00')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshBalance = async () => {
    if (!wallet) return
    setIsRefreshing(true)
    // Здесь будет логика получения баланса через TON API
    setTimeout(() => {
      setBalance('15.75') // Пример баланса
      setIsRefreshing(false)
    }, 1000)
  }

  if (!wallet) return null

  return (
    <div className="max-w-md mx-auto mb-8">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-ton-gold to-yellow-600 rounded-xl">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Your Balance</h3>
              <p className="text-gray-400 text-sm">TON Mainnet</p>
            </div>
          </div>
          <button
            onClick={refreshBalance}
            disabled={isRefreshing}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="text-center">
          <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-ton-gold bg-clip-text text-transparent">
            {balance} TON
          </div>
          <p className="text-gray-400 text-sm">≈ ${(parseFloat(balance) * 2.5).toFixed(2)} USD</p>
        </div>
      </div>
    </div>
  )
}
