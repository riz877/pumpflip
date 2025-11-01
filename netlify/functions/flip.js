const express = require('express');
const { 
    Connection, 
    Transaction, 
    SystemProgram, 
    PublicKey, 
    Keypair, 
    LAMPORTS_PER_SOL,
    sendAndConfirmRawTransaction
} = require('@solana/web3.js');
const cors = require('cors');
const bs58 = require('bs58');
const serverless = require('serverless-http'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
const SOLANA_RPC = "https://api.devnet.solana.com"; // Change to mainnet-beta when live
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Get private key from Environment Variables
const relayerSecretKey = Uint8Array.from(JSON.parse(process.env.RELAYER_PRIVATE_KEY || '[]'));
const relayerWallet = Keypair.fromSecretKey(relayerSecretKey);

// Hardcode your house wallet address
const houseWalletAddress = new PublicKey("TCxYUG556eXbNRMxXMtvJyTTuHs5wxE557HgcfzYg4w");
// --------------------

const router = express.Router();

// Endpoint 1: Create Transaction
router.post('/create-flip', async (req, res) => {
    try {
        const { userWallet, amount } = req.body;
        if (!userWallet || !amount) {
            return res.status(400).json({ error: 'Missing userWallet or amount' });
        }
        console.log(`[CREATE] Received flip request for ${amount} SOL from ${userWallet}`);

        const userPublicKey = new PublicKey(userWallet);
        const lamports = amount * LAMPORTS_PER_SOL;

        const transferInstruction = SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: houseWalletAddress,
            lamports: lamports,
        });

        const transaction = new Transaction().add(transferInstruction);
        transaction.feePayer = relayerWallet.publicKey;
        
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;

        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
        });

        console.log(`[CREATE] Transaction created, sending to frontend for signature`);
        res.json({ transaction: serializedTransaction.toString('base64') });

    } catch (error) {
        console.error('[CREATE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint 2: Submit Transaction & Coinflip
router.post('/submit-flip', async (req, res) => {
    try {
        const { signedTransaction } = req.body;
        if (!signedTransaction) {
            return res.status(400).json({ error: 'Missing signedTransaction' });
        }
        console.log(`[SUBMIT] Received signed transaction from user`);

        const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
        transaction.sign([relayerWallet]);

        console.log(`[SUBMIT] Sending transaction (bet) to network...`);
        const signature = await sendAndConfirmRawTransaction(
            connection,
            transaction.serialize(),
            { commitment: 'confirmed' }
        );
        console.log(`[SUBMIT] Bet accepted! Signature: ${signature}`);

        // --- COINFLIP LOGIC (CENTRALIZED) ---
        const userWon = Math.random() < 0.5; // 50% chance

        if (userWon) {
            console.log(`[FLIP] User WON! Sending prize...`);
            const betAmount = transaction.instructions[0].data.readBigUInt64LE(4);
            const payoutAmount = Number(betAmount) * 2;
            
            const payoutTx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: relayerWallet.publicKey,
                    toPubkey: transaction.instructions[0].keys[0].pubkey,
                    lamports: payoutAmount,
                })
            );
            payoutTx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            payoutTx.feePayer = relayerWallet.publicKey;
            
            const payoutSignature = await connection.sendTransaction(payoutTx, [relayerWallet]);
            await connection.confirmTransaction(payoutSignature, 'confirmed');

            console.log(`[FLIP] Prize sent! Payout Signature: ${payoutSignature}`);
            res.json({ success: true, result: 'WON', message: 'YOU WON! PROFIT GAINED.', betTx: signature, payoutTx: payoutSignature });

        } else {
            console.log(`[FLIP] User LOST.`);
            res.json({ success: true, result: 'LOST', message: 'YOU LOST! LOSS INCURRED.', betTx: signature });
        }

    } catch (error) {
        console.error('[SUBMIT] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Point all requests to our router
app.use('/.netlify/functions/flip', router); // For local dev
app.use('/api', router); // For production (from redirect)

// Wrap the app for Netlify
module.exports.handler = serverless(app);
// <-- Saya sudah hapus '}' yang ekstra dari sini