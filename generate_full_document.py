import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from scratch_helpers import set_cell_background, set_cell_margins, style_table, add_code_block, add_callout

def build_documentation():
    doc = Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Document Header / Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    t_run = title_p.add_run("SocialPulse PRO")
    t_run.font.name = "Segoe UI"
    t_run.font.size = Pt(26)
    t_run.font.bold = True
    t_run.font.color.rgb = RGBColor(79, 70, 229)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(18)
    sub_run = sub_p.add_run("Social Media Monitoring & Scraping Tool — Complete Technical Architecture & Specification")
    sub_run.font.name = "Segoe UI"
    sub_run.font.size = Pt(13)
    sub_run.font.color.rgb = RGBColor(71, 85, 105)

    # Helper function for Headings
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(16)
        r.font.bold = True
        r.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(12.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(10)
        r.font.color.rgb = RGBColor(51, 65, 85)
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Segoe UI"
            r_bold.font.size = Pt(9.5)
            r_bold.font.bold = True
            r_bold.font.color.rgb = RGBColor(15, 23, 42)
        r = p.add_run(text)
        r.font.name = "Segoe UI"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(51, 65, 85)
        return p

    # ==========================================
    # 1. INTRODUCTION
    # ==========================================
    add_h1("1. INTRODUCTION")
    add_h2("1.1 Project Overview & Background")
    add_p(
        "The Social Media Monitoring & Scraping Tool (branded as SocialPulse PRO) is an enterprise-grade analytics, "
        "monitoring, and telemetry suite engineered to aggregate, process, normalize, and visualize cross-platform "
        "performance metrics across LinkedIn and YouTube."
    )
    add_p(
        "Modern digital brand monitoring and multi-channel telemetry face severe platform limitations:\n"
        "1. API Paywalls and Scope Restrictions: Enterprise social platforms such as LinkedIn severely restrict follower "
        "counts and individual post interaction analytics behind high-tier enterprise partner tiers (such as the LinkedIn "
        "Community Management API or Marketing Developer Platform). For independent brands and standard developers, basic OAuth "
        "tokens only grant identity scopes (openid, profile, email).\n"
        "2. Platform Fragmentation: Tracking brand presence across channels forces organizations to juggle disparate authentication "
        "standards, differing rate limits, and incompatible data structures (e.g. YouTube's dual public API keys vs Google OAuth Studio access)."
    )
    add_p(
        "To resolve these barriers, SocialPulse PRO implements a Hybrid Telemetry Architecture:\n"
        "• LinkedIn Telemetry Engine: Uses an automated Playwright headless Chromium browser scraping pipeline equipped with cookie "
        "session persistence (li_at), anti-bot fingerprint masking, deep DOM feed traversal, and a 64-bit Snowflake timestamp extraction algorithm, "
        "paired with official LinkedIn OAuth 2.0 endpoints for authorized organization management.\n"
        "• YouTube Telemetry Engine: Combines the YouTube Data API v3 (for public channel tracking by handle/ID with zero login friction) and "
        "Google OAuth 2.0 with the YouTube Analytics API (for private studio analytics including watch time, average view duration, and subscriber churn).\n"
        "• Presentation & Management Layer: A Next.js (App Router) responsive dashboard featuring an in-memory 0ms hydration cache, dark/light theme switching, "
        "role-based access control (Super Admin vs. Manager), automated SMTP email onboarding, report exporting (CSV and executive printable summaries), "
        "and multi-channel side-by-side comparative benchmarking."
    )

    add_h2("1.2 Core Objectives and Scope")
    add_bullet("Collect impressions, followers, reactions, comments, reposts, video views, watch time, and subscriber dynamics without manual intervention.", "Automated Multi-Source Extraction: ")
    add_bullet("Execute headless browser automation seamlessly across both local development environments and containerized cloud hosts (e.g., Render/Linux) with automated browser binary detection and stale lock cleanup.", "Resilient Headless Execution: ")
    add_bullet("Deliver instantaneous (0ms frame-1) client-side tab switching using an SSR-safe in-memory cache synchronized with browser session storage.", "Sub-Second Dashboard Telemetry: ")
    add_bullet("Isolate administrative capabilities (manager creation, global account deletion) to Super Admins while allowing Managers to monitor assigned brand footprints.", "Role-Based Security: ")
    add_bullet("Export granular CSV datasets and structured executive reports for offline business analysis.", "Auditable Reporting: ")

    add_h2("1.3 Complete Technology Stack")
    tech_headers = ["Layer", "Technology", "Version / Spec", "Role in Architecture"]
    tech_data = [
        ["Backend Framework", "NestJS", "v11.0.1", "Modular server architecture, dependency injection, and REST API routing"],
        ["Runtime Environment", "Node.js", "v20.x LTS", "High-performance asynchronous server runtime"],
        ["Programming Language", "TypeScript", "v5.7.3", "Strongly-typed enterprise development across frontend and backend"],
        ["Database ORM", "TypeORM", "v1.1.0", "Object-Relational Mapping, entity definitions, schema synchronization"],
        ["Relational Database", "PostgreSQL", "v15 / v16 (pg v8.22)", "Persistent transactional relational storage for telemetry and accounts"],
        ["Browser Automation", "Playwright (Chromium)", "v1.62.1", "Headless DOM parsing, session cookie injection, infinite scroll feed scraping"],
        ["Cloud Google APIs", "googleapis", "v178.0.0", "Official client for YouTube Data API v3 and YouTube Analytics API"],
        ["Email Transport", "Nodemailer", "v9.0.4", "Automated SMTP email delivery with multi-port fallback (465/587)"],
        ["HTTP Client", "Axios", "v1.19.0", "LinkedIn REST API calls, OAuth token exchange, and external requests"],
        ["Frontend Framework", "Next.js", "v14+ (App Router)", "Server-side rendering (SSR), static optimization, layout route grouping"],
        ["Frontend UI & Icons", "Tailwind CSS / Lucide", "Modern Design System", "Sleek dark/light aesthetic, responsive grid system, glassmorphism UI"],
        ["Data Visualization", "Recharts", "v2.x", "Interactive Area charts, Bar charts, and multi-series line comparisons"],
    ]
    t1 = doc.add_table(rows=1, cols=4)
    style_table(t1, [1.4, 1.3, 1.2, 2.6], tech_headers, tech_data)

    # ==========================================
    # 2. SYSTEM DESIGN
    # ==========================================
    add_h1("2. SYSTEM DESIGN")
    add_h2("2.1 Architectural Paradigm")
    add_p(
        "The system adheres to a 3-Tier Service-Oriented Architecture (SOA) with decoupled Client, Application, and Persistence layers. "
        "Communication is facilitated over asynchronous JSON REST APIs."
    )
    
    arch_ascii = (
        "+---------------------------------------------------------------------------------------+\n"
        "|                                  PRESENTATION LAYER                                   |\n"
        "|                      (Next.js App Router, React 18, Tailwind CSS)                     |\n"
        "|                                                                                       |\n"
        "|  [ Auth / Login ]  [ Overview ]  [ LinkedIn Hub ]  [ YouTube Hub ]  [ Reports / CSV ] |\n"
        "|         |                 |              |               |                 |          |\n"
        "|  +---------------------------------------------------------------------------------+  |\n"
        "|  |       Client Telemetry Cache (RAM Map + SessionStorage Pub/Sub Store)           |  |\n"
        "|  +---------------------------------------------------------------------------------+  |\n"
        "+-------------------------------------------+-------------------------------------------+\n"
        "                                            | HTTPS / JSON REST\n"
        "+-------------------------------------------v-------------------------------------------+\n"
        "|                               APPLICATION LOGIC LAYER                                 |\n"
        "|                         (NestJS Server on Express Platform)                           |\n"
        "|                                                                                       |\n"
        "|  +-------------------+  +-------------------+  +-----------------------------------+  |\n"
        "|  |   AppController   |  |LinkedinController |  |        YoutubeController          |  |\n"
        "|  |    AppService     |  |  LinkedinService  |  |          YoutubeService           |  |\n"
        "|  | - Auth & RBAC     |  | - OAuth2 REST     |  | - Channel Track (Data API v3)     |  |\n"
        "|  | - User Management |  | - Org Management  |  | - OAuth2 Flow & Token Exchange    |  |\n"
        "|  | - SMTP Mailer     |  | - Rest Acls & Stat|  | - Analytics API (Watch Time)      |  |\n"
        "|  +-------------------+  +-------------------+  | - Video Duration & Stats Sync     |  |\n"
        "|                                                | - Comparison Engine               |  |\n"
        "|  +------------------------------------------+  +-----------------------------------+  |\n"
        "|  |            CollectorController           |                                         |\n"
        "|  |             CollectorService             |                                         |\n"
        "|  | - Persistent Playwright Chromium Context |                                         |\n"
        "|  | - Anti-Bot Stealth Evasions              |                                         |\n"
        "|  | - Snowflake ID Timestamp Extraction      |                                         |\n"
        "|  | - Dynamic Feed Scroll & Post Extraction  |                                         |\n"
        "|  +------------------------------------------+                                         |\n"
        "+---------------------+---------------------------------------------------+-------------+\n"
        "                      |                                                   |\n"
        "                      | TypeORM Engine                                    | HTTP / Scraping\n"
        "+---------------------v-----------------------+   +-----------------------v-------------+\n"
        "|              DATA STORAGE LAYER             |   |         EXTERNAL PLATFORMS          |\n"
        "|                 (PostgreSQL)                |   |                                     |\n"
        "|                                             |   |  - LinkedIn Web (li_at session)     |\n"
        "|  - users              - account             |   |  - LinkedIn API (api.linkedin.com)  |\n"
        "|  - organization       - analytics           |   |  - Google Cloud OAuth 2.0           |\n"
        "|  - post               - youtube_channels    |   |  - YouTube Data API v3              |\n"
        "|  - youtube_videos     - youtube_analytics   |   |  - YouTube Analytics API            |\n"
        "+---------------------------------------------+   |  - SMTP Host (Gmail / Port 465/587) |\n"
        "                                                  +-------------------------------------+"
    )
    add_code_block(doc, arch_ascii)

    add_h2("2.2 Key Architectural Patterns")
    add_bullet(
        "When official REST APIs are restricted or prohibitively expensive (e.g., LinkedIn public follower counts and individual post views without enterprise API tier), "
        "the system gracefully routes requests to the Playwright Scraping Engine. When official APIs offer complete and high-resolution access (e.g., YouTube Data API v3 and YouTube Analytics API), "
        "the system uses the official Google Cloud SDK.",
        "1. Hybrid Ingestion Pattern: "
    )
    add_bullet(
        "LinkedIn activity URNs (urn:li:activity:7182938491823910293) embed creation timestamps using Twitter-style 64-bit Snowflake IDs. "
        "The backend decodes the 64-bit BigInt by shifting it right by 22 bits (BigInt(activityId) >> 22n) to compute exact millisecond Unix timestamps without relying on vague DOM relative strings like '3w ago'.",
        "2. Snowflake Timestamp Extraction Algorithm: "
    )
    add_bullet(
        "Playwright uses persistent user data directories (.linkedin-browser-profile-{accountId}). "
        "Before launching Chromium, the cleanStaleLocks() routine removes orphaned lock files (SingletonLock, SingletonCookie, SingletonSocket, lockfile), preventing cloud server crashes when containers restart unexpectedly.",
        "3. Persistent Browser Context & Stale Lock Management: "
    )
    add_bullet(
        "Backend RAM Cache: Accounts and historical analytics cache (accountsCache) with invalidation hooks on account update or deletion. "
        "Frontend RAM + Storage Cache: In-memory Map coupled with sessionStorage and event subscription listeners (data-cache.ts), providing 0ms frame-1 UI loading when switching between dashboard tabs.",
        "4. Two-Tier Resilient Caching Architecture: "
    )
    add_bullet(
        "AppService.sendAccountEmail implements a cascading fallback sequence: "
        "(1) Custom Configured Host/Port, (2) Direct Gmail SSL port 465, (3) Direct Gmail STARTTLS port 587, (4) Nodemailer default service alias 'gmail'.",
        "5. Multi-Strategy Resilient SMTP Delivery: "
    )

    # ==========================================
    # 3. WORK FLOW DIAGRAM
    # ==========================================
    add_h1("3. WORK FLOW DIAGRAM")
    add_h2("3.1 Authentication & User Management Workflow")
    add_p(
        "This workflow details the onboarding of team managers by a Super Admin and subsequent secure authentication into the system:"
    )
    auth_flow = (
        "1. Super Admin navigates to /dashboard/users/add and submits Manager details (Name, Email, Role, Company).\n"
        "2. POST /managers endpoint checks PostgreSQL users table for duplicate email.\n"
        "3. If unique, backend generates a secure 8-character random password (Math.random().toString(36).slice(-8)).\n"
        "4. User record is saved in PostgreSQL with role='manager'.\n"
        "5. Nodemailer SMTP engine triggers styled HTML credential dispatch to the manager's inbox.\n"
        "6. Manager receives email containing login URL, email, and temporary password.\n"
        "7. Manager enters credentials at / (Login Page) -> POST /auth/login verifies credentials.\n"
        "8. Backend returns JWT session token, name, email, company, and role.\n"
        "9. Next.js dashboard stores session in sessionStorage/localStorage and hydrates dashboard view."
    )
    add_code_block(doc, auth_flow)

    add_h2("3.2 LinkedIn Data Scraping & Ingestion Workflow")
    add_p(
        "This workflow depicts the automated execution path of the Playwright headless browser collection engine:"
    )
    li_flow = (
        "1. User clicks 'Sync Now' on LinkedIn dashboard -> POST /api/linkedin/collect?accountId={id}.\n"
        "2. CollectorService checks activeCollections lock set to reject duplicate concurrent runs.\n"
        "3. cleanStaleLocks() executes to clear any lingering SingletonLock or SingletonCookie files.\n"
        "4. Playwright launches persistent Chromium context with stealth anti-bot args and webdriver masking.\n"
        "5. In production/cloud, LINKEDIN_LI_AT_COOKIE is injected into the context.\n"
        "6. Navigation to https://www.linkedin.com/feed/ to verify active session (#global-nav check).\n"
        "7. Navigation to target profile or company page.\n"
        "8. Followers and profile impressions are extracted from DOM Top Card selectors and regex heuristics.\n"
        "9. Navigation to /recent-activity/all/ or /posts/ feed.\n"
        "10. Deep feed scrolling loop executes (up to 20 cycles), clicking 'Show more' buttons and lazy-loading posts.\n"
        "11. Raw post cards are extracted (URN, text content, author, reactions, comments, impressions, reposts).\n"
        "12. Snowflake ID extraction: BigInt(urn_id) >> 22n decodes exact creation timestamps.\n"
        "13. Aggregated metrics saved into analytics table; individual posts upserted into post table.\n"
        "14. Browser context safely closed in finally block; cache invalidated; fresh metrics returned to client."
    )
    add_code_block(doc, li_flow)

    add_h2("3.3 YouTube Data Synchronization & Analytics Pipeline")
    add_p(
        "This workflow handles dual-mode ingestion for YouTube channels (Public Data API v3 vs Private OAuth Studio Analytics):"
    )
    yt_flow = (
        "Option A: Track Public Channel (API Key)\n"
        "  1. User enters @handle, channel ID, or custom URL in Track Channel dialog.\n"
        "  2. POST /api/youtube/channels/track calls YouTube Data API v3 channels.list.\n"
        "  3. Channel record inserted into youtube_channels (subscribers, lifetime views, uploadsPlaylistId).\n"
        "  4. playlistItems.list retrieves uploaded videos; videos.list fetches duration and engagement stats.\n"
        "  5. ISO 8601 duration parser converts PT#H#M#S to HH:MM:SS.\n"
        "  6. Videos upserted into youtube_videos.\n\n"
        "Option B: Authenticate Own Channel (Google OAuth 2.0)\n"
        "  1. User clicks 'Connect with Google' -> Redirected to Google OAuth consent screen.\n"
        "  2. User approves youtube.readonly and yt-analytics.readonly scopes.\n"
        "  3. Callback endpoint /api/youtube/auth/callback exchanges auth code for accessToken & refreshToken.\n"
        "  4. Channel details and upload history synchronized.\n"
        "  5. YouTube Analytics API queried for daily studio telemetry (views, watchTimeMinutes, averageViewDuration,\n"
        "     likes, comments, shares, subscribersGained, subscribersLost).\n"
        "  6. Daily time-series saved into youtube_analytics table (with composite channelId+date unique constraint).\n"
        "  7. User redirected back to /dashboard/youtube with connection confirmation."
    )
    add_code_block(doc, yt_flow)

    # ==========================================
    # 4. ER DIAGRAM
    # ==========================================
    add_h1("4. ER DIAGRAM")
    add_p(
        "The relational database schema is structured around 8 relational entities managed via TypeORM against PostgreSQL. "
        "The diagram below illustrates entities, attributes, primary keys, and foreign key relationships:"
    )
    er_ascii = (
        "+-------------------+         +-------------------+         +-------------------+\n"
        "|       User        |         |      Account      |         |   Organization    |\n"
        "+-------------------+         +-------------------+         +-------------------+\n"
        "| id (PK, int)      |         | id (PK, int)      |         | id (PK, varchar)  |\n"
        "| name (varchar)    |         | platform (varchar)|<---\     | name (varchar)    |\n"
        "| companyName (vchr)|         | username (varchar)|    \    | logoUrl (varchar) |\n"
        "| companyRole (vchr)|         | profileUrl (vchr) |     \---| adminId (FK, int) |\n"
        "| role (varchar)    |         | status (varchar)  |         +---------+---------+\n"
        "| phone (varchar)   |         | accessToken (vchr)|                   |\n"
        "| email (UK, vchr)  |         +---------+---------+                   | 1:N\n"
        "| password (varchar)|                   | 1:N                         v\n"
        "+-------------------+                   +------------------------->+-------------------+\n"
        "                                        |                          |       Post        |\n"
        "                                        v 1:N                      +-------------------+\n"
        "                              +-------------------+                | id (PK, varchar)  |\n"
        "                              |     Analytics     |                | content (text)    |\n"
        "                              +-------------------+                | author (varchar)  |\n"
        "                              | id (PK, int)      |                | postDate (varchar)|\n"
        "                              | date (varchar)    |                | postUrl (varchar) |\n"
        "                              | likes (int)       |                | createdAt (vchr)  |\n"
        "                              | comments (int)    |                | impressions (int) |\n"
        "                              | shares (int)      |                | likes (int)       |\n"
        "                              | views (int)       |                | comments (int)    |\n"
        "                              | followers (int)   |                | shares (int)      |\n"
        "                              | recentPosts (int) |                | dataSource (vchr) |\n"
        "                              | dataSource (vchr) |                | accountId (FK)    |\n"
        "                              | accountId (FK)    |                | orgId (FK)        |\n"
        "                              +-------------------+                +-------------------+\n"
        "\n"
        "+---------------------------------------------------------------------------------------+\n"
        "|                                    YOUTUBE SCHEMA                                     |\n"
        "+---------------------------------------------------------------------------------------+\n"
        "|  +-----------------------------+           +---------------------------------------+  |\n"
        "|  |       YouTubeChannel        |           |             YouTubeVideo              |  |\n"
        "|  +-----------------------------+           +---------------------------------------+  |\n"
        "|  | id (PK, int)                | 1:N       | id (PK, int)                          |  |\n"
        "|  | channelId (UK, varchar)     |---------->| videoId (UK, varchar)                 |  |\n"
        "|  | title (varchar)             |           | title (varchar)                       |  |\n"
        "|  | customUrl (varchar)         |           | publishedAt (varchar)                 |  |\n"
        "|  | subscribers (bigint)        |           | duration (varchar)                    |  |\n"
        "|  | totalViews (bigint)         |           | views (bigint), likes, comments       |  |\n"
        "|  | totalVideos (int)           |           | channelId (FK, int)                   |  |\n"
        "|  | uploadsPlaylistId (varchar) |           +---------------------------------------+  |\n"
        "|  | accessToken, refreshToken   |                                                      |\n"
        "|  +--------------+--------------+           +---------------------------------------+  |\n"
        "|                 | 1:N                      |           YouTubeAnalytics            |  |\n"
        "|                 \------------------------->| id (PK, int)                          |  |\n"
        "|                                            | date (varchar)                        |  |\n"
        "|                                            | views (int), watchTimeMinutes (int)   |  |\n"
        "|                                            | averageViewDurationSeconds (int)      |  |\n"
        "|                                            | likes, comments, shares (int)         |  |\n"
        "|                                            | subscribersGained, subscribersLost    |  |\n"
        "|                                            | channelId (FK, int)                   |  |\n"
        "|                                            | *UNIQUE(channelId, date)              |  |\n"
        "|                                            +---------------------------------------+  |\n"
        "+---------------------------------------------------------------------------------------+"
    )
    add_code_block(doc, er_ascii)

    add_h2("4.2 Relationship Descriptions & Cardinalities")
    add_bullet("Each social account record generates multiple historical analytics records over time (1:N, cascade delete).", "Account to Analytics (1:N): ")
    add_bullet("A connected user account can be assigned administrative rights over multiple LinkedIn organization pages (1:N).", "Account to Organization (1:N): ")
    add_bullet("A social account authors multiple individual feed posts (1:N, cascade delete).", "Account to Post (1:N): ")
    add_bullet("An organization publishes multiple company feed updates (1:N, optional).", "Organization to Post (1:N): ")
    add_bullet("A tracked YouTube channel contains multiple published videos (1:N, cascade delete).", "YouTubeChannel to YouTubeVideo (1:N): ")
    add_bullet("A YouTube channel records daily analytics entries with a composite unique constraint on (channelId, date) (1:N, cascade delete).", "YouTubeChannel to YouTubeAnalytics (1:N): ")

    # ==========================================
    # 5. TABLE DESIGN
    # ==========================================
    add_h1("5. TABLE DESIGN")

    # Table 5.1 users
    add_h2("5.1 Table: users")
    add_p("Stores administrative users and system managers who have credentials to log into the application dashboard.")
    t_users = doc.add_table(rows=1, cols=6)
    style_table(t_users, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "INTEGER", "number", "PRIMARY KEY, Auto Inc", "NO", "Unique internal user ID"],
            ["name", "VARCHAR", "string", "-", "NO", "Full name of the user"],
            ["companyName", "VARCHAR", "string", "-", "NO", "Organization or enterprise represented"],
            ["companyRole", "VARCHAR", "string", "-", "YES", "Designation (e.g. Analytics Lead)"],
            ["role", "VARCHAR", "string", "DEFAULT 'user'", "NO", "Role: super_admin or manager"],
            ["phone", "VARCHAR", "string", "-", "NO", "Contact telephone number"],
            ["email", "VARCHAR", "string", "UNIQUE", "NO", "Login email & notification destination"],
            ["password", "VARCHAR", "string", "-", "NO", "Stored credential for authentication"],
        ]
    )

    # Table 5.2 account
    add_h2("5.2 Table: account")
    add_p("Represents external social accounts (specifically LinkedIn profiles and company accounts) linked to the monitoring system.")
    t_account = doc.add_table(rows=1, cols=6)
    style_table(t_account, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "INTEGER", "number", "PRIMARY KEY, Auto Inc", "NO", "Linked account record ID"],
            ["platform", "VARCHAR", "string", "DEFAULT 'LinkedIn'", "NO", "Social platform identifier"],
            ["username", "VARCHAR", "string", "-", "NO", "Target handle, slug, or vanity username"],
            ["profileUrl", "VARCHAR", "string", "-", "NO", "Direct web URL to profile or company"],
            ["status", "VARCHAR", "string", "DEFAULT 'Connected'", "NO", "Operational status: Connected, Error"],
            ["accessToken", "VARCHAR", "string", "-", "YES", "OAuth 2.0 Bearer access token"],
        ]
    )

    # Table 5.3 analytics
    add_h2("5.3 Table: analytics")
    add_p("Maintains daily time-series telemetry snapshots collected for each LinkedIn account.")
    t_analytics = doc.add_table(rows=1, cols=6)
    style_table(t_analytics, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "INTEGER", "number", "PRIMARY KEY, Auto Inc", "NO", "Unique analytics record ID"],
            ["date", "VARCHAR", "string", "Format YYYY-MM-DD", "NO", "Metric date bucket"],
            ["likes", "INTEGER", "number", "DEFAULT 0", "NO", "Aggregate post reactions detected"],
            ["comments", "INTEGER", "number", "DEFAULT 0", "NO", "Aggregate post comments detected"],
            ["shares", "INTEGER", "number", "DEFAULT 0", "NO", "Aggregate reposts detected"],
            ["views", "INTEGER", "number", "DEFAULT 0", "NO", "Aggregate impressions or views"],
            ["followers", "INTEGER", "number", "DEFAULT 0", "NO", "Follower count extracted from page"],
            ["recentPosts", "INTEGER", "number", "DEFAULT 0", "NO", "Number of posts actively analyzed"],
            ["dataSource", "VARCHAR", "string", "DEFAULT 'API'", "NO", "Origin: Scraper or API"],
            ["unavailableMetrics", "VARCHAR", "string", "-", "YES", "Comma-separated blocked metric list"],
            ["lastCollectionTime", "VARCHAR", "string", "ISO 8601 String", "YES", "Timestamp of collection execution"],
            ["accountId", "INTEGER", "number", "FOREIGN KEY (account.id)", "YES", "Parent account reference"],
        ]
    )

    # Table 5.4 organization
    add_h2("5.4 Table: organization")
    add_p("Stores LinkedIn Company / Organization entities administered by an authenticated account.")
    t_org = doc.add_table(rows=1, cols=6)
    style_table(t_org, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "VARCHAR", "string", "PRIMARY KEY", "NO", "Organization URN or numeric ID"],
            ["name", "VARCHAR", "string", "-", "NO", "Name of the organization page"],
            ["logoUrl", "VARCHAR", "string", "-", "YES", "URL to corporate logo graphic"],
            ["description", "VARCHAR", "string", "-", "YES", "Corporate overview text"],
            ["website", "VARCHAR", "string", "-", "YES", "Company official website link"],
            ["adminId", "INTEGER", "number", "FOREIGN KEY (account.id)", "YES", "Admin account owning management rights"],
        ]
    )

    # Table 5.5 post
    add_h2("5.5 Table: post")
    add_p("Stores scraped and synchronized individual social media feed posts.")
    t_post = doc.add_table(rows=1, cols=6)
    style_table(t_post, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "VARCHAR", "string", "PRIMARY KEY", "NO", "Platform Activity ID (urn:li:activity:...)"],
            ["content", "TEXT", "string", "-", "NO", "Text body of the post update"],
            ["author", "VARCHAR", "string", "-", "YES", "Cleaned author name or company page title"],
            ["postDate", "VARCHAR", "string", "-", "YES", "Human-readable relative date (e.g. '3d ago')"],
            ["postUrl", "VARCHAR", "string", "-", "YES", "Permanent link directly to the post update"],
            ["createdAt", "VARCHAR", "string", "ISO 8601 String", "NO", "Exact timestamp decoded via Snowflake ID"],
            ["impressions", "INTEGER", "number", "DEFAULT 0", "NO", "Scraped views or impressions count"],
            ["likes", "INTEGER", "number", "DEFAULT 0", "NO", "Total likes / reactions"],
            ["comments", "INTEGER", "number", "DEFAULT 0", "NO", "Total comments count"],
            ["shares", "INTEGER", "number", "DEFAULT 0", "NO", "Total reposts / shares count"],
            ["dataSource", "VARCHAR", "string", "DEFAULT 'API'", "NO", "Origin: Scraper or API"],
            ["accountId", "INTEGER", "number", "FOREIGN KEY (account.id)", "YES", "Cascading foreign key to account"],
            ["organizationId", "VARCHAR", "string", "FOREIGN KEY (organization.id)", "YES", "Optional foreign key to organization"],
        ]
    )

    # Table 5.6 youtube_channels
    add_h2("5.6 Table: youtube_channels")
    add_p("Stores all tracked and OAuth-authenticated YouTube channels.")
    t_yt_ch = doc.add_table(rows=1, cols=6)
    style_table(t_yt_ch, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "INTEGER", "number", "PRIMARY KEY, Auto Inc", "NO", "Internal channel record ID"],
            ["channelId", "VARCHAR", "string", "UNIQUE", "NO", "YouTube Channel ID (24 chars, starts with UC)"],
            ["title", "VARCHAR", "string", "-", "NO", "Official title of the YouTube channel"],
            ["description", "TEXT", "string", "-", "YES", "Channel bio description"],
            ["customUrl", "VARCHAR", "string", "-", "YES", "Channel handle (e.g. @google)"],
            ["thumbnailUrl", "VARCHAR", "string", "-", "YES", "High-res channel avatar URL"],
            ["publishedAt", "VARCHAR", "string", "ISO 8601 String", "YES", "Channel registration timestamp"],
            ["status", "VARCHAR", "string", "DEFAULT 'Connected'", "NO", "Connection operational status"],
            ["googleAccountEmail", "VARCHAR", "string", "-", "YES", "Authenticated Google email address"],
            ["accessToken", "TEXT", "string", "-", "YES", "OAuth 2.0 Access Token for Studio Analytics"],
            ["refreshToken", "TEXT", "string", "-", "YES", "Refresh Token for offline token rotation"],
            ["subscribers", "BIGINT", "number", "DEFAULT 0", "NO", "Lifetime subscriber count"],
            ["totalViews", "BIGINT", "string", "DEFAULT 0", "NO", "Lifetime public view count"],
            ["totalVideos", "INTEGER", "number", "DEFAULT 0", "NO", "Total public published video count"],
            ["uploadsPlaylistId", "VARCHAR", "string", "-", "YES", "Associated Uploads playlist ID (UU...)"],
            ["lastSyncedAt", "VARCHAR", "string", "-", "YES", "Timestamp of last video/meta sync"],
            ["lastAnalyticsSyncAt", "VARCHAR", "string", "-", "YES", "Timestamp of last daily analytics sync"],
        ]
    )

    # Table 5.7 youtube_videos
    add_h2("5.7 Table: youtube_videos")
    add_p("Contains video metadata and engagement counters belonging to tracked YouTube channels.")
    t_yt_vids = doc.add_table(rows=1, cols=6)
    style_table(t_yt_vids, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "INTEGER", "number", "PRIMARY KEY, Auto Inc", "NO", "Internal video record ID"],
            ["videoId", "VARCHAR", "string", "UNIQUE (11 chars)", "NO", "YouTube standard Video ID"],
            ["title", "VARCHAR", "string", "-", "NO", "Video title"],
            ["description", "TEXT", "string", "-", "YES", "Video description text"],
            ["thumbnailUrl", "VARCHAR", "string", "-", "YES", "High-resolution thumbnail image URL"],
            ["publishedAt", "VARCHAR", "string", "ISO 8601 String", "NO", "Upload publication timestamp"],
            ["duration", "VARCHAR", "string", "DEFAULT '00:00'", "NO", "Parsed duration (HH:MM:SS or MM:SS)"],
            ["views", "BIGINT", "number", "DEFAULT 0", "NO", "Current view counter"],
            ["likes", "INTEGER", "number", "DEFAULT 0", "NO", "Current likes counter"],
            ["comments", "INTEGER", "number", "DEFAULT 0", "NO", "Current comment counter"],
            ["channelId", "INTEGER", "number", "FOREIGN KEY (channel.id)", "YES", "Cascading foreign key to channel"],
        ]
    )

    # Table 5.8 youtube_analytics
    add_h2("5.8 Table: youtube_analytics")
    add_p("Stores daily performance time-series records fetched from the YouTube Analytics API.")
    t_yt_an = doc.add_table(rows=1, cols=6)
    style_table(t_yt_an, [1.0, 1.0, 0.9, 1.2, 0.6, 1.8],
        ["Column Name", "PostgreSQL Type", "TypeORM", "Constraints", "Null", "Description"],
        [
            ["id", "INTEGER", "number", "PRIMARY KEY, Auto Inc", "NO", "Unique analytics ID"],
            ["date", "VARCHAR", "string", "Format YYYY-MM-DD", "NO", "Daily report date"],
            ["views", "INTEGER", "number", "DEFAULT 0", "NO", "Views accumulated on that day"],
            ["watchTimeMinutes", "INTEGER", "number", "DEFAULT 0", "NO", "Estimated watch time in minutes"],
            ["averageViewDurationSeconds", "INTEGER", "number", "DEFAULT 0", "NO", "Average view duration in seconds"],
            ["likes", "INTEGER", "number", "DEFAULT 0", "NO", "Likes received on that day"],
            ["comments", "INTEGER", "number", "DEFAULT 0", "NO", "Comments posted on that day"],
            ["shares", "INTEGER", "number", "DEFAULT 0", "NO", "Shares registered on that day"],
            ["subscribersGained", "INTEGER", "number", "DEFAULT 0", "NO", "New subscribers joined"],
            ["subscribersLost", "INTEGER", "number", "DEFAULT 0", "NO", "Subscribers unsubscribed (churn)"],
            ["channelId", "INTEGER", "number", "FOREIGN KEY (channel.id)", "NO", "Relational channel key (*UNIQUE with date)"],
        ]
    )

    # ==========================================
    # 6. MODULE DESIGN (A TO Z DEEP DIVE)
    # ==========================================
    add_h1("6. MODULE DESIGN (A TO Z ARCHITECTURE DEEP DIVE)")
    add_p(
        "This section details every backend service, controller, utility, algorithm, and frontend interface component across the entire codebase."
    )

    # Module A
    add_h2("Module A: Authentication, RBAC & User Administration")
    add_p("Files: user.entity.ts, app.controller.ts, app.service.ts, frontend/src/app/page.tsx, frontend/src/app/dashboard/users/page.tsx, frontend/src/app/dashboard/users/add/page.tsx")
    add_p("1. Functionality & Business Logic:")
    add_p(
        "The system implements Role-Based Access Control (RBAC) supporting two distinct roles:\n"
        "• super_admin: Holds global privileges including adding and deleting system managers, disconnecting accounts, reconfiguring API credentials, and running diagnostics.\n"
        "• manager: Holds standard dashboard monitoring privileges, allowing analytics inspection, report generation, and channel tracking without access to administrative user management."
    )
    add_p("2. Key Methods & Implementations:")
    add_bullet(
        "Supports a built-in bootstrap Super Admin credential path (admin / admin123) for fresh zero-state deployments. "
        "For database-stored users, queries PostgreSQL using case-insensitive matchers (ILike(username) on email and name), returning JWT tokens and user context.",
        "AppService.login(body): "
    )
    add_bullet(
        "Validates uniqueness of user emails. Generates a secure randomized 8-character temporary password (Math.random().toString(36).slice(-8)). "
        "Persists the user and triggers asynchronous welcome email dispatch with credentials via the SMTP subsystem.",
        "AppService.createManager(data): "
    )
    add_bullet(
        "Validates the current password and securely updates the stored credential for either the super admin or a manager account.",
        "AppService.changePassword(body): "
    )

    # Module B
    add_h2("Module B: Resilient SMTP Dispatch & Email Engine")
    add_p("Files: app.service.ts (sendAccountEmail, verifySmtp), app.controller.ts")
    add_p("1. Functionality & Business Logic:")
    add_p(
        "When a Super Admin invites a new brand manager to the platform, the system sends a branded HTML email containing their workspace login URL, "
        "assigned role, username, and temporary password."
    )
    add_p("2. Multi-Transport Resilience:")
    add_p(
        "Standard cloud environments (such as Render, Heroku, or AWS EC2) frequently block or throttle outbound SMTP traffic on default ports. To ensure reliable email delivery:\n"
        "• AppService.sendAccountEmail: Configures an array of candidate transports:\n"
        "  1. Custom SMTP host configuration (if EMAIL_HOST is supplied) with STARTTLS.\n"
        "  2. Direct Google SMTP via SSL Port 465 (smtp.gmail.com:465).\n"
        "  3. Direct Google SMTP via STARTTLS Port 587 (smtp.gmail.com:587).\n"
        "  4. Nodemailer built-in service: 'gmail' transport.\n"
        "  The service sequentially iterates through the transports; if attempt N encounters a network timeout or reset, attempt N+1 executes immediately.\n"
        "• AppService.verifySmtp(): Diagnostic endpoint (GET /email/verify) that executes transporter.verify() against configured credentials, returning structured JSON indicating whether SMTP configuration is healthy or reporting exact error codes (EAUTH, ETIMEDOUT)."
    )

    # Module C
    add_h2("Module C: LinkedIn Account & REST Management")
    add_p("Files: account.entity.ts, organization.entity.ts, linkedin.controller.ts, linkedin.service.ts")
    add_p("1. Functionality & Business Logic:")
    add_p(
        "Handles connected LinkedIn profiles, organization associations, and official LinkedIn OAuth 2.0 REST API calls."
    )
    add_p("2. Endpoints & Integrations:")
    add_bullet("Initiates the OAuth 2.0 authorization code flow with requested scopes (openid profile email).", "GET /auth/linkedin: ")
    add_bullet("Exchanges the authorization code for a Bearer token via https://www.linkedin.com/oauth/v2/accessToken, queries userinfo, and creates or updates the associated Account.", "GET /auth/linkedin/callback: ")
    add_bullet("Dispatches requests to LinkedIn Rest API (/rest/organizationAcls) with header LinkedIn-Version: 202401 to retrieve organization URNs where the authenticated user holds administrative rights.", "GET /api/linkedin/organizations: ")
    add_bullet("Retrieves organizational metadata and profile URLs.", "GET /api/linkedin/company/:orgId: ")
    add_bullet("Interfaces with /rest/organizationalEntityFollowerStatistics for accounts with approved Community Management API access.", "GET /api/linkedin/company/:orgId/followers: ")

    # Module D
    add_h2("Module D: LinkedIn Headless Scraping & Telemetry Engine")
    add_p("Files: collector.controller.ts, collector.service.ts, install-browsers.js, post.entity.ts, analytics.entity.ts")
    add_p("1. Functionality & Business Logic:")
    add_p(
        "The core scraping engine of the application. When a brand connects a LinkedIn handle or triggers a data refresh, this module spins up a headless Chromium browser instance "
        "to extract live followers, impressions, and individual post telemetry without requiring expensive LinkedIn enterprise API licenses."
    )
    add_p("2. Detailed Technical Capabilities:")
    add_bullet(
        "On cloud hosts like Render, Chromium binaries are stored in varied local directories. findChromiumExecutable() checks custom paths "
        "(node_modules/playwright-core/.local-browsers, /opt/render/.cache/ms-playwright, ~/.cache/ms-playwright, /usr/bin/chromium). "
        "If missing, ensureChromiumExecutable() triggers npx playwright install chromium with PLAYWRIGHT_BROWSERS_PATH=0. "
        "cleanStaleLocks() removes orphaned lock files (SingletonLock, etc.) to prevent browser launch deadlocks.",
        "A. Dynamic Browser Discovery & Self-Healing: "
    )
    add_bullet(
        "Chromium is launched with stealth flags: --disable-blink-features=AutomationControlled, --no-sandbox, --disable-dev-shm-usage, and realistic User-Agent strings. "
        "An init script deletes navigator.webdriver:\n"
        "  await context.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });\n"
        "In production/cloud environments, the session cookie (LINKEDIN_LI_AT_COOKIE) is injected directly into the .linkedin.com domain context.",
        "B. Anti-Bot Stealth Architecture: "
    )
    add_bullet(
        "Because LinkedIn updates its DOM classes regularly, the follower parser utilizes multi-level regex parsing combined with strict semantic exclusions. "
        "It handles formats like '12.5k followers', '1,240 followers', '500+ connections' across Top Card selectors (.pv-top-card, .org-top-card-summary__follower-count) "
        "while filtering out parent elements containing 'trending news', 'people also follow', or 'connections follow this page'.",
        "C. Resilient Follower Metric Extraction: "
    )
    add_bullet(
        "LinkedIn post URLs contain an internal Snowflake ID. Instead of relying on ambiguous relative dates from the DOM (such as '2w ago'), "
        "the service extracts the 64-bit integer from the activity URN:\n"
        "  const activityId = BigInt(match[1]);\n"
        "  const timestampMs = Number(activityId >> BigInt(22));\n"
        "  const dateObj = new Date(timestampMs);\n"
        "This calculation extracts the exact millisecond-precision creation timestamp directly from the first 42 bits of the ID.",
        "D. Snowflake ID Timestamp Extraction: "
    )
    add_bullet(
        "The scraper navigates to the target's /recent-activity/all/ or /posts/ URL, executing up to 20 scroll cycles. "
        "It automatically detects and clicks 'Show more results' buttons, scrolls window.scrollTo(0, document.body.scrollHeight), "
        "pauses for AJAX network hydration, parses post cards, and upserts post interaction counters into PostgreSQL.",
        "E. Deep Feed Traversal Engine: "
    )
    add_bullet(
        "getPosts() provides high-performance filtering, full-text searching (ILIKE on post content or author), dynamic sorting (impressions, likes, comments, shares, createdAt), and pagination (page, limit).",
        "F. Paginated Post Query Engine: "
    )

    # Module E
    add_h2("Module E: YouTube Data Ingestion & Analytics Engine")
    add_p("Files: youtube-channel.entity.ts, youtube-video.entity.ts, youtube-analytics.entity.ts, youtube.controller.ts, youtube.service.ts")
    add_p("1. Functionality & Business Logic:")
    add_p(
        "Provides end-to-end telemetry for YouTube, supporting both public channel intelligence and private channel studio analytics."
    )
    add_p("2. Detailed Technical Capabilities:")
    add_bullet(
        "Public Ingestion via YouTube Data API v3 allows users to track any public creator or competitor by handle (@handle), channel ID (UC...), or vanity URL. "
        "Private Ingestion via Google OAuth 2.0 authenticates channel owners via Google Sign-In with scopes youtube.readonly and yt-analytics.readonly, "
        "acquiring access and refresh tokens for offline studio telemetry.",
        "A. Dual Ingestion Pipelines: "
    )
    add_bullet(
        "syncVideosWithApiKey fetches all channel uploads via the uploads playlist in batches of 50. "
        "Implements custom ISO 8601 duration parsing (parseDuration) to convert durations (e.g. PT1H23M45S -> 01:23:45, PT4M15S -> 04:15) and records views, likes, and comments.",
        "B. Uploads Playlist Video Synchronization: "
    )
    add_bullet(
        "syncAnalyticsWithOAuth queries the Google Analytics reporting endpoint for daily reports (views, estimatedMinutesWatched, averageViewDuration, likes, comments, shares, subscribersGained, subscribersLost), "
        "saving time-series records into youtube_analytics with unique constraints on (channelId, date).",
        "C. YouTube Analytics API Daily Synchronization: "
    )
    add_bullet(
        "compareChannels benchmarks up to 3 channels side-by-side, aggregating lifetime stats (subscribers, views, video library size) "
        "and period metrics across custom windows (7d, 30d, 90d, 1y).",
        "D. Multi-Channel Comparison Engine: "
    )
    add_bullet(
        "repairOrphanedVideos runs on server startup (onModuleInit) to automatically re-link any video records missing channel associations in the database.",
        "E. Orphan Video Auto-Repair: "
    )

    # Module F
    add_h2("Module F: Client-Side Telemetry Caching Engine")
    add_p("Files: frontend/src/lib/data-cache.ts, frontend/src/lib/api-config.ts")
    add_p("1. Functionality & Business Logic:")
    add_p(
        "To eliminate layout shifts and loading spinners when navigating between dashboard tabs, the frontend implements an in-memory caching and state synchronization system."
    )
    add_p("2. Architecture & Methods:")
    add_bullet(
        "Global Map<string, CacheEntry> providing instantaneous 0ms synchronous access within the current browser session.",
        "In-Memory RAM Store (memoryCache): "
    )
    add_bullet(
        "Automatically promotes entries from sessionStorage into RAM when available.",
        "Storage Promotion & Fallback: "
    )
    add_bullet(
        "In Next.js App Router, reading browser storage during the initial render causes React hydration mismatches (Error 418/423). "
        "getSSRSafeCache returns null on server-side render and initial hydration pass, then returns cached data on all subsequent client-side tab clicks once markHydrated() runs.",
        "SSR-Safe Hydration Guard (getSSRSafeCache): "
    )
    add_bullet(
        "Allows components to subscribe to cache keys (subscribeToCache, setInCache, invalidateCache), triggering real-time re-renders whenever fresh telemetry is written to the store.",
        "Event-Driven Pub/Sub Invalidation: "
    )

    # Module G
    add_h2("Module G: Frontend Dashboard Interfaces & User Experience")
    add_p("Files: layout.tsx, dashboard/page.tsx, dashboard/[id]/page.tsx, dashboard/youtube/page.tsx, youtube-comparison-dashboard.tsx, dashboard/reports/page.tsx, dashboard/company/page.tsx, dashboard/profile/page.tsx, dashboard/settings/page.tsx")
    add_p("1. Page-by-Page Feature Matrix:")
    t_ui = doc.add_table(rows=1, cols=2)
    style_table(t_ui, [2.0, 4.5],
        ["Dashboard Route", "Primary Capabilities & UI Architecture"],
        [
            ["/dashboard", "LinkedIn Overview: Shows connected accounts, aggregate follower counts, impressions, and likes. Includes modal to connect new handles and one-click data collection triggers."],
            ["/dashboard/[id]", "Detailed Account Analytics: Time-series charts for impressions and engagement, post history table with search, sorting, and direct links to LinkedIn updates."],
            ["/dashboard/youtube", "YouTube Studio Hub: Overview cards (subscribers, views, videos, watch time), date range filters (7d, 30d, 90d, 1y), top video tables, and OAuth/API key setup."],
            ["/dashboard/youtube/compare", "Multi-Channel Comparison: Side-by-side benchmarking of up to 3 channels with comparative Area/Bar charts and subscriber growth rates."],
            ["/dashboard/reports", "Export & Intelligence Center: Generates CSV datasets and structured executive reports for offline analysis."],
            ["/dashboard/users", "Manager Administration (Admin Only): Displays team members, assigned brands, access privileges, and link to create new managers."],
            ["/dashboard/users/add", "User Provisioning: Form to create managers, automatically generates temporary passwords and sends welcome emails via SMTP."],
            ["/dashboard/settings", "System & Account Settings: Password updates, preference toggles (auto-sync, telemetry notifications), and theme switching."],
            ["/dashboard/company", "Company Page Hub: Dedicated tracking for LinkedIn company pages managed by the authenticated account."],
            ["/dashboard/profile", "Workspace Profile: Central hub showing connected channels across all platforms, account health badges, and navigation shortcuts."],
        ]
    )

    # ==========================================
    # 7. CONCLUSION
    # ==========================================
    add_h1("7. CONCLUSION")
    add_h2("7.1 Summary of Technical Achievements")
    add_p(
        "The Social Media Monitoring & Scraping Tool (SocialPulse PRO) provides a robust, production-ready solution to modern social media analytics and data access constraints:\n"
        "1. Solves Platform API Paywalls: By coupling a headless Playwright browser automation pipeline with Snowflake ID decoding, the system extracts granular post-level impressions and follower metrics that normally require enterprise-tier LinkedIn licenses.\n"
        "2. Comprehensive YouTube Telemetry: Combines public channel tracking via the YouTube Data API v3 with authorized studio metrics (watch time, view duration, subscriber churn) via the YouTube Analytics API.\n"
        "3. Sub-Second Dashboard UX: Leverages an SSR-safe dual-tier cache in Next.js, eliminating loading spinners during client-side tab switching.\n"
        "4. Production Resilience: Includes automated browser binary detection, lockfile cleanup, and cascading SMTP email fallbacks, ensuring stability across local and cloud environments (e.g., Render).\n"
        "5. Enterprise Management: Built-in Role-Based Access Control isolates administrative management from everyday brand monitoring."
    )

    add_h2("7.2 System Extensibility")
    add_p(
        "The modular architecture makes it straightforward to add new platforms in future iterations:\n"
        "• Additional Networks: The entity and controller structure can be extended to support Instagram Graph API, TikTok for Developers, or X (Twitter) API v2.\n"
        "• AI-Powered Sentiment Analysis: The stored post content in the post table can be analyzed using LLM pipelines to provide sentiment categorization and topic clustering.\n"
        "• Scheduled Automation: The existing sync methods can be integrated with NestJS @nestjs/schedule cron tasks to automate periodic data collection."
    )

    # Save to file
    out_path = r"d:\SocialMediaMSScrapingTechnique\SocialMediaMonitoringTool_Full_Documentation.docx"
    doc.save(out_path)
    print(f"Document successfully created at: {out_path}")

if __name__ == "__main__":
    build_documentation()
