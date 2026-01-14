import { compileFunc } from '@ton-community/func-js';
import { Cell, beginCell, toNano } from 'ton';
import { TonClient, WalletContractV4 } from 'ton';
import { mnemonicToPrivateKey } from 'ton-crypto';

async function deployCasino() {
    // Compile contract
    const compileResult = await compileFunc({
        targets: ['casino.fc'],
        sources: (path: string) => {
            // Provide source code
            if (path === 'casino.fc') {
                return fs.readFileSync('./contracts/casino.fc', 'utf8');
            }
            return '';
        }
    });

    if (compileResult.status === 'error') {
        throw new Error(compileResult.message);
    }

    const codeCell = Cell.fromBoc(Buffer.from(compileResult.codeBoc, 'base64'))[0];
    
    // Prepare initial data
    const initialData = beginCell()
        .storeCoins(toNano('100')) // Initial liquidity
        .endCell();
    
    // Create contract
    const contract = new Contract(
        codeCell,
        initialData
    );
    
    // Connect to TON
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: 'your-api-key'
    });
    
    // Deploy
    const wallet = await getWallet(client);
    const seqno = await wallet.getSeqno();
    
    const transfer = wallet.createTransfer({
        secretKey: wallet.secretKey,
        seqno: seqno,
        sendMode: 3,
        messages: [{
            address: contract.address,
            amount: toNano('1'),
            body: beginCell()
                .storeUint(0, 32) // op::deploy
                .storeUint(0, 64) // query_id
                .storeRef(codeCell)
                .storeRef(initialData)
                .endCell()
        }]
    });
    
    await client.sendExternalMessage(wallet, transfer);
    console.log('Contract deployed at:', contract.address.toString());
}

deployCasino().catch(console.error);
