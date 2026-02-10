import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SetupPage, Prize, DrawOrder } from './components/setup-page';
import { DrawingPage } from './components/drawing-page';
import { Toaster } from './components/ui/sonner';

// Helper to get prizes from local storage or default
const getInitialPrizes = (): Prize[] => {
  const saved = localStorage.getItem('lottery_prizes');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse prizes', e);
    }
  }
  return [
    { id: '1', name: 'รางวัลที่ 1', quantity: 1 },
    { id: '2', name: 'รางวัลที่ 2', quantity: 3 },
    { id: '3', name: 'รางวัลที่ 3', quantity: 5 },
  ];
};

const getInitialDrawOrder = (): DrawOrder => {
  const saved = localStorage.getItem('lottery_draw_order');
  return (saved as DrawOrder) || 'descending';
}

function AdminPanel() {
  const [prizes, setPrizes] = useState<Prize[]>(getInitialPrizes);
  const [screen, setScreen] = useState<'setup' | 'drawing'>('setup');
  const [drawOrder, setDrawOrder] = useState<DrawOrder>('descending');

  // Sync to local storage whenever prizes change
  useEffect(() => {
    localStorage.setItem('lottery_prizes', JSON.stringify(prizes));
  }, [prizes]);

  const handleStartDraw = (order: DrawOrder) => {
    setDrawOrder(order);
    localStorage.setItem('lottery_draw_order', order);

    // Open the display page in a new window (or reuse existing)
    const displayWindow = window.open('#/display', 'LotteryDisplayWindow');
    if (displayWindow) {
      displayWindow.focus();
    }

    // Switch local view to the drawing controller
    setScreen('drawing');
  };

  const handleBackToSetup = () => {
    // Reset the game state in localStorage so the display window returns to standby
    localStorage.removeItem('lottery_game_state');
    setScreen('setup');
  };

  const handleOpenDisplay = () => {
    // Open the display page in a new window
    const displayWindow = window.open('#/display', 'LotteryDisplayWindow');
    if (displayWindow) {
      displayWindow.focus();
    }
  };

  return (
    <>
      {screen === 'setup' ? (
        <SetupPage
          prizes={prizes}
          onPrizesChange={setPrizes}
          onStartDraw={handleStartDraw}
          onOpenDisplay={handleOpenDisplay}
        />
      ) : (
        <DrawingPage
          prizes={prizes}
          drawOrder={drawOrder}
          onBack={handleBackToSetup}
          role="admin"
        />
      )}
    </>
  );
}

function DisplayPanel() {
  const [prizes, setPrizes] = useState<Prize[]>(getInitialPrizes);
  const [drawOrder, setDrawOrder] = useState<DrawOrder>(getInitialDrawOrder);

  useEffect(() => {
    // Listen for changes from the Admin Panel
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lottery_prizes' && e.newValue) {
        try {
          setPrizes(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Error parsing updated prizes', err);
        }
      }
      if (e.key === 'lottery_draw_order' && e.newValue) {
        setDrawOrder(e.newValue as DrawOrder);
      }
    };

    // Load initial check in case we opened later
    const savedOrder = localStorage.getItem('lottery_draw_order');
    if (savedOrder) setDrawOrder(savedOrder as DrawOrder);

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <DrawingPage
      prizes={prizes}
      drawOrder={drawOrder}
      onBack={() => { }} // No back button on display
      role="display"
    />
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AdminPanel />} />
        <Route path="/display" element={<DisplayPanel />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
