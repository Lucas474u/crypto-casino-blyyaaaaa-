// src/App.tsx
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import styled, { createGlobalStyle } from 'styled-components';
import { ConnectWallet } from './components/ConnectWallet';
import { CasinoGames } from './components/CasinoGames';
import { PlayerBalance } from './components/Balance';
import { TON_CONFIG } from './config/ton-connect.config';

const GlobalStyle = createGlobalStyle`
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
        color: white;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        min-height: 100vh;
        overflow-x: hidden;
    }
`;

const AppContainer = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
`;

const Header = styled.header`
    text-align: center;
    padding: 40px 20px;
    
    h1 {
        font-size: 3.5rem;
        background: linear-gradient(to right, #ff7e5f, #feb47b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
        text-shadow: 0 2px 10px rgba(255, 255, 255, 0.1);
    }
    
    p {
        font-size: 1.2rem;
        opacity: 0.8;
        margin-bottom: 30px;
    }
`;

const GamesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 25px;
    margin-top: 40px;
`;

const GameCard = styled.div`
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 30px;
    transition: all 0.3s ease;
    
    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        background: rgba(255, 255, 255, 0.08);
    }
    
    h3 {
        font-size: 1.8rem;
        margin-bottom: 15px;
        color: #feb47b;
    }
`;

const RealTimeBadge = styled.span`
    background: linear-gradient(135deg, #00b09b, #96c93d);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: bold;
    display: inline-block;
    margin-bottom: 20px;
    animation: pulse 2s infinite;
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
`;

function App() {
    return (
        <TonConnectUIProvider manifestUrl={TON_CONFIG.MANIFEST_URL}>
            <GlobalStyle />
            <AppContainer>
                <Header>
                    <h1>🔥 TON CASINO</h1>
                    <p>Real cryptocurrency casino with instant TON payouts</p>
                    <RealTimeBadge>🟢 REAL-TIME • REAL MONEY • REAL TON</RealTimeBadge>
                    <ConnectWallet />
                    <PlayerBalance />
                </Header>
                
                <GamesGrid>
                    <GameCard>
                        <h3>🎲 DICE</h3>
                        <p>Predict the dice roll. Win up to 6x your bet!</p>
                        <CasinoGames gameType="dice" />
                    </GameCard>
                    
                    <GameCard>
                        <h3>🚀 CRASH</h3>
                        <p>Cash out before the rocket crashes!</p>
                        <CasinoGames gameType="crash" />
                    </GameCard>
                    
                    <GameCard>
                        <h3>💣 MINES</h3>
                        <p>Find diamonds, avoid mines!</p>
                        <CasinoGames gameType="mines" />
                    </GameCard>
                </GamesGrid>
            </AppContainer>
        </TonConnectUIProvider>
    );
}

export default App;
