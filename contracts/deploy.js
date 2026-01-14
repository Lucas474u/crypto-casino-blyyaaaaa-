const { TonClient, WalletContractV4, internal } = require("@ton/ton");
const { mnemonicToWalletKey } = require("@ton/crypto");
const { compileFunc } = require("@ton-community/func-js");
const fs = require("fs");

async function deployCasinoContract() {
    // Инициализация клиента
    const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: '045d99debf6b8527dee4f34cb22347fec997027bf8770923b247cbd8a974e49c' // Получите на https://toncenter.com
    });

    // Загрузка мнемоники кошелька
    const mnemonic = process.env.MNEMONIC.split(' ');
    const key = await mnemonicToWalletKey(mnemonic);
    const wallet = WalletContractV4.create({ 
        publicKey: key.publicKey, 
        workchain: 0 
    });

    // Компиляция контракта
    const source = fs.readFileSync('CasinoContract.fc', 'utf-8');
    const compilationResult = await compileFunc({
        sources: {
            'stdlib.fc': fs.readFileSync('node_modules/@ton-community/func-js/stdlib.fc', 'utf-8'),
            'CasinoContract.fc': source
        },
        entryPoint: 'CasinoContract.fc'
    });

    if (compilationResult.status === 'error') {
        console.error('Compilation error:', compilationResult.message);
        return;
    }

    // Создание контракта
    const contractCode = Cell.fromBoc(compilationResult.codeBoc)[0];
    
    // Начальные данные контракта
    const initialData = beginCell()
        .storeBit(0) // is_initialized
        .storeUint(0, 64) // total_volume
        .storeUint(0, 64) // total_players
        .storeDict(null) // users dictionary
        .endCell();

    const contract = new Contract(
        client,
        ContractSource.fromCell(contractCode, initialData),
        wallet.address
    );

    // Деплой контракта
    const deployAmount = toNano('1'); // 1 TON для деплоя
    const seqno = await wallet.getSeqno();
    
    const transfer = wallet.createTransfer({
        secretKey: key.secretKey,
        seqno: seqno,
        messages: [
            internal({
                to: contract.address,
                value: deployAmount,
                bounce: false,
                body: new Cell() // пустое тело для деплоя
            })
        ]
    });

    await client.sendExternalMessage(wallet, transfer);
    console.log('Contract deployed at:', contract.address.toString());
}

deployCasinoContract().catch(console.error);
