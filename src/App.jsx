import React, { useState, createContext, useContext } from 'react';
import './App.css'; 
import MatrixBackground from './MatrixBackground'; 
import CoinflipWindow from './CoinflipWindow'; 
import LiveFeedWindow from './LiveFeedWindow'; 

// --- Buat Context ---
const FlipContext = createContext();

// Buat hook kustom untuk menggunakan context
export const useFlipContext = () => useContext(FlipContext);

// Buat Provider
const FlipProvider = ({ children }) => {
  const [liveTransactions, setLiveTransactions] = useState([]);

  const addLiveTransaction = (tx) => {
    // Menambahkan transaksi baru ke atas, batasi 100
    setLiveTransactions(prev => [tx, ...prev].slice(0, 100));
  };

  return (
    <FlipContext.Provider value={{ liveTransactions, addLiveTransaction }}>
      {children}
    </FlipContext.Provider>
  );
};
// --- Akhir Context ---


function App() {
  return (
    // Bungkus komponen dengan Provider
    <FlipProvider>
      <MatrixBackground /> 

      <div className="app-container">
        {/* Window 1: Coinflip Game */}
        <CoinflipWindow />
        
        {/* Window 2: Live Feed */}
        <LiveFeedWindow />
      </div>
    </FlipProvider>
  );
}

export default App;