import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react'
import { Wallet, Coins } from 'lucide-react'

export default function WalletConnect() {
  const [tonConnectUI] = useTonConnectUI()
  const address = useTonAddress()
  const userFriendlyAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  const connectWallet = () => {
    tonConnectUI.openModal()
  }

  const disconnectWallet = () => {
    tonConnectUI.disconnect()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {address ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-green-900/30 to-emerald-900/30 px-6 py-3 rounded-xl border border-emerald-700">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span className="font-mono font-bold text-emerald-300">
              {userFriendlyAddress}
            </span>
          </div>
          <button
            onClick={disconnectWallet}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl hover:opacity-90 transition-all font-bold flex items-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="px-8 py-4 bg-gradient-to-r from-ton-blue to-ton-purple rounded-xl hover:scale-105 transition-all font-bold text-lg animate-pulse-glow flex items-center gap-3"
        >
          <Wallet className="w-6 h-6" />
          Connect Wallet
        </button>
      )}
    </div>
  )
}
