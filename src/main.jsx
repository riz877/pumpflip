import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 

// --- INI PERBAIKANNYA ---
import { Buffer } from 'buffer';
window.Buffer = Buffer;
// --- AKHIR PERBAIKAN ---

// === Impor untuk Solana Wallet Adapter ===
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// === Impor CSS untuk Tombol Wallet ===
import '@solana/wallet-adapter-react-ui/styles.css';

// Komponen pembungkus untuk mengatur provider
const SolanaAppWrapper = () => {
    // Ganti ke 'mainnet-beta' saat Anda live
    const network = WalletAdapterNetwork.Devnet; 
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <App /> 
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

// Render aplikasi React
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <SolanaAppWrapper />
    </React.StrictMode>
);