// src/config/ton-connect.config.ts
export const TON_CONFIG = {
    MANIFEST_URL: "https://crypto-casino-blyyaaaaa.vercel.app/tonconnect-manifest.json",
    CASINO_ADDRESS: "UQBvrPItSxKL-U2ikxdIYz3zWRCPlxMBaz3zVCHrLmD2OPOR", // Ваш TON адрес для депозитов
    NETWORK: "testnet", // или "mainnet"
    GAS_FEE: 0.05, // TON
    MIN_DEPOSIT: 0.1, // минимальный депозит
    MAX_DEPOSIT: 1000, // максимальный депозит
    RPC_URL: "https://testnet.toncenter.com/api/v2/jsonRPC" // или mainnet
};
