# Setup Instructions

The project was missing critical configuration and dependencies. I have:
1. Created `tsconfig.json` to configure TypeScript.
2. Created `src/vite-env.d.ts` to support Vite types.
3. Updated `package.json` to include missing type definitions for React.

## Critical Step Required

You do not have `node_modules` installed, and `npm` was not found in your system path.

**You must install Node.js and run `npm install` to fix the "Cannot find module 'react'" error.**

### Steps:
1. **Install Node.js**: Download and install the LTS version from [nodejs.org](https://nodejs.org/).
2. **Open Terminal**: Open a new terminal window (to refresh environment variables).
3. **Navigate to Project**:
   ```powershell
   cd "c:\Users\prang\OneDrive\Chanwanich\Works\Project\Track&Trace\Lottery Program"
   ```
   *Note: Use quotes because your path contains `&`.*
4. **Install Dependencies**:
   ```powershell
   npm install
   ```
5. **Start the App**:
   ```powershell
   npm run dev
   ```
