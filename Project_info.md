### 1. Project Overview

- **Purpose of the system**
  - Centralized **Admin + Automation platform** for:
    - Managing **dynamic data tables** (Section Editor / CMS)
    - Running **AI-powered workflows** (chat, tagging, summarization)
    - **Scraping YouTube playlists** and pushing episodes to multiple platforms
    - Controlling access for both **human admins** and **external AI/MCP clients**
  - The goal is to turn YouTube content + admin configuration into **fully-automated pipelines** for streaming/watchlist platforms, while also exposing data safely to AI tools.

- **Why a Laravel → React migration was required**
  - Original UI (and an earlier project under `D:\New folder (3)\my-project`) relied on older patterns:
    - PHP/Blade-based admin pages
    - A YouTube scraper plugin with tightly coupled UI + logic
    - Ad‑hoc logic for tags/genres and streaming pushes
  - Migration to **Laravel 12 + React + Vite** was needed to:
    - Get a **single-page admin experience** (faster, richer UX)
    - Standardize all AI and scraper features behind **clean APIs**
    - Make the UI reusable/extensible (React components, context, layouts)
    - Modernize asset building, theming, and deployment.

- **High‑level architecture**

  ```text
  [Browser / Admin SPA (React + Vite)]
        |
        |  JSON over HTTPS (Sanctum-authenticated)
        v
  [Laravel HTTP API (routes/web.php, routes/api.php)]
        |
        |-- Section Builder / Dynamic Entities
        |-- AI Scrapers / Duties / Rules / Skills
        |-- AI Chat & Endpoints
        |-- MCP API (API-key auth)
        v
  [Domain Services + Models]
        |
        |-- DynamicEntityService / SectionEntity / SectionField
        |-- YouTubeScraperService / AiScraperController
        |-- DutyExecutionService / AiDuty / AiRule / AiSkill
        |-- AIManager (OpenAI, Gemini, Mistral)
        |-- StreamingPlatformController
        v
  [External Systems]
        |-- YouTube
        |-- Streaming/Watchlist APIs
        |-- OpenAI / Gemini / Mistral AI APIs
  ```

---

### 2. Technology Stack

- **Backend (Laravel)**
  - **Laravel 12.49.0** (PHP 8.3)
  - Sanctum for SPA authentication
  - Custom middleware:
    - `McpOrSanctumAuth` for **either API key or user session** auth
    - `CheckMcpPermissions` for **per‑table MCP access control**
  - Dynamic schema via:
    - `SectionEntity`, `SectionField`, `DynamicEntityService`, `DynamicEntityController`
  - AI & automation:
    - `AIManager` – centralized abstraction over multiple AI providers
    - `YouTubeScraperService`, `AiScraperController`
    - `DutyExecutionService`, `AiDuty`, `AiRule`, `AiSkill`
    - `StreamingPlatformController` & related services
  - Scheduling / jobs:
    - Duties are **scheduled tasks** (via cron / Laravel scheduler) executed by `DutyExecutionService`.

- **Frontend (React + Vite)**
  - React SPA under `resources/js/Admin`:
    - Layouts, navigation, Customizer, Section Editor, AI Scrapers, Duties, Endpoints, Rules, Skills.
  - Vite for:
    - Dev server in local (`npm run dev`)
    - Production build (`npm run build` → `public/build`)
  - React Router for SPA routes (`resources/js/Admin/routes/index.jsx`).
  - React Context for layout & theme:
    - `useLayoutContext.jsx` + `admin.blade.php` inline script.
  - Icons with Tabler via an `Icon` component (e.g. `"video"`, `"sparkles"`).

- **AI Providers**
  - **OpenAI** – general-purpose chat and completion via `AIManager`.
  - **Gemini** – supported as another provider through endpoints.
  - **Mistral**
    - Explicitly used for **YouTube tags/genres generation** (`mistral-small`).
    - No hardcoded “default” in config; **Mistral is used only when its key is set**, otherwise the system falls back to `AIManager`’s default provider.

- **Scrapers & Automation**
  - YouTube scraping:
    - `YouTubeScraperService`:
      - Fetch playlist metadata + videos (via page scrape and/or API).
      - Normalize & store videos in `YoutubePlaylist` + `YoutubeVideo`.
    - `AiScraperController`:
      - Sync calls
      - AI metadata generation endpoints
      - Push to platforms.
  - Automation:
    - Duties (`AiDuty`) created for playlist sync & push.
    - Jobs run via scheduler to keep platforms in sync with YouTube.

---

### 3. Problems Identified

- **After migration / refactors:**
  - **Section Editor**
    - Relationship UI was initially built as a separate **“Relations tab”** not matching the old pattern.
    - Field visibility (list/detail/API) wasn’t aligned with how the user actually wanted to control columns.
    - 500 errors when dynamic entity table didn’t exist (e.g. `ai-agent-permissions`).
  - **Admin Customizer**
    - Theme/layout options weren’t applied on first paint → “Customizer settings don’t take effect”.
    - Some data‑ attributes were applied late or inconsistently.

- **MCP & API issues**
  - MCP routes were behind strict middleware that even blocked **logged‑in admins**.
  - No clean separation between **human-auth** and **API-key auth** for MCP.
  - Poor error messages when dynamic tables were missing.

- **Build & deployment**
  - Vite build:
    - Sass deprecation warnings (imports, functions).
    - `auth.jpg` asset path broken.
  - On hosting:
    - `.env` DB misconfiguration (access denied / 1045 errors).
    - Classic MySQL index length problem (`Specified key was too long; max key length is 1000 bytes`).
    - Dev Vite URLs (`http://[::1]:5173/@vite/client`) accidentally used in production (CORS + ERR_CONNECTION_REFUSED).

- **AI / Chat & UI**
  - AI chat sometimes answered from the wrong context (“GLOBAL DUTIES / YouTube MrBeast playlists” when user just asked “are you working”).
  - Sidebar icons for **YouTube Scrapers** and **Dynamic Skills** were missing due to icon name issues.

- **YouTube scraper + streaming**
  - New Laravel/React scraper implementation did not fully follow the older plugin’s behavior (`youtube_scraper.php`):
    - Tags/genres generation inconsistent.
    - **Streaming push** failing due to album/track API response shape and payload mismatch.
  - Album/track creation logic was too rigid about response structure (`id` vs `album.id` / `artist.id`).

- **Automation / Duties / Skills**
  - Earlier conception of “per‑agent duties” was too rigid and not aligned with how the real workflows behave:
    - Duties should be **per playlist / per playlist+platform**, not per chat agent.
  - List APIs for duties/endpoints/rules/skills were returning too much data (e.g. full instructions, keys).

---

### 4. Key Design Decisions

- **Global AI Config instead of per-agent config**
  - All AI providers and endpoints are managed centrally (`/api/ai/endpoints`):
    - `id, name, provider, default_model, is_active` in the list.
    - Secret fields (API key, base URL, metadata) only in **detail** API.
  - Rationale:
    - Avoid duplicating API keys per agent or screen.
    - Enable consistent **rate limits**, logging, and routing behavior.
    - Make it easy to add new providers once and reuse them everywhere.

- **No “agent creation” for every use‑case**
  - Instead of modeling everything as a separate “AI Agent” entity, the system:
    - Uses **global duties, rules, skills** that are **bound to data & endpoints**, not to UI concepts.
    - Keeps chat/UI relatively thin and delegates behavior to global configuration.
  - Rationale:
    - Old design with per‑agent duties/rules caused combinatorial explosion and confusion.
    - Most automation is about **playlists and platforms**, not unique “agents”.

- **Duties are generic & data-driven**
  - Duties represent **generic workflows** (playlist sync, push to platform) parameterized by `execution_data` (playlist_id, platform_id, credentials).
  - Rationale:
    - One duty type can handle many playlists/platforms via structured data.
    - Easier to schedule, monitor, and reuse.

- **Auto model detection & fallback**
  - Endpoints can expose **available models** (e.g. via metadata).
  - Frontend:
    - Fetches models dynamically.
    - Lets user pick a model for chat/duty.
  - Runtime:
    - If a chosen model fails (quota, unsupported), the system can:
      - Fallback to a **safe default** for that provider.
      - Or use **Mistral** specifically for tasks (like tags/genres) when its key is present.
  - Rationale:
    - Avoid hard‑coding brittle model names.
    - Survive provider changes and rate limit spikes.

---

### 5. Section Editor System

- **Core concept**
  - **SectionEntity**: logical “section” (table) with metadata (name, slug, `table_name`, default sort, etc.).
  - **SectionField**: columns belonging to an entity (field name, type, validation, visibility, relationships).
  - **DynamicEntityService**: generic CRUD over any `SectionEntity`/`table_name` combination.

- **Slug generation**
  - Entities have user-friendly names and machine slugs:
    - Slugs derived from name (e.g. `AI Agents` → `ai-agents`).
    - Slugs are used in API routes: `/api/entities/{slug}`.
  - Slugs and `table_name` are kept stable so both the **dynamic API** and the **MCP layer** can target them.

- **Field visibility rules**
  - Each `SectionField` carries flags like:
    - **List visibility** – show in Section List/grid pages.
    - **Detail visibility** – show on record detail/edit pages.
    - **API request visibility** – included in inbound API payloads.
    - **API response visibility** – included in outbound API responses.
  - On the frontend:
    - `EntityDataList.jsx` filters fields by visibility to render only allowed columns.
    - Detail forms respect visibility and type (including relationships).

- **API body & response visibility**
  - Backend respects `is_list_visible`, `is_detail_visible`, and related API flags when:
    - Building validation rules.
    - Serializing responses (e.g. for MCP/dynamic entity APIs).
  - Thus, Section Editor fully controls:
    - Which fields an **admin sees**,
    - Which fields **external clients** can read/write.

- **Table vs Section logic**
  - **SectionEntity** is the design-time definition.
  - Underlying **database table** (e.g. `ai_agent_permissions`) must exist:
    - `DynamicEntityService` checks with `Schema::hasTable(...)`.
    - If missing, it throws a `RuntimeException` turned into a **422** with a clear message:
      - “Table [x] does not exist. Create it via Section Builder or run migrations.”
    - `EntityDataList.jsx` displays this error instead of a raw 500.

- **Relationships (field-based, not tab‑based)**
  - Early attempt: separate “Relations” tab → rejected.
  - Final design:
    - Each `SectionField` can be of type `relationship`.
    - Relationship-specific metadata:
      - `related_entity_id` – which SectionEntity it points to.
      - `relation_type` – e.g. `belongsTo`.
      - `relation_display_column` – which column to show in dropdowns (e.g. `name`).
    - UI:
      - `SectionEdit.jsx` loads all entities and passes them to `SectionFields.jsx`.
      - `SectionFields.jsx` shows a **“Related table (entity)”** dropdown + **“Display column”** input when type is `relationship`.
    - `EntityDataList.jsx`:
      - Loads option lists for related entities.
      - Renders relationship cells using `relation_display_column`.

---

### 6. MCP Permissions System

- **Purpose**
  - Offer **AI tools / external clients** safe access to dynamic entities via MCP-style APIs, **separate from the admin SPA**.
  - Support both:
    - **Human admins** logged in via Sanctum.
    - **External tools** authenticated via a shared **MCP API key**.

- **Authentication**
  - **`McpOrSanctumAuth` middleware**:
    - If `Authorization: Bearer {MCP_API_KEY}` matches `config('mcp.api_key')` → request allowed.
    - Else, if a Sanctum-authenticated user exists → allowed.
    - Otherwise → `401` with a clear message:
      - “Unauthenticated. Use Sanctum login or provide a valid MCP API key…”
  - MCP routes:
    - Prefixed under `/api/mcp/*`.
    - Use `mcp.auth` middleware.

- **Table-level permissions**
  - `CheckMcpPermissions`:
    - Ensures only **MCP-enabled entities** can be accessed via MCP.
    - Enforces per-entity **capabilities**:
      - `can_read`, `can_create`, `can_update`, `can_delete`, etc.
  - Important fix:
    - MCP permission checks now **bypass** for authenticated admin users:
      - Admin UI can always access its entities.
      - MCP rules remain strict for external API-key clients.

- **API access mapping**
  - Endpoints (example shape):
    - `GET /api/mcp/entities` – list MCP-enabled entities.
    - `GET /api/mcp/entities/{entity}` – schema and allowed operations.
    - `POST /api/mcp/entities/{entity}/query` – filtered reads.
    - `POST /api/mcp/entities/{entity}` – create.
    - `PATCH /api/mcp/entities/{entity}/{id}` – update.
    - `DELETE /api/mcp/entities/{entity}/{id}` – delete.
  - Each maps to a **combination of table-level permissions** checked by middleware and/or controller.

- **Management**
  - Admin can:
    - Turn MCP access on/off per section/entity.
    - Configure CRUD permissions.
  - External AI clients only need:
    - Base URL (e.g. `https://.../api/mcp`),
    - MCP API key (from `.env` / `config/mcp.php`),
    - The list/schema endpoints to introspect available entities.

---

### 7. AI Endpoints & Models

- **Endpoint management**
  - Endpoints represent a **provider + base URL + auth + model configuration**:
    - Provider: `openai`, `gemini`, `mistral`, custom.
    - Fields (list view): `id, name, provider, default_model, is_active`.
    - Secret details (detail view only): `api_key`, `base_url`, `metadata.available_models`, etc.
  - Endpoints are used by:
    - `AIManager` for generic chat/completion.
    - Duties / Skills / Rules for automation and tools.

- **Fetching models dynamically**
  - For each endpoint, metadata can hold:
    - `available_models` as a list returned by the provider API.
  - Frontend:
    - Calls something like `/api/ai/endpoints/{id}` to get full config.
    - Renders model dropdowns using `available_models`.
    - Does NOT hard-code provider model names.

- **Default vs optional model selection**
  - `default_model` is a **hint**:
    - Used when a workflow doesn’t specify a model.
  - Users can override via UI:
    - Chat model dropdown.
    - Endpoint config screen.
  - AIManager uses:
    - Chosen model (if specified).
    - Else `default_model`.
    - Else a provider fallback.

- **Auto fallback when limits exceed**
  - When a given model fails (quota, unsupported request):
    - AIManager can fall back to another model for the same provider (from `available_models`).
    - For **YouTube tags/genres**, there is a **hard preference** for Mistral:
      - If `MISTRAL_API_KEY` (or `services.mistral.key`) is set → use `mistral-small`.
      - Else → fall back to generic provider via `AIManager`.

---

### 8. Chat System

- **Chat UI behavior**
  - React-based chat interface:
    - Sidebar: quick navigation (Scrapers, Skills, Duties, etc.).
    - Topbar: model selector, status, theming.
    - Main area: conversation, streaming responses.
  - Chat uses global AI endpoints:
    - Picks configured endpoint + model.
    - Sends user content + system rules (duties, rules, skills).

- **Sidebar & navbar visibility**
  - Visibility controlled by layout context:
    - `useLayoutContext` for sizes, orientation, theme.
    - Admin Customizer to show/hide parts of UI.
  - Fix:
    - Layout attributes now applied:
      - On first paint via inline JS in `admin.blade.php`.
      - Synchronously via `useLayoutEffect` whenever settings change.

- **Model selection logic**
  - Chat UI shows:
    - Current endpoint (e.g. OpenAI, Mistral).
    - Current model.
  - Users can:
    - Switch models on the fly.
    - Use defaults configured in endpoints.

- **Error handling when models fail**
  - On server/API failure:
    - The UI shows an error (e.g. toast, message in thread).
  - Example case noticed:
    - Chat responded with **irrelevant duty text** (GLOBAL DUTIES / playlists) when user asked “are you working”.
    - This was diagnosed as a **context mismatch** (wrong conversation/agent) rather than a Laravel bug.
    - Guidance:
      - Tighten chat system prompt/rules if in‑app chat is misusing “duties” context.
      - Ensure you are talking to the correct agent in tools like Cursor.

---

### 9. Agent Duties, Rules & Skills

- **Global duties design**
  - Duties are **global automation units**:
    - Each duty has: name, description, schedule, priority, status, metadata, `execution_data`.
    - `execution_data` is a JSON blob (e.g. playlist_id, platform_id, base URL, endpoint IDs).
  - API list view intentionally returns **summary only**:
    - `id, name, description, schedule_type, schedule_value, is_active, priority, status, last_executed_at, next_execution_at, execution_count, success_count, failure_count, error_message`.
    - Heavy fields (`instructions, execution_data, last_result, metadata`) only in **detail** endpoints to keep lists fast.
  - Edit flow:
    - On “Edit duty”, frontend fetches full duty via `GET /api/ai/duties/{id}`.

- **Why not per-agent or per-API duties**
  - Early idea: each “Agent” (chat persona) would have its own duties.
  - Problems:
    - Same playlist/platform would be configured multiple times across agents.
    - Hard to keep schedule and retry behavior consistent.
  - New design:
    - Duties are **platform- and playlist-centric**, not chat-centric.
    - Agents (if any UI concept exists) just **use** duties, rules, skills; they do not **own** them.

- **Corrected logic vs old broken logic**
  - Old/broken patterns:
    - Duties sometimes created multiple times for the same playlist.
    - Execution logic not clearly tied to playlist or platform IDs.
  - Corrected patterns:
    - **One sync duty per playlist**:
      - Sync playlist.
      - Detect new videos.
      - Generate tags/genres for new ones.
    - **One push duty per (playlist + platform) combination**:
      - Created via `ensurePushDutyExists`.
      - Only pushes **missing episodes** to that platform.
    - Duties have clear `metadata.type` (e.g. `playlist_sync`, `platform_push`) and `execution_data` (IDs & URLs).

- **Rules & Skills**
  - Rules:
    - Govern **global AI behavior**, prompts, and conditions (e.g. when to use a tool).
    - List view: summary only (`id, name, description, type, is_active, priority`).
    - Detail view: includes `rule_content`, `conditions`.
  - Skills:
    - Describe **capabilities / tools** exposed to AI (e.g. “YouTube playlist sync”, “Push to platform”).
    - List view: summary only (`id, name, description, is_active, priority`).
    - Detail view: full `instructions`, `allowed_tools`, `trigger_keywords`.

---

### 10. YouTube Scraper Integration

- **Playlist-based scraping**
  - User supplies:
    - Playlist URL / ID.
    - Target platform(s).
  - `YouTubeScraperService`:
    - Fetches playlist information.
    - Parses individual videos (id, title, thumbnail URL, duration, channel name, etc.).
    - Normalizes into `YoutubePlaylist` and `YoutubeVideo` records.

- **Data processing pipeline**
  - For each video:
    - Basic fields: `video_id`, `title`, `description` (when available), `thumbnail_url`, `channel_name`, `duration`, `video_url`.
    - AI metadata step:
      - Generate SEO tags and content/music genres.
      - Save into `tags` and `genres` (arrays) on `YoutubeVideo`.
  - The Scrapers UI (`Scrapers.jsx`):
    - Lists playlists and their videos.
    - “Tags / Genres” column renders `v.tags` and `v.genres` (top N) when populated.

- **AI usage for tags & genres**
  - **First choice: Mistral (`mistral-small`)**
    - If a Mistral key is configured:
      - `generateTagsOnly(title, description)`
      - `generateGenresOnly(title, description, channel_name)`
      - Under the hood:
        - `callMistral()` performs `chat/completions` against `https://api.mistral.ai/v1/chat/completions`.
        - Prompts require pure JSON output (`{"tags":[...], "genres":[...]}`).
  - **Fallback: AIManager (OpenAI/Gemini/etc.)**
    - If Mistral is not available or returns nothing:
      - `AIManager->execute()` used with JSON-mode prompts.
      - Existing tags/genres are merged with new ones (deduplicated).
  - Persistence:
    - Generated tags/genres are stored on `YoutubeVideo` and visible in the Scrapers UI.

---

### 11. Streaming vs Watchlist Platforms

- **Conceptual difference**
  - **Streaming platforms**:
    - Full content lifecycle: **Artists → Albums → Tracks/Episodes**.
    - Needs album/track payloads with artwork, durations, release dates.
  - **Watchlist platforms**:
    - Only track “what to watch later” list, minimal structure:
      - Possibly just video ID, title, URL, and metadata.

- **Differences in controllers & payload formats**
  - Streaming:
    - Controller logic:
      - Resolve or create **artist** (often via `/artists/by-name/{name}`).
      - Create **album** with:
        - `name`, `image`, `release_date`, `description`, `artists`, `genres`, `tags`.
      - Create **track** with:
        - `name`, `release_date`, `image`, `duration`, `description`, `artists`, `album_id`.
    - Response handling must tolerate:
      - `{"id": ...}`
      - `{"data": {"id": ...}}`
      - `{"artist": {"id": ...}}`
      - `{"album": {"id": ...}}`
  - Watchlist:
    - Simpler payloads:
      - Essentially “add this YouTube episode to watchlist” with minimal metadata.

- **Credential handling**
  - Each platform record stores:
    - Base URL, API key/token, type (`streaming` or `watchlist`), and any extra metadata.
  - Credentials are used by:
    - `StreamingPlatformController` / services to sign HTTP calls.
    - Duties that run pushes on schedule.

- **Auto duty creation**
  - When playlist is added:
    - **Sync duty** can be created automatically to:
      - Periodically fetch new videos, generate tags/genres.
  - When user pushes to a platform:
    - `ensurePushDutyExists`:
      - Ensures a **single duty per (playlist_id + platform_id)**.
      - Duty runs on schedule to push **only missing** episodes.

- **Automated data push**
  - For streaming platforms:
    - Duty execution:
      - For each new/missing video:
        - Construct album/track payloads from playlist/video metadata.
        - Call platform APIs.
  - For watchlist:
    - Duty execution:
      - Send minimal “add to watchlist” items.

---

### 12. Automation Flow

- **High-level chain**  
  **Credential → Scraper → Duty → Scheduler → Upload**

  1. **Credential**
     - Admin configures platforms:
       - Streaming (e.g. Otakuhub, productschool).
       - Watchlist platforms.
     - Stores base URL, API key, type.

  2. **Scraper**
     - Admin adds a YouTube playlist in Scrapers UI.
     - `AiScraperController`:
       - Validates URL.
       - Calls `YouTubeScraperService::fetchPlaylist`.
       - Persists playlist + videos.

  3. **Duty creation**
     - **Sync duty**:
       - Automatically (or via explicit action) created per playlist.
       - Job: sync playlist, detect new videos, generate tags/genres.
     - **Push duty**:
       - `ensurePushDutyExists` for (playlist + platform):
         - Job: push missing episodes to that platform.

  4. **Scheduler**
     - Laravel scheduler / cron runs `DutyExecutionService` on a schedule.
     - For each due duty:
       - Loads its `execution_data`.
       - Calls the appropriate service:
         - Sync: `YouTubeScraperService::syncToDatabase` + AI metadata.
         - Push: `StreamingPlatform` or watchlist client.

  5. **Upload**
     - For streaming:
       - API calls to create artists, albums, tracks.
     - For watchlist:
       - API calls to append to watchlist.

- **Retry & failure handling**
  - Duties track:
    - `execution_count`, `success_count`, `failure_count`, `error_message`.
  - When a duty fails:
    - Error stored in duty record.
    - Can be retried on next schedule or manually.
  - Low-level errors:
    - Mistral API failures logged with warning.
    - Streaming platform errors logged (status + body).

- **Logs & monitoring**
  - `ai_audit_logs` tracks:
    - Individual executions and payloads for transparency.
  - Duties list view shows:
    - Status, last executed, next execution, error summary.

---

### 13. Final System Flow (Step-by-Step)

#### 13.1 From scraping to publishing

1. **Admin adds playlist** in Scrapers UI.
2. **Backend**:
   - `AiScraperController@store` calls `YouTubeScraperService::fetchPlaylist` & `syncToDatabase`.
   - `YoutubePlaylist` + `YoutubeVideo` rows created.
3. **(Optional) Auto duty creation**:
   - Create **playlist_sync duty** with `execution_data.playlist_id`.
4. **Admin clicks “Generate AI Metadata”**:
   - For each selected video:
     - Calls `generateMetadata(video_id)`.
     - Uses **Mistral** if available; fallback to AIManager.
     - Updates `tags` + `genres` on `YoutubeVideo`.
5. **Admin clicks “Push to platform”** for a target streaming/watchlist platform:
   - `ensurePushDutyExists(playlist_id, platform_id)` ensures **push duty** exists.
   - Immediately triggers a run or waits for schedule.
6. **Scheduler runs duties**:
   - Sync duty:
     - Re-scrapes playlist.
     - Finds new episodes.
     - Generates AI tags/genres for new ones.
   - Push duty:
     - Compares local episodes vs platform.
     - Pushes only **new/missing** ones (with full metadata for streaming).

#### 13.2 From chat to AI response

1. User opens Chat UI.
2. Chat loads:
   - Global endpoints.
   - Available models (from endpoint metadata).
3. User selects endpoint/model (or uses default).
4. Chat sends:
   - System prompt built from **global rules**, **skills**, and relevant **duties**.
   - User message.
5. Backend:
   - AIManager picks correct provider + model.
   - If provider/model fails:
     - Fallback to alternative model.
6. Response:
   - Streamed back to UI.
   - Errors (rate limit, connection issues) rendered as clear messages.

#### 13.3 From admin config to automation

1. Admin configures:
   - Platforms (credentials).
   - AI endpoints (providers/models).
   - Global rules & skills.
2. These configs determine:
   - Which AI provider is used where.
   - How often duties run.
   - How scrapers + pushes behave.
3. Scheduler + duties use these configs to keep:
   - Playlists synced.
   - Streaming/watchlist platforms updated.
   - AI tasks (tags/genres, summaries) continuously running.

---

### 14. Current Status

- **Completed / Implemented**
  - **Section Editor**
    - Field-based relationship configuration.
    - Visibility controls (list/detail/API).
    - Dynamic entity error handling with graceful messages.
  - **MCP**
    - API-key + Sanctum hybrid auth.
    - Table-level MCP permissions.
    - Clear unauthenticated/error responses.
  - **Admin Customizer & Layout**
    - Theme/layout applied on first paint.
    - Synchronous DOM updates via `useLayoutEffect`.
  - **Build & deployment**
    - Sass warnings silenced via Vite config.
    - Asset path fixed (`auth.jpg`).
    - `.htaccess` for Laravel + additional security headers.
    - Migration helper route `/run-migrations` (no key required, with DB error messages).
    - MySQL index-length issue resolved via `Schema::defaultStringLength(191)`.
  - **YouTube Scraper**
    - Integrated with **Mistral** for tags/genres (no global default model, uses key presence).
    - Scrapers UI shows generated tags/genres.
  - **Streaming Push**
    - More robust handling of artist/album IDs from various API response shapes.
    - Improved alignment with legacy plugin behavior.
  - **Duties / Rules / Skills**
    - Global, generic duties with summary list + full-detail endpoints.
    - Edit flows fetch full objects on demand.
  - **Icons & UI polish**
    - Sidebar icons for **YouTube Scrapers** and **Dynamic Skills** fixed.
    - Admin layout responsiveness and theming improved.

- **Ready for extension**
  - Add more AI endpoints (providers/models) without touching core logic.
  - Extend duties/rules/skills for new automation types (e.g. non‑YouTube pipelines).
  - Enhance chat prompts/rules to better separate “GLOBAL DUTIES” vs normal user Q&A.
  - Add more Section Editor features (validators, computed fields, etc.) on top of the existing dynamic entity infrastructure.

This markdown document can be dropped into the repo as something like `docs/SYSTEM-ARCHITECTURE.md` to serve as **technical documentation, onboarding material, and architectural reference** for future developers.