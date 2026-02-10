import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ArrowLeft, Sparkles, Download, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Prize, DrawOrder } from './setup-page';
import * as XLSX from 'xlsx';
import fdaLogo from 'figma:asset/6c2c89f0c6a2632ed60440f59e2c757e8807fea4.png';

interface Winner {
  id: string;
  prizeName: string;
  number: number;
  timestamp: number;
}

interface DrawingPageProps {
  prizes: Prize[];
  drawOrder: DrawOrder;
  onBack: () => void;
  role?: 'admin' | 'display';
}

export const STORAGE_KEY = 'lottery_game_state';

// Define the shape of the synced state
interface GameState {
  winners: Winner[];
  currentPrizeIndex: number;
  isDrawing: boolean;
  drawnNumbers: number[];
  confirmedNumbers: number[];
  cancelledNumbers?: number[]; // Optional to handle backward compatibility
  confirmedCount: number;
  totalNeeded: number;
  usedNumbers: number[]; // Set cannot be serialized to JSON, use array
  specialPrizes: Prize[];
}

export function DrawingPage({ prizes: initialPrizes, drawOrder, onBack, role = 'admin' }: DrawingPageProps) {
  // --- STATE DEFINITIONS ---
  const [specialPrizes, setSpecialPrizes] = useState<Prize[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [confirmedNumbers, setConfirmedNumbers] = useState<number[]>([]);
  const [cancelledNumbers, setCancelledNumbers] = useState<number[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [usedNumbers, setUsedNumbers] = useState<Set<number>>(new Set());

  // Local state (not synced heavily)
  const [animatingNumbers, setAnimatingNumbers] = useState<number[]>([]);
  const [showAddPrizeForm, setShowAddPrizeForm] = useState(false);
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizeQuantity, setNewPrizeQuantity] = useState(1);
  const [previousAllPrizesLength, setPreviousAllPrizesLength] = useState(initialPrizes.length);
  const [searchQuery, setSearchQuery] = useState('');

  // --- DERIVED STATE ---
  const allPrizes = React.useMemo(() => {
    return [...initialPrizes, ...specialPrizes];
  }, [initialPrizes, specialPrizes]);

  const sortedPrizes = React.useMemo(() => {
    // Separate initial prizes and special prizes
    const regularPrizes = initialPrizes.map((prize) => {
      const match = prize.name.match(/(\d+)/);
      const number = match ? parseInt(match[1]) : 999;
      return { prize, number, isSpecial: false };
    });

    const specialPrizesWithNumbers = specialPrizes.map((prize) => {
      const match = prize.name.match(/(\d+)/);
      const number = match ? parseInt(match[1]) : 999;
      return { prize, number, isSpecial: true };
    });

    regularPrizes.sort((a, b) => a.number - b.number);

    const sortedRegular = drawOrder === 'descending'
      ? regularPrizes.reverse()
      : regularPrizes;

    const allSorted = [...sortedRegular, ...specialPrizesWithNumbers];
    return allSorted.map((item) => item.prize);
  }, [initialPrizes, specialPrizes, drawOrder]);

  const currentPrize = sortedPrizes[currentPrizeIndex];
  const hasMorePrizes = currentPrizeIndex < sortedPrizes.length;
  const isDrawComplete = drawnNumbers.length > 0 && !isDrawing;

  // Standby Logic for Display Mode
  // Standby means: We are a display, not currently drawing, and no numbers are currently shown/confirmed for this session/batch.
  const isStandby = role === 'display' && !isDrawing && drawnNumbers.length === 0 && confirmedNumbers.length === 0;


  // --- SYNCHRONIZATION LOGIC ---

  // Admin: Broadcast state changes to localStorage
  useEffect(() => {
    if (role === 'admin') {
      const stateToSave: GameState = {
        winners,
        currentPrizeIndex,
        isDrawing,
        drawnNumbers,
        confirmedNumbers,
        cancelledNumbers, // Sync this too
        confirmedCount,
        totalNeeded,
        usedNumbers: Array.from(usedNumbers),
        specialPrizes
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [role, winners, currentPrizeIndex, isDrawing, drawnNumbers, confirmedNumbers, cancelledNumbers, confirmedCount, totalNeeded, usedNumbers, specialPrizes]);

  // Display: Listen for changes from localStorage
  useEffect(() => {
    if (role === 'display') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
          if (e.newValue) {
            try {
              const newState: GameState = JSON.parse(e.newValue);
              setWinners(newState.winners);
              setCurrentPrizeIndex(newState.currentPrizeIndex);
              setIsDrawing(newState.isDrawing);
              setDrawnNumbers(newState.drawnNumbers);
              setConfirmedNumbers(newState.confirmedNumbers);
              setCancelledNumbers(newState.cancelledNumbers || []); // Handle older state
              setConfirmedCount(newState.confirmedCount);
              setTotalNeeded(newState.totalNeeded);
              setUsedNumbers(new Set(newState.usedNumbers));
              setSpecialPrizes(newState.specialPrizes);
            } catch (err) {
              console.error("Failed to parse game state", err);
            }
          } else {
            // Reset to defaults if key is removed
            setWinners([]);
            setCurrentPrizeIndex(0);
            setIsDrawing(false);
            setDrawnNumbers([]);
            setConfirmedNumbers([]);
            setCancelledNumbers([]);
            setConfirmedCount(0);
            setTotalNeeded(0);
            setUsedNumbers(new Set());
            setSpecialPrizes([]);
          }
        }
      };

      // Initial load
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const newState: GameState = JSON.parse(savedState);
          setWinners(newState.winners);
          setCurrentPrizeIndex(newState.currentPrizeIndex);
          setIsDrawing(newState.isDrawing);
          setDrawnNumbers(newState.drawnNumbers);
          setConfirmedNumbers(newState.confirmedNumbers);
          setCancelledNumbers(newState.cancelledNumbers || []);
          setConfirmedCount(newState.confirmedCount);
          setTotalNeeded(newState.totalNeeded);
          setUsedNumbers(new Set(newState.usedNumbers));
          setSpecialPrizes(newState.specialPrizes);
        } catch (err) {
          console.error("Failed to parse initial game state", err);
        }
      }

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [role]);

  // --- ANIMATION LOGIC (Shared but triggered by isDrawing) ---

  // Ref to keep track of animation interval
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isDrawing && currentPrize) {
      const quantity = totalNeeded > 0 ? totalNeeded - confirmedCount : currentPrize.quantity;

      // Start generating random numbers for animation
      if (!animationIntervalRef.current) {
        animationIntervalRef.current = setInterval(() => {
          setAnimatingNumbers(
            Array.from({ length: quantity }, () => Math.floor(Math.random() * 999) + 1)
          );
        }, 50);
      }
    } else {
      // Stop animation
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setAnimatingNumbers([]);
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [isDrawing, currentPrize, totalNeeded, confirmedCount]);


  // --- GAME LOGIC (Admin Only) ---

  // Detect new prizes added (Admin logic mainly, but effect runs on both based on array length)
  useEffect(() => {
    if (role === 'admin' && allPrizes.length > previousAllPrizesLength) {
      setCurrentPrizeIndex(sortedPrizes.length - 1);
      setConfirmedCount(0);
      setTotalNeeded(0);
      setDrawnNumbers([]);
      setConfirmedNumbers([]);
      setCancelledNumbers([]);
      setPreviousAllPrizesLength(allPrizes.length);
    } else if (role === 'display') {
      // Just update the trackers
      setPreviousAllPrizesLength(allPrizes.length);
    }
  }, [allPrizes.length, previousAllPrizesLength, sortedPrizes.length, role]);

  const generateRandomNumber = (temporarySet?: Set<number>) => {
    let num: number;
    let attempts = 0;
    const maxAttempts = 1000;
    do {
      num = Math.floor(Math.random() * 999) + 1;
      attempts++;
      if (attempts > maxAttempts) break;
    } while (usedNumbers.has(num) || (temporarySet && temporarySet.has(num)));
    return num;
  };

  const startBatchDraw = () => {
    if (role !== 'admin' || !currentPrize || isDrawing) return;

    // 1. Start Drawing State
    setIsDrawing(true);

    // IMMEDIATE UPDATE: Clear unconfirmed numbers instantly when starting to draw.
    // This ensures only the Green (confirmed) numbers remain on screen while we wait for new ones.
    setDrawnNumbers((prev) => prev.filter(n => confirmedNumbers.includes(n)));

    // Calculate how many MORE we need.
    // If we have 5 confirmed and need 10 total, we draw 5.
    const targetTotal = totalNeeded > 0 ? totalNeeded : currentPrize.quantity;
    const quantityToDraw = Math.max(0, targetTotal - confirmedCount);

    if (quantityToDraw === 0) {
      setIsDrawing(false);
      return;
    }

    // Set total needed first if needed (for initial setup)
    if (totalNeeded === 0) {
      setTotalNeeded(currentPrize.quantity);
    }

    // 2. Wait 2 seconds then finalize
    setTimeout(() => {
      const newNumbers: number[] = [];
      const tempSet = new Set<number>();

      for (let i = 0; i < quantityToDraw; i++) {
        const num = generateRandomNumber(tempSet);
        newNumbers.push(num);
        tempSet.add(num);
      }

      // Logic Update: 
      // User wants to KEED confirmed numbers, but REPLACE unconfirmed ones with new draws.
      // So we filter drawnNumbers to keep only confirmed ones, then append new ones.
      setDrawnNumbers((prev) => {
        // Keep ONLY the ones that are currently confirmed
        const keptNumbers = prev.filter(n => confirmedNumbers.includes(n));
        return [...keptNumbers, ...newNumbers];
      });

      setIsDrawing(false);
    }, 2000);
  };

  const confirmDrawnNumbers = () => {
    if (role !== 'admin' || drawnNumbers.length === 0) return;

    // Filter only those that are NOT already confirmed or cancelled (Blue ones)
    const numbersToConfirm = drawnNumbers.filter(
      n => !confirmedNumbers.includes(n) && !cancelledNumbers.includes(n)
    );

    if (numbersToConfirm.length === 0) return;

    const newWinners = numbersToConfirm.map((num) => ({
      id: Date.now().toString() + Math.random(),
      prizeName: currentPrize.name,
      number: num,
      timestamp: Date.now(),
    }));

    setWinners((prev) => [...prev, ...newWinners]);
    setConfirmedCount((prev) => prev + numbersToConfirm.length);
    setConfirmedNumbers((prev) => [...prev, ...numbersToConfirm]);
    // Note: We do NOT clear drawnNumbers anymore, they stay on screen as history
    setUsedNumbers((prev) => new Set([...prev, ...numbersToConfirm]));
  };

  // Toggle Logic: Blue -> Green -> Red -> Green
  // Toggle Logic: Blue (Pending) <-> Green (Confirmed)
  // Removed Red (Cancelled) state as requested.
  const handleNumberClick = (numberToToggle: number) => {
    if (role !== 'admin') return;

    const isConfirmed = confirmedNumbers.includes(numberToToggle);

    if (isConfirmed) {
      // Green -> Blue (Un-confirm / Pending)
      // 1. Remove from winners
      setWinners((prev) => prev.filter((w) => w.number !== numberToToggle));
      // 2. Remove from confirmedNumbers
      setConfirmedNumbers((prev) => prev.filter((n) => n !== numberToToggle));
      // 3. Decrease confirmed count
      setConfirmedCount((prev) => Math.max(0, prev - 1));
      // Note: We do NOT remove from usedNumbers because it's still "on screen" as Blue.

    } else {
      // Blue -> Green (Confirm)
      const newWinner: Winner = {
        id: Date.now().toString() + Math.random(),
        prizeName: currentPrize.name,
        number: numberToToggle,
        timestamp: Date.now(),
      };
      setWinners((prev) => [...prev, newWinner]);
      setConfirmedNumbers((prev) => [...prev, numberToToggle]);
      setConfirmedCount((prev) => prev + 1);
      setUsedNumbers((prev) => new Set([...prev, numberToToggle]));
    }
  };

  const handleConfirmAll = () => {
    if (role !== 'admin') return;
    const pendingNumbers = drawnNumbers.filter(n => !confirmedNumbers.includes(n));
    if (pendingNumbers.length === 0) return;

    const newWinners = pendingNumbers.map(num => ({
      id: Date.now().toString() + Math.random(),
      prizeName: currentPrize.name,
      number: num,
      timestamp: Date.now(),
    }));

    setWinners(prev => [...prev, ...newWinners]);
    setConfirmedNumbers(prev => [...prev, ...pendingNumbers]);
    setConfirmedCount(prev => prev + pendingNumbers.length);
    setUsedNumbers(prev => new Set([...prev, ...pendingNumbers]));
  };

  const handleUnconfirmAll = () => {
    if (role !== 'admin') return;
    const numbersToUnconfirm = drawnNumbers.filter(n => confirmedNumbers.includes(n));
    if (numbersToUnconfirm.length === 0) return;

    setWinners(prev => prev.filter(w => !numbersToUnconfirm.includes(w.number)));
    setConfirmedNumbers(prev => prev.filter(n => !numbersToUnconfirm.includes(n)));
    setConfirmedCount(prev => Math.max(0, prev - numbersToUnconfirm.length));
    // Note: Do not remove from usedNumbers as they revert to Blue (Pending)
  };

  const drawRemainingNumbers = () => {
    if (role === 'admin') startBatchDraw();
  };

  const moveToNextPrize = () => {
    if (role !== 'admin') return;
    setCurrentPrizeIndex((prev) => prev + 1);
    setConfirmedCount(0);
    setTotalNeeded(0);
    setDrawnNumbers([]);
    setConfirmedNumbers([]);
    setCancelledNumbers([]);
  };

  // Group winners
  const groupedWinners = winners.reduce((acc, winner) => {
    if (!acc[winner.prizeName]) {
      acc[winner.prizeName] = [];
    }
    acc[winner.prizeName].push(winner);
    return acc;
  }, {} as Record<string, Winner[]>);

  const exportWinnersToExcel = () => {
    if (winners.length === 0) return;
    const worksheetData = [
      ['ลำดับ', 'ชื่อรางวัล', 'หมายเลขผู้โชคดี', 'วันที่และเวลา'],
      ...winners.map((winner, index) => [
        index + 1,
        winner.prizeName,
        winner.number,
        new Date(winner.timestamp).toLocaleString('th-TH', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อผู้โชคดี');
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).replace(/\//g, '-');
    XLSX.writeFile(workbook, `รายชื่อผู้โชคดี_${dateStr}.xlsx`);
  };

  // --- RENDER HELPERS ---
  const showControls = role === 'admin';

  // Calculate dynamic layout based on total items to show
  const quantityToDraw = totalNeeded > 0 ? totalNeeded : (currentPrize?.quantity || 0);

  const getSizeClasses = (qty: number) => {
    // Shared defaults
    const common = {
      box: "",
    };

    if (qty > 100) return {
      ...common,
      text: "text-lg md:text-xl font-extrabold",
      gap: "gap-1.5",
      iconSize: "h-3 w-3",
      iconPos: "top-1 right-1",
      stagger: 0.002,
      containerPadding: "p-3"
    };

    if (qty > 50) return {
      ...common,
      text: "text-2xl md:text-3xl font-extrabold",
      gap: "gap-2",
      iconSize: "h-4 w-4",
      iconPos: "top-2 right-2",
      stagger: 0.005,
      containerPadding: "p-4"
    };

    // Default / Standard (Few items)
    return {
      ...common,
      text: "text-4xl md:text-6xl font-black",
      gap: "gap-3",
      iconSize: "h-6 w-6",
      iconPos: "top-2 right-2",
      stagger: 0.05,
      containerPadding: "p-6"
    };
  };

  const layout = getSizeClasses(quantityToDraw);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      {/* Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-900/95 backdrop-blur-md border-b border-blue-800/30 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg p-0.5">
              <img src={fdaLogo} alt="FDA Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-white text-sm font-semibold drop-shadow-lg">สำนักงานคณะกรรมการอาหารและยา</div>
              <div className="text-blue-100 text-xs drop-shadow-lg">Food and Drug Administration</div>
            </div>
          </div>
          <div className="flex-1"></div>
          {/* Back Button - Only for Admin */}
          {showControls && (
            <Button onClick={onBack} variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">กลับไปตั้งค่า</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-8 pt-28 mt-16">
        {/* Drawing Area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 flex-1 flex flex-col">
            {isStandby ? (
              // STANDBY SCREEN (Display Only)
              <div className="flex-1 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="w-32 h-32 md:w-48 md:h-48 bg-white rounded-full flex items-center justify-center shadow-2xl p-2 mx-auto mb-8">
                    <img src={fdaLogo} alt="FDA Logo" className="w-full h-full object-contain" />
                  </div>
                  <h2 className="text-3xl md:text-5xl text-blue-900 font-bold mb-4">ระบบจับรางวัล</h2>
                  <p className="text-xl text-blue-600">สำนักงานคณะกรรมการอาหารและยา</p>
                </motion.div>
              </div>
            ) : (
              // DRAWING SCREEN
              hasMorePrizes && currentPrize ? (
                <>
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={currentPrize.name} // Key to trigger re-anim on change
                      className="inline-block"
                    >
                      <div className="text-blue-900 text-3xl md:text-5xl mb-2">
                        {currentPrize.name}
                      </div>
                      <div className="text-gray-600">
                        กำลังจับ {currentPrize.quantity} รางวัล
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex justify-between items-center mb-4 px-4 pt-2">
                    <div className="flex-1 flex gap-2">
                      {showControls && drawnNumbers.length > 0 && !isDrawing && (
                        <>
                          <Button
                            onClick={handleConfirmAll}
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            ยืนยันทั้งหมด
                          </Button>
                          <Button
                            onClick={handleUnconfirmAll}
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            ยกเลิกทั้งหมด
                          </Button>
                        </>
                      )}
                    </div> {/* Spacer/Controls */}
                    {showControls && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="ค้นหาตัวเลข..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-64 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm transition-all text-center"
                        />
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 min-h-0 overflow-y-auto mb-8 rounded-2xl bg-gray-50/50 border border-gray-100 shadow-inner flex flex-col ${layout.containerPadding}`}>
                    <div
                      className={`grid w-full ${layout.gap}`}
                      style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
                    >
                      {/* 1. Show existing drawn numbers */}
                      {drawnNumbers.map((num, idx) => {
                        const isConfirmed = confirmedNumbers.includes(num);
                        // Removed isCancelled check

                        const isMatch = searchQuery && num.toString().includes(searchQuery);

                        // Determine styles based on state
                        // Default Blue (Pending)
                        let bgClass = "bg-blue-500 shadow-blue-200 border-2 border-blue-400";
                        let textClass = "text-white";
                        let icon = <Sparkles className={`text-blue-100 ${layout.iconSize}`} />;

                        if (isConfirmed) {
                          // Green (Confirmed)
                          bgClass = "bg-green-500 shadow-green-200 border-2 border-green-400";
                          icon = (
                            <div className="bg-white rounded-full p-0.5 shadow-sm">
                              <svg className={`text-green-600 ${layout.iconSize}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          );
                        }

                        // Search Highlight Overrides
                        if (isMatch) {
                          // REPLACING bgClass entirely to avoid specificity wars
                          bgClass = "bg-yellow-400 ring-4 ring-yellow-200 ring-offset-2 scale-110 z-50 shadow-xl shadow-yellow-500/50 border-2 border-yellow-500";
                          textClass = "text-yellow-900 font-extrabold";
                          icon = (
                            <div className="bg-yellow-200 rounded-full p-1 shadow-md animate-bounce origin-center">
                              <svg className={`text-yellow-800 ${layout.iconSize}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                          );
                        }

                        return (
                          <motion.div
                            key={`drawn-${num}`}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: isMatch ? 1.1 : 1, opacity: 1 }}
                            transition={{
                              type: 'spring', stiffness: 300, damping: 20
                            }}
                            className="relative flex flex-col gap-2 cursor-pointer"
                            style={{ aspectRatio: '1/1' }}
                            onClick={() => handleNumberClick(num)}
                          >
                            <div className={`w-full h-full relative flex items-center justify-center shadow-lg transition-all duration-200 rounded-lg md:rounded-xl ${bgClass} ${layout.box}`}>
                              <div className={`${textClass} ${layout.text}`}>{num}</div>
                              <div className={`absolute ${layout.iconPos}`}>
                                {icon}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* 2. Show animating numbers */}
                      {animatingNumbers.map((num, idx) => (
                        <motion.div
                          key={`animating-${idx}`}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * layout.stagger, type: 'spring', stiffness: 300, damping: 20 }}
                          className={`relative flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg md:rounded-xl ${layout.box}`}
                          style={{ aspectRatio: '1/1' }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.05, repeat: Infinity }}
                            className={`text-gray-600 ${layout.text}`}
                          >
                            {num}
                          </motion.div>
                        </motion.div>
                      ))}

                      {/* 3. Show empty slots */}
                      {drawnNumbers.length === 0 && animatingNumbers.length === 0 && (
                        Array(currentPrize.quantity)
                          .fill(null)
                          .map((_, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: idx * layout.stagger }}
                              className={`relative flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg md:rounded-xl ${layout.box}`}
                              style={{ aspectRatio: '1/1' }}
                            />
                          ))
                      )}
                    </div>
                  </div>

                  {/* CONTROLS (ADMIN ONLY) */}
                  {showControls && (
                    <div className="text-center">
                      {!isDrawComplete && !isDrawing && (totalNeeded === 0 || confirmedCount < totalNeeded) && (
                        <Button
                          onClick={startBatchDraw}
                          disabled={isDrawing}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-12 h-14 text-lg rounded-2xl shadow-lg disabled:opacity-50"
                        >
                          เริ่มสุ่มรางวัล
                        </Button>
                      )}

                      {isDrawing && (
                        <Button
                          disabled
                          className="bg-blue-600 text-white border-0 px-12 h-14 text-lg rounded-2xl shadow-lg opacity-50"
                        >
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkles className="h-5 w-5" />
                            </motion.div>
                            กำลังสุ่ม...
                          </span>
                        </Button>
                      )}

                      {isDrawComplete && (
                        <div className="space-y-4">
                          {totalNeeded > 0 && (
                            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4">
                              <p className="text-gray-700">
                                ยืนยันแล้ว: <span className="text-blue-600 font-semibold">{confirmedCount}</span> / {totalNeeded}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                              onClick={confirmDrawnNumbers}
                              className="bg-green-500 hover:bg-green-600 text-white border-0 px-8 h-12 rounded-xl shadow-lg"
                            >
                              ยืนยันรางวัล ({drawnNumbers.length})
                            </Button>
                            <Button
                              onClick={drawRemainingNumbers}
                              variant="outline"
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 px-8 h-12 rounded-xl"
                            >
                              สุ่มเลขที่เหลือ
                            </Button>
                          </div>
                        </div>
                      )}

                      {confirmedCount >= totalNeeded && totalNeeded > 0 && (
                        <>
                          {currentPrizeIndex < sortedPrizes.length - 1 ? (
                            <Button
                              onClick={moveToNextPrize}
                              className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 h-12 rounded-xl shadow-lg mt-4"
                            >
                              ไปรางวัลถัดไป
                            </Button>
                          ) : (
                            <Button
                              onClick={moveToNextPrize}
                              className="bg-green-500 hover:bg-green-600 text-white border-0 px-8 h-12 rounded-xl shadow-lg mt-4"
                            >
                              เสร็จสิ้นการจับรางวัล
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // COMPLETION SCREEN
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <Trophy className="h-24 w-24 text-blue-600 mb-6 mx-auto" />
                  </motion.div>
                  <h2 className="text-3xl md:text-4xl text-gray-800 mb-4">จับรางวัลครบทุกรายการแล้ว!</h2>
                  <p className="text-gray-600 mb-8">
                    แจกรางวัลครบทุกรายการแล้ว ตรวจสอบรายชื่อผู้โชคดีด้านขวา
                  </p>

                  {/* Additional Prize Form (Admin Only) */}
                  {showControls ? (
                    showAddPrizeForm ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-4 w-full max-w-md"
                      >
                        <h3 className="text-xl text-gray-800 mb-4">เพิ่มรางวัลใหม่</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-gray-700 text-sm block mb-2">ชื่อรางวัล</label>
                            <input
                              type="text"
                              value={newPrizeName}
                              onChange={(e) => setNewPrizeName(e.target.value)}
                              placeholder="เช่น รางวัลพิเศษ"
                              className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="text-gray-700 text-sm block mb-2">จำนวนรางวัล</label>
                            <input
                              type="number"
                              min="1"
                              value={newPrizeQuantity}
                              onChange={(e) => setNewPrizeQuantity(parseInt(e.target.value) || 1)}
                              className="w-full bg-white border border-gray-300 text-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => {
                                if (newPrizeName.trim()) {
                                  const newPrize: Prize = {
                                    id: Date.now().toString(),
                                    name: newPrizeName,
                                    quantity: newPrizeQuantity,
                                  };
                                  setSpecialPrizes((prev) => [...prev, newPrize]);
                                  setNewPrizeName('');
                                  setNewPrizeQuantity(1);
                                  setShowAddPrizeForm(false);
                                }
                              }}
                              disabled={!newPrizeName.trim()}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0 h-10 rounded-xl disabled:opacity-50"
                            >
                              เพิ่มรางวัล
                            </Button>
                            <Button
                              onClick={() => {
                                setShowAddPrizeForm(false);
                                setNewPrizeName('');
                                setNewPrizeQuantity(1);
                              }}
                              variant="outline"
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 h-10 rounded-xl"
                            >
                              ยกเลิก
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowAddPrizeForm(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 h-12 rounded-xl"
                        >
                          <Plus className="mr-2 h-5 w-5" />
                          เพิ่มรางวัลเพิ่มเติม
                        </Button>
                        <Button
                          onClick={onBack}
                          className="bg-gray-600 hover:bg-gray-700 text-white border-0 px-8 h-12 rounded-xl"
                        >
                          กลับไปตั้งค่า
                        </Button>
                      </div>
                    )
                  ) : (
                    // Display mode completed message
                    <div className="text-gray-500">รอการจับรางวัลเพิ่มเติม...</div>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        {/* Winner Record Sidebar - Only Show for Admin */}
        {showControls && (
          <div className="lg:w-96">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 h-full lg:max-h-[calc(100vh-180px)] flex flex-col">
              <h3 className="text-2xl text-gray-800 mb-4 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-blue-600" />
                รายชื่อผู้โชคดี
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {winners.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>ยังไม่มีผู้โชคดี เริ่มสุ่มรางวัลเพื่อดูผลลัพธ์!</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {Object.entries(groupedWinners)
                      .map(([prizeName, prizeWinners]) => ({
                        prizeName,
                        prizeWinners,
                      }))
                      .flatMap(({ prizeName, prizeWinners }, idx) => [
                        <motion.div
                          key={`prize-${prizeName}`}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-blue-50 rounded-xl border border-blue-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-blue-600 mb-1">{prizeName}</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {prizeWinners.map((winner) => (
                                  <span key={winner.id} className="bg-white/60 px-2 py-1 rounded-md text-sm text-blue-900 font-medium border border-blue-100/50">
                                    #{winner.number}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Trophy className="h-8 w-8 text-blue-400" />
                          </div>
                        </motion.div>,
                      ])}
                  </AnimatePresence>
                )}
              </div>

              {/* Export Button - Admin Only (redundant check but good for safety) */}
              <div className="mt-4">
                <Button
                  onClick={exportWinnersToExcel}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 h-12 rounded-xl w-full"
                >
                  <Download className="h-5 w-5 mr-2" />
                  ดาวน์โหลดผลรางวัล
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}