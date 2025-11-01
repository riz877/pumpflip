import React, { useEffect, useRef } from 'react';
// Impor context
import { useFlipContext } from './App';

// --- FUNGSI HELPER BARU UNTUK MEMOTONG ALAMAT WALLET ---
const shortenWallet = (wallet) => {
  if (!wallet) return '';
  return `${wallet.substring(0, 4)}...${wallet.substring(wallet.length - 4)}`;
};


// Live Feed Window Component
function LiveFeedWindow() {
  // Ambil data transaksi langsung dari context
  const { liveTransactions } = useFlipContext();
  const feedContentRef = useRef(null); // Ref for auto-scroll

  // Hapus semua data palsu dan interval

  // Effect to auto-scroll to the top (newest entry)
  useEffect(() => {
    if (feedContentRef.current) {
      feedContentRef.current.scrollTop = 0; // Always scroll to top
    }
  }, [liveTransactions]); // Update saat transaksi baru masuk

  return (
    <div className="live-feed-window">
      <div className="feed-title-bar">
        <span>[ live transactions ]</span>
        <span className="status-live">LIVE</span>
      </div>
      <div className="feed-content" ref={feedContentRef}>
        {/* Initial logs */}
        <div className="feed-line">
          <span className="action">&gt; Connecting to SOLFLIP protocol...</span>
        </div>
        <div className="feed-line">
          <span className="action">&gt; STATUS: </span>
          <span className="result-win">CONNECTED</span>
        </div>
        <div className="feed-line">
          <span className="action">&gt; Awaiting live data...</span>
          <span className="cursor-blink">_</span>
        </div>
        <br /> 

        {/* Transaction list (sekarang menggunakan data asli) */}
        {liveTransactions.map(tx => (
          <div key={tx.id} className="feed-line">
            <span className="wallet">{shortenWallet(tx.wallet)}</span>
            <span className="action"> flipped </span>
            <span className="amount">{tx.amount} SOL</span>
            <span className="action"> on </span>
            <span className="choice">{tx.choice}</span>
            <span className="action"> and </span>
            <span className={tx.result === 'WON' ? 'result-win' : 'result-lose'}>
              {tx.result}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveFeedWindow;