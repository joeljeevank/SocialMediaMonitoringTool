# Browser Downloads & Installation Checklist
**Project:** Social Media Monitoring & Scraping Tool  
**Purpose:** Direct browser download links and installer instructions for setting up a new laptop.

---

## 📥 Quick Download Summary

Open your browser and download the following 4 installers:

| # | Software | Purpose | Direct Download Link |
|---|---|---|---|
| **1** | **Node.js (LTS)** | JavaScript Runtime & NPM | [https://nodejs.org/](https://nodejs.org/) |
| **2** | **Git for Windows** | Source Control & Repository Cloning | [https://git-scm.com/download/win](https://git-scm.com/download/win) |
| **3** | **PostgreSQL 16** | Database Server & pgAdmin 4 | [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) |
| **4** | **VS Code** | Code Editor | [https://code.visualstudio.com/Download](https://code.visualstudio.com/Download) |
| **5** | **Google Chrome** | Testing Web App & OAuth | [https://www.google.com/chrome/](https://www.google.com/chrome/) |

---

## 🛠️ Detailed Download & Setup Instructions

### 1. Node.js (Version 20.x LTS)
* **Website:** [https://nodejs.org/](https://nodejs.org/)
* **What to do:**
  1. Open the website.
  2. Click the large green button labeled **"LTS (Recommended For Most Users)"**.
  3. Run the downloaded `.msi` file.
  4. Follow the setup wizard using default settings (this automatically installs both `node` and `npm`).

---

### 2. Git for Windows
* **Website:** [https://git-scm.com/download/win](https://git-scm.com/download/win)
* **What to do:**
  1. Click **"Click here to download"** or select **"64-bit Git for Windows Setup"**.
  2. Run the `.exe` installer.
  3. Keep default settings clicked through the installer.

---

### 3. PostgreSQL Database Server
* **Website:** [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
* **What to do:**
  1. Look under the **Windows x86-64** column.
  2. Click **Download** next to **Version 16** (or **Version 15**).
  3. Run the installer `.exe`.
* **Important Settings During Installation:**
  - **Components:** Ensure **PostgreSQL Server**, **pgAdmin 4**, and **Command Line Tools** are checked.
  - **Port:** Keep default `5432`.
  - **Password:** Enter a password for the `postgres` user (e.g., `post123` or your personal password).
  > [!IMPORTANT]
  > Note this password down! You will need to put it into your `backend/.env` file under `DB_PASSWORD`.

---

### 4. Visual Studio Code
* **Website:** [https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)
* **What to do:**
  1. Click the blue **"Windows (User Installer)"** button.
  2. Run the setup and complete installation.
  3. *(Optional)* Recommended VS Code extensions to install from within VS Code:
     - **ESLint**
     - **Prettier - Code formatter**
     - **Tailwind CSS IntelliSense**

---

## ⏭️ Next Step After Installing

Once all 4 installers are finished:
1. Open PowerShell or Command Prompt.
2. Follow the project setup commands in [NEW_LAPTOP_SETUP_GUIDE.md](file:///d:/MCA/SEM3/SD%20LAB/SocialMediaMSScrapingTechnique/NEW_LAPTOP_SETUP_GUIDE.md) to clone the repository and run the project!
