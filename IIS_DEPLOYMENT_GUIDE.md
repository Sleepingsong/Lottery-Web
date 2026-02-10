---
title: คู่มือการติดตั้งและ Deploy Lottery Web บน IIS
---

# คู่มือการติดตั้งโปรเจกต์ Lottery Web บน IIS (Internet Information Services)

เอกสารนี้จะอธิบายขั้นตอนการนำโปรเจกต์ Lottery Web (React/Vite) ไปติดตั้งบนเครื่อง Windows Server ที่ใช้งาน IIS โดยละเอียด

---

## 1. สิ่งที่ต้องเตรียม (Prerequisites)

### 1.1 บนเครื่องที่ใช้ Build (เครื่องของคุณ)
*   **Node.js**: สำหรับรันคำสั่ง Build (แนะนำเวอร์ชัน LTS เช่น v18 ขึ้นไป)
*   **Source Code**: โปรเจกต์ Lottery Web ที่สมบูรณ์

### 1.2 บนเครื่อง Server (Windows Server)
*   **IIS (Internet Information Services)**: ต้องติดตั้ง Role นี้แล้ว
*   **IIS URL Rewrite Module 2.1**: **(สำคัญมาก)** ต้องติดตั้งเพื่อให้ Routing ของ React ทำงานได้ถูกต้องเมื่อ Refresh หน้า
    *   ดาวน์โหลดได้ที่: [Microsoft URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)

---

## 2. ขั้นตอนการ Build โปรเจกต์ (ทำบนเครื่อง Dev)

1.  เปิด Terminal หรือ Command Prompt ในโฟลเดอร์โปรเจกต์
2.  รันคำสั่งเพื่อติดตั้ง Dependency (ถ้ายังไม่เคยทำ):
    ```bash
    npm install
    ```
3.  รันคำสั่ง Build เพื่อสร้างไฟล์สำหรับ Production:
    ```bash
    npm run build
    ```
4.  เมื่อเสร็จสิ้น คุณจะได้โฟลเดอร์ชื่อ **`dist`** ซึ่งภายในจะประกอบด้วย:
    *   `index.html`
    *   `web.config` (ไฟล์ตั้งค่า IIS สำคัญมาก)
    *   โฟลเดอร์ `assets` (เก็บไฟล์ CSS, JS, รูปภาพ ต่างๆ)

---

## 3. ขั้นตอนการติดตั้งบน IIS Server (ทำบนเครื่อง Server)

### 3.1 สร้างโฟลเดอร์สำหรับเก็บไฟล์เว็บไซต์
1.  สร้างโฟลเดอร์ใหม่บนเครื่อง Server (เช่น `C:\inetpub\wwwroot\LotteryWeb`)
2.  นำไฟล์ **ทั้งหมด** จากในโฟลเดอร์ **`dist`** (จากขั้นตอนที่ 2) มาวางลงในโฟลเดอร์นี้
    *   *หมายเหตุ: ต้องมีไฟล์ `web.config` ติดมาด้วย*

### 3.2 สร้าง Application Pool (Optional แต่แนะนำ)
1.  เปิดโปรแกรม **IIS Manager** (พิมพ์ `inetmgr` ใน Run)
2.  คลิกขวาที่ **Application Pools** > **Add Application Pool...**
3.  ตั้งชื่อ: `LotteryAppPool`
4.  .NET CLR version: เลือก **No Managed Code** (เพราะเป็น Static Site ไม่ใช้ .NET Backend)
5.  Managed pipeline mode: **Integrated**
6.  กด **OK**

### 3.3 สร้าง Website ใหม่
1.  คลิกขวาที่ **Sites** > **Add Website...**
2.  **Site name:** ตั้งชื่อเว็บ (เช่น `LotteryWeb`)
3.  **Application pool:** เลือก `LotteryAppPool` ที่สร้างไว้ (หรือ DefaultAppPool ถ้าไม่ได้สร้าง)
4.  **Physical path:** เลือกโฟลเดอร์ที่เก็บไฟล์ (`C:\inetpub\wwwroot\LotteryWeb`)
5.  **Binding:**
    *   Type: `http` (หรือ `https` ถ้ามี Certificate)
    *   Port: กำหนด Port ที่ต้องการ (เช่น `80` หรือ `8080`)
    *   Host name: ใส่ชื่อ Domain (ถ้ามี) หรือปล่อยว่างเพื่อเข้าผ่าน IP
    *   *หมายเหตุ: ถ้าใช้ Port 80 ตรวจสอบว่าไม่ชนกับ Default Web Site หรือ Site อื่น*
6.  กด **OK**

---

## 4. การตรวจสอบและการตั้งค่าเพิ่มเติม

### 4.1 ตรวจสอบ URL Rewrite Rule
หากติดตั้ง **URL Rewrite Module** แล้ว และไฟล์ `web.config` ถูกต้อง:
1.  คลิกที่ชื่อ Site (`LotteryWeb`) ใน IIS Manager
2.  ดับเบิ้ลคลิกที่ไอคอน **URL Rewrite**
3.  ควรเห็นกฎชื่อ **"React Routes"** ปรากฏขึ้นมา (ถ้าไม่เห็น แสดงว่าไฟล์ `web.config` ไม่ถูก copy มา หรือ Copy มาผิด)

### 4.2 ทดสอบเข้าใช้งาน
1.  เปิด Browser แล้วเข้า http://localhost (หรือ Port/IP ที่ตั้งไว้)
2.  หน้าเว็บควรขึ้นปกติ
3.  **ทดสอบ Routing:** ลองกดเข้าหน้าย่อย (เช่นหน้าจับรางวัล) แล้วกด **Refresh (F5)** หน้าเว็บจะต้อง **ไม่ขึ้น 404 Error**

### 4.3 หากเจอปัญหา 404 เมื่อ Refresh หรือเข้า Link ตรง
*   **สาเหตุ:** URL Rewrite Module ยังไม่ได้ติดตั้ง หรือติดตั้งไม่สมบูรณ์ หรือไม่มีไฟล์ `web.config`
*   **แก้ไข:** ติดตั้ง [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite) และตรวจสอบไฟล์ `web.config` ว่ามีเนื้อหาดังนี้:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
    </staticContent>
  </system.webServer>
</configuration>
```

---

## 5. การอัปเดตเว็บไซต์ในอนาคต (Redeploy)
เมื่อมีการแก้ไข Code:
1.  รัน `npm run build` ใหม่บนเครื่อง Dev
2.  ลบไฟล์เก่าทั้งหมดใน `C:\inetpub\wwwroot\LotteryWeb` (หรือ path ที่ตั้งไว้)
3.  นำไฟล์ใหม่จาก `dist` ไปวางแทนที่
4.  *ไม่ต้อง Restart IIS ยกเว้นกรณีจำเป็น*

---
จบขั้นตอนการติดตั้ง
