import { Coins, Shield, Trophy, Globe } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-ton-blue to-ton-purple rounded-xl">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-ton-blue to-ton-purple bg-clip-text text-transparent">
                TON Casino
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-3 h-3 text-green-400" />
                <span>Provably Fair</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-2 text-green-400">
                <Trophy className="w-4 h-4" />
                <span className="font-bold">24,589</span>
              </div>
              <div className="text-xs text-gray-400">Games Won</div>
            </div>
            <div className="text-center">
              <div className="font-bold">2,458.75</div>
              <div className="text-xs text-gray-400">TON Wagered</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-yellow-400">48.7%</div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all">
              <Globe className="w-5 h-5" />
              <span>EN</span>
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {['English', 'Russian', 'Chinese', 'Spanish'].map((lang) => (
                <button
                  key={lang}
                  className="w-full px-4 py-3 text-left hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
