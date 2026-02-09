import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ArrowLeft, Sparkles, Download, Plus } from 'lucide-react';
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
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [usedNumbers, setUsedNumbers] = useState<Set<number>>(new Set());

  // Local state (not synced heavily)
  const [animatingNumbers, setAnimatingNumbers] = useState<number[]>([]);
  const [showAddPrizeForm, setShowAddPrizeForm] = useState(false);
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizeQuantity, setNewPrizeQuantity] = useState(1);
  const [previousAllPrizesLength, setPreviousAllPrizesLength] = useState(initialPrizes.length);

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
        confirmedCount,
        totalNeeded,
        usedNumbers: Array.from(usedNumbers),
        specialPrizes
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [role, winners, currentPrizeIndex, isDrawing, drawnNumbers, confirmedNumbers, confirmedCount, totalNeeded, usedNumbers, specialPrizes]);

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
      setPreviousAllPrizesLength(allPrizes.length);
    } else if (role === 'display') {
      // Just update the trackers
      setPreviousAllPrizesLength(allPrizes.length);
    }
  }, [allPrizes.length, previousAllPrizesLength, sortedPrizes.length, role]);

  const generateRandomNumber = () => {
    let num: number;
    let attempts = 0;
    const maxAttempts = 1000;
    do {
      num = Math.floor(Math.random() * 999) + 1;
      attempts++;
      if (attempts > maxAttempts) break;
    } while (usedNumbers.has(num));
    return num;
  };

  const startBatchDraw = () => {
    if (role !== 'admin' || !currentPrize || isDrawing) return;

    // 1. Start Drawing State
    setIsDrawing(true);
    const quantity = totalNeeded > 0 ? totalNeeded - confirmedCount : currentPrize.quantity;

    // Set total needed first if needed
    if (totalNeeded === 0) {
      setTotalNeeded(currentPrize.quantity);
    }

    // 2. Wait 2 seconds then finalize
    setTimeout(() => {
      const newNumbers: number[] = [];
      for (let i = 0; i < quantity; i++) {
        newNumbers.push(generateRandomNumber());
      }

      // Update state (will trigger sync)
      setDrawnNumbers(newNumbers);
      setIsDrawing(false);
    }, 2000);
  };

  const confirmDrawnNumbers = () => {
    if (role !== 'admin' || drawnNumbers.length === 0) return;

    const newWinners = drawnNumbers.map((num) => ({
      id: Date.now().toString() + Math.random(),
      prizeName: currentPrize.name,
      number: num,
      timestamp: Date.now(),
    }));

    setWinners((prev) => [...prev, ...newWinners]);
    setConfirmedCount((prev) => prev + drawnNumbers.length);
    setConfirmedNumbers((prev) => [...prev, ...drawnNumbers]);
    setDrawnNumbers([]);
    setUsedNumbers((prev) => new Set([...prev, ...drawnNumbers]));
  };

  const confirmSingleNumber = (numberToConfirm: number) => {
    if (role !== 'admin') return;
    const newWinner: Winner = {
      id: Date.now().toString() + Math.random(),
      prizeName: currentPrize.name,
      number: numberToConfirm,
      timestamp: Date.now(),
    };

    setWinners((prev) => [...prev, newWinner]);
    setConfirmedCount((prev) => prev + 1);
    setConfirmedNumbers((prev) => [...prev, numberToConfirm]);
    setDrawnNumbers((prev) => prev.filter((num) => num !== numberToConfirm));
    setUsedNumbers((prev) => new Set([...prev, numberToConfirm]));
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

                  <div className="flex-1 flex items-center justify-center mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                      {animatingNumbers.length > 0 ? (
                        <>
                          {confirmedNumbers.map((num, idx) => (
                            <motion.div key={`confirmed-${num}-${idx}`} className="relative flex flex-col gap-2">
                              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center bg-green-500 shadow-lg">
                                <div className="text-3xl md:text-4xl text-white">{num}</div>
                                <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
                                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              {showControls && <div className="text-center text-green-600 text-xs">ยืนยันแล้ว</div>}
                            </motion.div>
                          ))}
                          {animatingNumbers.map((num, idx) => (
                            <motion.div
                              key={`animating-${idx}`}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300"
                            >
                              <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 0.05, repeat: Infinity }}
                                className="text-3xl md:text-4xl text-gray-600"
                              >
                                {num}
                              </motion.div>
                            </motion.div>
                          ))}
                        </>
                      ) : confirmedNumbers.length > 0 || drawnNumbers.length > 0 ? (
                        <>
                          {confirmedNumbers.map((num, idx) => (
                            <motion.div
                              key={`confirmed-${num}-${idx}`}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="relative flex flex-col gap-2"
                            >
                              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center bg-green-500 shadow-lg">
                                <div className="text-3xl md:text-4xl text-white">{num}</div>
                                <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
                                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              {showControls && <div className="text-center text-green-600 text-xs">ยืนยันแล้ว</div>}
                            </motion.div>
                          ))}
                          {drawnNumbers.map((num, idx) => (
                            <motion.div
                              key={`drawn-${num}-${idx}`}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: (confirmedNumbers.length + idx) * 0.1 }}
                              className="relative flex flex-col gap-2"
                            >
                              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center bg-blue-500 shadow-lg">
                                <div className="text-3xl md:text-4xl text-white">{num}</div>
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="absolute -top-2 -right-2"
                                >
                                  <Sparkles className="h-6 w-6 text-blue-200" />
                                </motion.div>
                              </div>
                              {/* Actions only for Admin */}
                              {showControls && (
                                <Button
                                  onClick={() => confirmSingleNumber(num)}
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white border-0 h-8 text-xs rounded-lg shadow-md"
                                >
                                  ยืนยัน
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </>
                      ) : (
                        // Empty slots
                        Array(currentPrize.quantity)
                          .fill(null)
                          .map((_, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300"
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
                              <div className="text-2xl text-gray-800">
                                {prizeWinners.map((winner) => `#${winner.number}`).join(', ')}
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