# New Laptop Setup & Installation Guide
**Project:** Social Media Monitoring & Scraping Tool  
**Repository:** [https://github.com/joeljeevank/SocialMediaMonitoringTool](https://github.com/joeljeevank/SocialMediaMonitoringTool)  
**Branch:** `backend`

---

## ⚠️ 1. CRITICAL STEP: Save Your Secrets Before Changing Laptops

Because `.env` files are ignored by Git for security, your secret keys and credentials are **not** present in the GitHub repository.

> [!CAUTION]
> **Before wiping or formatting your old laptop**, copy your existing `backend/.env` file to a USB drive or cloud storage.

Make sure you have values for:
- `DB_PASSWORD` (Your PostgreSQL password)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (`http://localhost:3001/api/youtube/auth/callback`)
- `YOUTUBE_API_KEY`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI` (`http://localhost:3001/auth/linkedin/callback`)
- `LINKEDIN_LI_AT_COOKIE`
- `EMAIL_USER` & `EMAIL_PASS`

---

## 2. Software & Runtimes to Install

Install the following software on your new laptop in this order:

### A. Git
- Download from: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- During installation, select standard defaults.
- Once installed, configure your Git identity in terminal:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "sjjkumar2004@gmail.com"
  ```

### B. Node.js (Version 20.x LTS)
- Download from: [https://nodejs.org/](https://nodejs.org/) (Select the **LTS** version).
- Verify in terminal:
  ```bash
  node -v   # Should output v20.x.x
  npm -v    # Should output 10.x.x
  ```

### C. PostgreSQL Database Server
- Download from: [https://www.postgresql.org/download/](https://www.postgresql.org/download/) (PostgreSQL 15 or 16).
- **Configuration during installer wizard:**
  - **Port:** `5432` (default)
  - **Superuser username:** `postgres`
  - **Password:** Set your password (make sure this matches `DB_PASSWORD` in your `backend/.env`).
  - **pgAdmin 4:** Keep checked (useful for visualizing database tables).

### D. Code Editor (VS Code)
- Download from: [https://code.visualstudio.com/](https://code.visualstudio.com/)
- Recommended Extensions:
  - **ESLint**
  - **Prettier - Code formatter**
  - **Tailwind CSS IntelliSense**

---

## 3. Cloning & Setting Up the Project

Open PowerShell or your preferred terminal on the new laptop:

### Step 1: Clone the Repository
```bash
git clone https://github.com/joeljeevank/SocialMediaMonitoringTool.git
cd SocialMediaMonitoringTool
git checkout backend
```

---

### Step 2: Configure the Backend

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright Browsers:**
   > [!IMPORTANT]
   > The scraper relies on Playwright headless browsers. You must install the browser binaries:
   ```bash
   npx playwright install
   ```

4. **Set up Environment Variables (`.env`):**
   - Create a `.env` file in the `backend/` folder:
     - On Windows PowerShell:
       ```powershell
       Copy-Item .env.example .env
       ```
     - On Command Prompt:
       ```cmd
       copy .env.example .env
       ```
   - Open `backend/.env` in VS Code and paste your saved credentials and PostgreSQL password (`DB_PASSWORD`).

---

### Step 3: Configure the Frontend

1. **Open a new terminal tab/window and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

---

## 4. Running the Applications

Always ensure your PostgreSQL service is running before starting the backend.

### Terminal 1: Start Backend (NestJS)
```bash
cd backend
npm run start:dev
```
- Runs on: **`http://localhost:3001`**
- *Note: TypeORM is configured with `synchronize: true`, so it will automatically generate all necessary database tables (`account`, `analytics`, `youtube_channels`, etc.) on first boot.*

### Terminal 2: Start Frontend (Next.js)
```bash
cd frontend
npm run dev
```
- Runs on: **`http://localhost:3000`**
- Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.

---

## 5. Quick Verification Checklist

| Check | Expected Result | Command / Action |
|---|---|---|
| **Node.js** | `v20.x.x` | `node -v` |
| **PostgreSQL** | Port 5432 active | Check Services or connect via pgAdmin |
| **Playwright** | Installed | `npx playwright --version` |
| **Backend Build** | Clean build | `cd backend && npm run build` |
| **Backend API** | Responding | Open `http://localhost:3001` |
| **Frontend UI** | Dashboard loads | Open `http://localhost:3000` |
