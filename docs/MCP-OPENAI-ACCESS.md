# MCP Access for OpenAI and Other Clients

Entities that have **MCP enabled** can be accessed by OpenAI, Cursor, or any external client using an API key. Only entities with **MCP** enabled will be visible and accessible.

---

## 1. Set the API Key

Add this to your `.env` file:

```env
MCP_API_KEY=your-secret-key-here
```

Use a strong random key (e.g. run `php artisan str:random 64` to generate one).

---

## 2. Base URL

Your app’s base URL (local or production):

- **Local:** `http://127.0.0.1:8000`
- **Production:** `https://yourdomain.com`

API base path: `{BASE_URL}/api`

---

## 3. Authentication

Send this header on every request:

```
Authorization: Bearer your-secret-key-here
```

Use the same value you set for `MCP_API_KEY` in `.env` as the Bearer token.

---

## 4. MCP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mcp/entities` | List all MCP-enabled entities |
| GET | `/api/mcp/entities/{slug}` | Get one entity’s schema (fields) |
| POST | `/api/mcp/entities/{slug}/query` | List rows for that entity (read) |
| POST | `/api/mcp/entities/{slug}` | Create a new record (if create is allowed for that entity) |
| PATCH | `/api/mcp/entities/{slug}/{id}` | Update a record (if allowed) |
| DELETE | `/api/mcp/entities/{slug}/{id}` | Delete a record (if allowed) |

**Important:** Only entities that have **MCP** enabled in the Section Editor are accessible, and only the operations (read/create/update/delete) that you allowed for each entity will work.

---

## 5. Examples (cURL)

**List MCP-enabled entities:**

```bash
curl -H "Authorization: Bearer your-secret-key-here" \
  "http://127.0.0.1:8000/api/mcp/entities"
```

**Query data for an entity (e.g. slug `youtube-videos`):**

```bash
curl -X POST \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"per_page":20}' \
  "http://127.0.0.1:8000/api/mcp/entities/youtube-videos/query"
```

---

## 6. Using with OpenAI or Another AI Tool

1. **API key:** Use the same value you set for `MCP_API_KEY` in `.env`.
2. **Base URL:** `https://yourdomain.com/api/mcp` (or locally: `http://127.0.0.1:8000/api/mcp`).
3. **Header:** On every request send  
   `Authorization: Bearer <MCP_API_KEY>`.

If the tool supports a “Custom API”, “OpenAI-compatible”, or generic REST client:

- **Base URL:** `{BASE}/api/mcp`
- **Auth:** Bearer token = your `MCP_API_KEY` value.

Only clients that have this key can access the API, and only entities that have MCP enabled in the Section Editor will be available.

---

## 7. Enabling MCP in the Section Editor

1. Go to **Apps → Sections** and open the entity (e.g. youtube-videos).
2. Click **Edit** and open the **MCP Access** tab.
3. Turn **Enable MCP** on.
4. Enable **Read**, **Create**, **Update**, and/or **Delete** as needed.
5. Save.

After that, the entity will appear in the `/api/mcp/entities` list and can be accessed via the endpoints above according to the permissions you set.
