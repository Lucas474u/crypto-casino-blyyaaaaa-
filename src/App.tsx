import { useState } from 'react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import Header from './components/Header'
import WalletConnect from './components/WalletConnect'
import MinesGame from './components/MinesGame'
import DiceGame from './components/DiceGame'
import CrashGame from './components/CrashGame'
import Balance from './components/Balance'

const manifestUrl = 'https://yourdomain.com/manifest.json'

function App() {
  const [activeGame, setActiveGame] = useState<'mines' | 'dice' | 'crash'>('mines')

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Wallet Connect Section */}
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-ton-blue to-ton-purple bg-clip-text text-transparent">
              TON Casino
            </h1>
            <p className="text-gray-400 mb-6">Play fair games on TON blockchain. Provably fair and transparent.</p>
            <WalletConnect />
          </div>

          {/* Balance Display */}
          <Balance />

          {/* Game Selection */}
          <div className="mb-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setActiveGame('mines')}
              className={`px-8 py-3 rounded-lg font-bold transition-all ${
                activeGame === 'mines'
                  ? 'bg-gradient-to-r from-ton-blue to-ton-purple shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              💎 Mines
            </button>
            <button
              onClick={() => setActiveGame('dice')}
              className={`px-8 py-3 rounded-lg font-bold transition-all ${
                activeGame === 'dice'
                  ? 'bg-gradient-to-r from-ton-blue to-ton-purple shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              🎲 Dice
            </button>
            <button
              onClick={() => setActiveGame('crash')}
              className={`px-8 py-3 rounded-lg font-bold transition-all ${
                activeGame === 'crash'
                  ? 'bg-gradient-to-r from-ton-blue to-ton-purple shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              📈 Crash
            </button>
          </div>

          {/* Game Area */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
            {activeGame === 'mines' && <MinesGame />}
            {activeGame === 'dice' && <DiceGame />}
            {activeGame === 'crash' && <CrashGame />}
          </div>

          {/* Provably Fair Info */}
          <div className="mt-12 text-center text-gray-400">
            <p className="mb-2">🔒 All games are provably fair using on-chain randomness</p>
            <p>💎 Every transaction is recorded on the TON blockchain</p>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 py-6 border-t border-gray-800 text-center text-gray-500">
          <p>TON Casino © {new Date().getFullYear()} • Play responsibly</p>
          <p className="text-sm mt-2">
            House edge: 2% • Min bet: 0.1 TON • Max bet: 100 TON
          </p>
        </footer>
      </div>
    </TonConnectUIProvider>
  )
}

export default App
