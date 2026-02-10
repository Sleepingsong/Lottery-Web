# เอกสารสเปคโปรแกรมระดับสูง (High-Level Program Specification): Lucky Draw System

## 1. ภาพรวม (Overview)
**Lucky Draw System** เป็นเว็บแอปพลิเคชันที่ออกแบบมาเพื่อจัดการกิจกรรมการจับรางวัลหรือล็อตเตอรี่ดิจิทัล ระบบมีอินเทอร์เฟซแบบคู่ (Dual-Interface) ที่ช่วยให้ผู้ดูแลระบบ (Admin) สามารถควบคุมกระบวนการจับรางวัลจากหน้าจอหนึ่ง ในขณะที่แสดงผลลัพธ์แบบเคลื่อนไหว (Animated View) ให้ผู้ชมเห็นบนอีกหน้าจอหนึ่ง (หรืออีกหน้าต่าง) ได้พร้อมกัน แอปพลิเคชันนี้ถูกสร้างขึ้นโดยเน้นความน่าเชื่อถือ ความสวยงาม และใช้งานง่าย โดยใช้ `localStorage` ในการซิงค์ข้อมูล (Synchronization) เพื่อลดความซับซ้อนของการต้องมี Backend Infrastructure

## 2. สถาปัตยกรรมระบบ (System Architecture)

### 2.1 เทคโนโลยีที่ใช้ (Technology Stack)
- **Framework**: React 18 (TypeScript) ร่วมกับ Vite
- **Styling**: Tailwind CSS, PostCSS
- **UI Components**: Radix UI (Headless primitives), Lucide React (Icons)
- **Animations**: Framer Motion
- **Data Export**: SheetJS (XLSX)
- **Routing**: React Router DOM (HashRouter)
- **State Management**: React Hooks + LocalStorage (สำหรับการซิงค์ข้ามหน้าต่าง)

### 2.2 โครงสร้างแอปพลิเคชัน (Application Structure)
แอปพลิเคชันใช้ **HashRouter** เพื่อจัดการหน้าหลัก 2 หน้า:
1.  **Admin Panel (`/`)**: ศูนย์ควบคุมสำหรับการตั้งค่าของรางวัลและจัดการการจับรางวัล
2.  **Display Panel (`/display`)**: หน้าสำหรับแสดงผล (Read-only) ที่มีการออกแบบให้สวยงาม เหมาะสำหรับนำขึ้นจอ Projector ให้ผู้ชมดู

### 2.3 การไหลของข้อมูลและการซิงค์ (Data Flow & Synchronization)
ระบบทำงานบนสถาปัตยกรรมแบบ **Serverless / Client-Side Only**
- **State Source of Truth**: React State ของฝั่ง Admin Panel คือข้อมูลหลัก
- **กลไกการซิงค์ (Synchronization Mechanism)**:
    - Admin Panel จะเขียนการเปลี่ยนแปลง State (เช่น ผู้ชนะ, รางวัลปัจจุบัน, หมายเลขที่จับได้) ลงใน `localStorage` ของเบราว์เซอร์ ภายใต้ Keys เช่น `lottery_game_state` และ `lottery_prizes`
    - Display Panel จะคอยฟัง event `storage` เพื่ออัปเดต UI แบบ Real-time
    - วิธีนี้ช่วยให้สามารถตั้งค่าแบบ Multi-window (เช่น Admin บนแล็ปท็อป, Display บนโปรเจคเตอร์) ได้โดยไม่ต้องมี Backend Server

## 3. ความต้องการด้านการทำงาน (Functional Requirements)

### 3.1 การตั้งค่าและกำหนดค่า (Setup & Configuration)
**Setup Page** เป็นจุดเริ่มต้นสำหรับ Administrator
- **การจัดการรางวัล (Prize Management)**:
    - เพิ่ม, แก้ไข และลบรางวัลได้
    - กำหนดชื่อรางวัล (Prize Name) และจำนวนรางวัล (Quantity)
    - ระบบรันหมายเลขรางวัลอัตโนมัติ (เช่น รางวัลที่ 1, รางวัลที่ 2)
- **การตั้งค่าการจับรางวัล (Draw Settings)**:
    - **Draw Order**: สลับลำดับได้ระหว่าง Ascending (รางวัลที่ 4 -> 1) หรือ Descending (รางวัลที่ 1 -> 4)
- **Validation**: ป้องกันการเริ่มจับรางวัลหากข้อมูลไม่ครบถ้วน (เช่น ชื่อว่างเปล่า, จำนวน < 1)

### 3.2 กระบวนการจับรางวัล (Drawing Process)
**Drawing Page** จัดการลูปการทำงานหลักของเกม
- **การสุ่มตัวเลข (Random Number Generation)**: สร้างตัวเลขระบุตัวตน (1-999) โดยรับประกันว่าจะไม่ซ้ำกันภายใน Session เดียวกัน (ใช้ `Set` ในการตรวจสอบเลขที่ใช้ไปแล้ว)
- **Animation**:
    - จำลองเอฟเฟกต์ "ตัวเลขวิ่ง" (Rolling effect) ก่อนที่จะหยุดที่ผู้ชนะ
    - มีเอฟเฟกต์ "Sparkle" และ Animation การเปิดเผยผลรางวัลโดยใช้ Framer Motion
- **โหมด Batch vs. Single**:
    - **Batch Draw**: สุ่มผู้ชนะพร้อมกันสำหรับรางวัลที่เหลือทั้งหมดในรอบนั้น (เช่น จับรางวัล 5 คนพร้อมกัน)
    - **Single Draw**: รองรับการยืนยันผู้ชนะทีละคน (เป็นความสามารถพื้นฐาน เน้นไปที่ Batch ในโค้ดปัจจุบัน)
- **การยืนยัน (Confirmation)**:
    - Admin ตรวจสอบตัวเลขที่สุ่มได้ ก่อนกด "Confirm" เพื่อบันทึกลงในรายการผู้ชนะอย่างเป็นทางการ
    - ผู้ชนะที่ยืนยันแล้วจะแสดงบน Dashboard อย่างถาวร

### 3.3 การจัดการหลังการจับรางวัล (Post-Draw Management)
- **Winner List**: แสดงรายการผู้ชนะโดยจัดกลุ่มตามประเภทรางวัล
- **Export**: สร้างไฟล์ Excel (`.xlsx`) ที่ประกอบด้วย:
    - ลำดับ (Sequence Number)
    - ชื่อรางวัล (Prize Name)
    - หมายเลขที่ชนะ (Winning Number)
    - วันที่และเวลา (Date & Timestamp)
- **การเพิ่มรางวัลระหว่างทาง (Dynamic Additions)**: Admin สามารถเพิ่ม "Special Prizes" ได้ทันที แม้ว่าการจับรางวัลหลักจะเสร็จสิ้นไปแล้ว

## 4. การออกแบบส่วนต่อประสานผู้ใช้ (User Interface Design)

### 4.1 ความสวยงาม (Aesthetics)
- **Theme**: "Clean & Official" (ผนวกเข้ากับแบรนด์/สีของ FDA ตามโลโก้ที่ใช้)
- **Backgrounds**: Gradient สีฟ้า/เทา (`bg-gradient-to-br from-slate-50 via-blue-50`)
- **Feedback**:
    - **Sonner**: การแจ้งเตือนแบบ Toast สำหรับเหตุการณ์ต่างๆ ของระบบ
    - **Interactive**: สถานะ Hover และ Disabled สำหรับปุ่มต่างๆ

### 4.2 ความรองรับหน้าจอ (Responsiveness)
- Layout ปรับเปลี่ยนได้ตามความละเอียดมาตรฐานของ Desktop (Admin view) และหน้าจอขนาดใหญ่ (Projector view)
- ใช้ CSS Grid และ Flexbox เพื่อการจัดวางที่ลื่นไหล

## 5. พจนานุกรมข้อมูล / โมเดล (Data Dictionary / Models) *** ปัจจุบันยังไม่ใช้ Database ***

### 5.1 Prize (รางวัล)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | รหัสที่ไม่ซ้ำกัน (Timestamp-based) |
| `name` | string | ชื่อที่แสดง (เช่น "เหรียญทอง") |
| `quantity` | number | จำนวนผู้โชคดีทั้งหมดสำหรับรางวัลนี้ |

### 5.2 Winner (ผู้ชนะ)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | รหัสที่ไม่ซ้ำกัน |
| `prizeName` | string | ชื่อรางวัลที่ชนะ |
| `number` | number | หมายเลขที่ชนะ (1-999) |
| `timestamp` | number | Unix timestamp ของเวลาที่ยืนยัน |

### 5.3 GameState (LocalStorage)
| Key | Content |
| :--- | :--- |
| `currentPrizeIndex` | Index ของรางวัลที่กำลังจับอยู่ |
| `isDrawing` | สถานะ Boolean ของลูป Animation |
| `drawnNumbers` | Array ของตัวเลขที่กำลังแสดงเป็น "ตัวเลือกชั่วคราว" |
| `confirmedNumbers` | Array ของตัวเลขที่ยืนยันอย่างเป็นทางการแล้ว |
| `usedNumbers` | Array ของตัวเลขทั้งหมดที่ใช้ไปแล้วเพื่อป้องกันการซ้ำ |

## 6. การพิจารณาในอนาคต (Future Considerations / Extensibility)
- **Backend Integration**: ปัจจุบันเป็น Local-only สามารถขยายเพื่อบันทึกผลลง Database ได้
- **Custom Branding**: ปัจจุบัน Logo ถูก Hardcoded (FDA) สามารถทำให้ Configurable ได้ในอนาคต
- **Sound Effects**: เพิ่มเสียงประกอบสำหรับการหมุนและตอนชนะรางวัล
