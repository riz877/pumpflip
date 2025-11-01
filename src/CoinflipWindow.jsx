import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react'; 
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js'; 
import { FaXTwitter } from "react-icons/fa6"; 

// Impor context yang kita buat
import { useFlipContext } from './App'; 

// --- NUMBER FORMATTING FUNCTION ---
function formatMarketCap(mcap) {
  if (mcap === null || mcap === undefined) return '$...';
  if (mcap === 'Error') return '$Error';
  const num = parseFloat(mcap);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// --- HARDCODED PUBLIC ADDRESSES (DEVNET) ---
const DEXSCREENER_PAIR_ADDRESS = "82iP13cWNwA6dZ1mMvFhvyy4x34qWd5y1t3vXbN3fGqM"; // Ganti ini
const TOKEN_CONTRACT_ADDRESS = "YOUR_TOKEN_CONTRACT_ADDRESS_HERE"; // Ganti ini

// Coinflip Window Component
function CoinflipWindow() {
  const { publicKey, connected, signTransaction } = useWallet(); 
  const { connection } = useConnection(); 
  
  // Ambil fungsi 'addLiveTransaction' dari context
  const { addLiveTransaction } = useFlipContext();

  const [activeView, setActiveView] = useState('coinflip');
  const [marketCap, setMarketCap] = useState(null);
  const [choice, setChoice] = useState('heads'); 
  const [betAmount, setBetAmount] = useState(0.1); 
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [showGlitch, setShowGlitch] = useState(false); 
  
  // --- STATE BARU UNTUK TX HASHES ---
  const [betTx, setBetTx] = useState(null);
  const [payoutTx, setPayoutTx] = useState(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGlitch(true);
      const timerOff = setTimeout(() => setShowGlitch(false), 1500); 
      return () => clearTimeout(timerOff);
    }, 500); 
    return () => clearTimeout(timer);
  }, []); 

  useEffect(() => {
    const fetchMarketCap = async () => {
      const pairAddress = DEXSCREENER_PAIR_ADDRESS; 
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data.pair && data.pair.marketCap) {
          setMarketCap(data.pair.marketCap);
        } else {
          setMarketCap('Error');
        }
      } catch (error) {
        console.error("Failed to fetch market cap:", error);
        setMarketCap('Error');
      }
    };
    fetchMarketCap();
    const interval = setInterval(fetchMarketCap, 30000); 
    return () => clearInterval(interval);
  }, []); 

  // --- HANDLE FLIP FUNCTION (CALLS API) ---
  const handleFlip = async () => {
    if (!publicKey || !signTransaction) {
      alert("ERROR: WALLET NOT CONNECTED.");
      return;
    }
    if (betAmount <= 0) {
      alert("ERROR: INVALID BET AMOUNT.");
      return;
    }

    setIsLoading(true);
    // Bersihkan hasil sebelumnya
    setResultMessage(''); 
    setBetTx(null);
    setPayoutTx(null);
    setShowGlitch(true); 

    try {
      // 1. Request transaction from backend
      console.log('Requesting transaction from backend...');
      const createResponse = await fetch('/api/create-flip', { // Calls /api/
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toBase58(),
          amount: betAmount,
        }),
      });

      const createData = await createResponse.json();
      if (!createResponse.ok) throw new Error(createData.error || 'Failed to create transaction');

      // 2. Request user signature
      const transaction = Transaction.from(Buffer.from(createData.transaction, 'base64'));
      console.log('Requesting user signature...');
      const signedTransaction = await signTransaction(transaction);
      
      // 3. Serialize
      const serializedSignedTransaction = signedTransaction.serialize({
          requireAllSignatures: false, 
      });

      // 4. Send to backend for execution
      console.log('Sending signed transaction to backend...');
      const submitResponse = await fetch('/api/submit-flip', { // Calls /api/
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: serializedSignedTransaction.toString('base64'),
        }),
      });
      
      const submitData = await submitResponse.json();
      if (!submitResponse.ok) throw new Error(submitData.error || 'Failed to submit transaction');

      // 5. Tampilkan hasil dan simpan tx hash
      console.log('Flip complete! Result:', submitData);
      setResultMessage(submitData.message);
      setBetTx(submitData.betTx || null);
      setPayoutTx(submitData.payoutTx || null);

      // --- KIRIM DATA KE LIVE FEED ---
      addLiveTransaction({
        id: Date.now(),
        wallet: publicKey.toBase58(),
        amount: betAmount,
        choice: choice.toUpperCase(), // 'heads' -> 'HEADS'
        result: submitData.result // 'WON' or 'LOST'
      });
      // -----------------------------
      
    } catch (error) {
      console.error('Flip Failed:', error);
      setResultMessage(`ERROR: ${error.message}`);
      setBetTx(null);
      setPayoutTx(null);
    } finally {
      setIsLoading(false);
      setShowGlitch(false); 
    }
  };

  const isButtonDisabled = isLoading;

  return (
      <div className="coinflip-window">
        
        <div className="window-title-bar">
          <span>COINFLIP_SYS.EXE [SOLANA]</span>
          <div className="window-controls">
            <a 
              href="https://twitter.com/yourhandle" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="title-bar-btn"
            >
              <FaXTwitter />
            </a>
          </div>
        </div>

        <div className="window-content">
          
          <h1 className={`coinflip-logo ${showGlitch ? 'glitch' : ''}`} data-text="SOLFLIP">
            SOLFLIP
          </h1>
          <p className="subtitle">Choose your fate. Engage protocol.</p>

          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeView === 'coinflip' ? 'active' : ''}`}
              onClick={() => setActiveView('coinflip')}
            >
              Coinflip
            </button>
            <button 
              className={`tab-btn ${activeView === 'description' ? 'active' : ''}`}
              onClick={() => setActiveView('description')}
            >
              Description
            </button>
          </div>

          {activeView === 'coinflip' ? (
            <> 
              {!connected ? (
                <WalletMultiButton />
              ) : (
                <>
                  <div className="choice-container">
                    <button
                      className={`choice-btn ${choice === 'heads' ? 'selected' : ''}`}
                      onClick={() => setChoice('heads')}
                      disabled={isButtonDisabled} 
                    >
                      HEADS
                    </button>
                    <button
                      className={`choice-btn ${choice === 'tails' ? 'selected' : ''}`}
                      onClick={() => setChoice('tails')}
                      disabled={isButtonDisabled} 
                    >
                      TAILS
                    </button>
                  </div>

                  <input
                    type="number"
                    className="bet-input"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                    placeholder="Bet Amount (SOL)"
                    step="0.01"
                    min="0.01"
                    disabled={isButtonDisabled} 
                  />

                  <button
                    className="flip-btn"
                    onClick={handleFlip}
                    disabled={isButtonDisabled} 
                  >
                    {isLoading ? (
                      <>
                        <span className="glitch" data-text="FLIPPING...">FLIPPING...</span>
                        <div className="flip-toggle-pill"></div>
                      </>
                    ) : (
                      `FLIP ${betAmount} SOL`
                    )}
                  </button>

                  {/* --- AREA HASIL BARU --- */}
                  <div
                    className={`result-area ${isLoading ? 'flipping' : (resultMessage.includes('WON') ? 'win' : (resultMessage.includes('LOST') || resultMessage.includes('ERROR') ? 'lose' : ''))}`}
                  >
                    {isLoading && <p>Flipping...</p>} 
                    {!isLoading && resultMessage && <p>{resultMessage}</p>}
                    
                    {/* Tampilkan Link TX (hash) */}
                    {!isLoading && betTx && (
                      <a 
                        href={`https://solscan.io/tx/${betTx}?cluster=devnet`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="tx-link"
                      >
                        View Bet Transaction
                      </a>
                    )}
                    {!isLoading && payoutTx && (
                      <a 
                        href={`https://solscan.io/tx/${payoutTx}?cluster=devnet`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="tx-link"
                      >
                        View Payout Transaction
                      </a>
                    )}
                  </div>
                  {/* --- AKHIR AREA HASIL BARU --- */}


                  <WalletMultiButton />
                </>
              )}
            </>
            
          ) : (
            <div className="description-content">
              <h3>ABOUT SOLFLIP</h3>
              <p>
                SOLFLIP is a (centralized) provably fair coinflip
                game. We pay the gas for you!
              </p>
              <p>
                Our backend relayer handles all the gas fees. You just
                sign to approve the flip.
              </p>
              <p>
                Choose your fate. Engage the protocol.
              </p>
            </div>
          )}
          
          <div className="bottom-marketcap">
            <span>MCAP:</span> {formatMarketCap(marketCap)}
          </div>
          
          <div className="contract-address-display">
            <p>CONTRACT ADDRESS</p> 
            <div className="ca-box">
              <a 
                href={`https://solscan.io/address/${TOKEN_CONTRACT_ADDRESS}?cluster=devnet`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {TOKEN_CONTRACT_ADDRESS}
              </a>
            </div>
          </div>

        </div> 
      </div> 
  );
}

export default CoinflipWindow;