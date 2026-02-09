import React from 'react';
import { Plus, Trash2, Trophy, Gift, Hash, ArrowUpDown, Sparkles, Info, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { motion } from 'framer-motion';
import fdaLogo from 'figma:asset/6c2c89f0c6a2632ed60440f59e2c757e8807fea4.png';

export interface Prize {
  id: string;
  name: string;
  quantity: number;
}

export type DrawOrder = 'ascending' | 'descending';

interface SetupPageProps {
  prizes: Prize[];
  onPrizesChange: (prizes: Prize[]) => void;
  onStartDraw: (drawOrder: DrawOrder) => void;
}

export function SetupPage({ prizes, onPrizesChange, onStartDraw }: SetupPageProps) {
  const [drawOrder, setDrawOrder] = React.useState<DrawOrder>('descending');
  
  const addPrize = () => {
    // Calculate the next prize number
    const prizeNumbers = prizes
      .map((p) => {
        const match = p.name.match(/รางวัลที่ (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n) => n > 0);
    
    const nextNumber = prizeNumbers.length > 0 ? Math.max(...prizeNumbers) + 1 : prizes.length + 1;
    
    const newPrize: Prize = {
      id: Date.now().toString(),
      name: `รางวัลที่ ${nextNumber}`,
      quantity: 1,
    };
    onPrizesChange([...prizes, newPrize]);
  };

  const deletePrize = (id: string) => {
    onPrizesChange(prizes.filter((p) => p.id !== id));
  };

  const updatePrize = (id: string, field: 'name' | 'quantity', value: string | number) => {
    onPrizesChange(
      prizes.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const canStartDraw = prizes.length > 0 && prizes.every((p) => p.name.trim() && p.quantity > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 pt-28">
      {/* Header Bar with Logo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-900/95 backdrop-blur-md border-b border-blue-800/30 shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg p-1">
            <img src={fdaLogo} alt="FDA Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <div className="text-white text-sm font-semibold drop-shadow-lg">สำนักงานคณะกรรมการอาหารและยา</div>
            <div className="text-blue-100 text-xs drop-shadow-lg">Food and Drug Administration</div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="h-10 w-10 text-white" />
              <h1 className="text-4xl text-white font-semibold">ระบบจับรางวัล</h1>
            </div>
            <p className="text-blue-50">ตั้งค่าและจัดการรางวัลของคุณ</p>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 bg-blue-50 rounded-2xl border border-blue-200 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-800 font-semibold mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  วิธีการเล่น
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-blue-600">เตรียมรางวัล:</strong> กำหนดรางวัลและจำนวนผู้โชคดีที่ต้องการแจก</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-blue-600">เริ่มเกม:</strong> เลือกลำดับการเล่นแล้วกดปุ่ม "เริ่มจับรางวัล"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-blue-600">สุ่มตัวเลข:</strong> กดปุ่มสุ่มเพื่อดูตัวเลขโชคดีหมุนวนไป จนกระทั่งหยุดที่ผู้ชนะ!</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-blue-600">ยืนยันผู้ชนะ:</strong> เลือกยืนยันทีละคนหรือยืนยันพร้อมกัน</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-blue-600">บันทึกผลการแข่งขัน:</strong> ดาวน์โหลดรายชื่อผู้ชนะทั้งหมดได้ทันที!</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Prize List */}
          <div className="space-y-4 mb-8">
            {prizes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>ยังไม่มีรางวัล คลิก "เพิ่มรางวัล" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              prizes.map((prize) => (
                <motion.div
                  key={prize.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    {/* Prize Name */}
                    <div className="flex-1 w-full">
                      <Label className="text-gray-700 mb-2 flex items-center gap-2 font-medium">
                        <Gift className="h-4 w-4 text-blue-600" />
                        ชื่อรางวัล
                      </Label>
                      <div className="relative">
                        <Input
                          value={prize.name}
                          onChange={(e) => updatePrize(prize.id, 'name', e.target.value)}
                          placeholder="เช่น เหรียญทอง, รางวัลใหญ่"
                          className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/50 pl-3"
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="w-full md:w-32">
                      <Label className="text-gray-700 mb-2 flex items-center gap-2 font-medium">
                        <Hash className="h-4 w-4 text-blue-600" />
                        จำนวน
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={prize.quantity}
                        onChange={(e) =>
                          updatePrize(prize.id, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-500/50"
                      />
                    </div>

                    {/* Delete Button */}
                    <Button
                      onClick={() => deletePrize(prize.id)}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50 border border-gray-200"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Draw Order Selection */}
          {prizes.length > 0 && (
            <div className="mb-8 bg-gray-50 rounded-2xl border border-gray-200 p-5">
              <Label className="text-gray-700 mb-3 flex items-center gap-2 font-medium">
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
                ลำดับการจับรางวัล
              </Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDrawOrder('descending')}
                  className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                    drawOrder === 'descending'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm mb-1 font-medium flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    น้อยไปมาก
                  </div>
                  <div className="text-xs opacity-70">รางวัลที่ 4 → 3 → 2 → 1</div>
                </button>
                <button
                  onClick={() => setDrawOrder('ascending')}
                  className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                    drawOrder === 'ascending'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm mb-1 font-medium flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    มากไปน้อย
                  </div>
                  <div className="text-xs opacity-70">รางวัลที่ 1 → 2 → 3 → 4</div>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={addPrize}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 rounded-xl shadow-md"
            >
              <Plus className="mr-2 h-5 w-5" />
              เพิ่มรางวัล
            </Button>
            <Button
              onClick={() => onStartDraw(drawOrder)}
              disabled={!canStartDraw}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0 h-12 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              เริ่มจับรางวัล
            </Button>
          </div>

          {!canStartDraw && prizes.length > 0 && (
            <p className="text-center text-red-600 mt-4 text-sm">
              กรุณากรอกชื่อรางวัลทั้งหมดและตรวจสอบให้จำนวนมากกว่า 0
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}