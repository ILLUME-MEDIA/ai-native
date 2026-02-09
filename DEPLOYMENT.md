# Production Deployment Guide

## .htaccess Files Created

1. **Root `.htaccess`** - Redirects all requests to `public/` folder
2. **`public/.htaccess`** - Laravel routing with security headers and optimizations

## Pre-Deployment Checklist

### 1. Environment Configuration
- Copy `.env.example` to `.env` (if not exists)
- Update `.env` with production values:
  ```env
  APP_ENV=production
  APP_DEBUG=false
  APP_URL=https://yourdomain.com
  
  DB_CONNECTION=mysql
  DB_HOST=your_db_host
  DB_PORT=3306
  DB_DATABASE=your_database
  DB_USERNAME=your_username
  DB_PASSWORD=your_password
  
  MCP_API_KEY=your_secure_api_key_here
  MIGRATE_ROUTE_KEY=your_secure_key_here
  ```

### 2. Generate Application Key
```bash
php artisan key:generate
```

### 3. Run Migrations
```bash
php artisan migrate --force
```

### 4. Build Frontend Assets
```bash
npm install
npm run build
```

### 5. Optimize Laravel (Production)
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### 6. Set Permissions (Linux/Unix)
```bash
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 7. Server Configuration

#### Apache Requirements
- `mod_rewrite` enabled
- `mod_headers` enabled (for security headers)
- `mod_deflate` enabled (for gzip compression)
- `mod_expires` enabled (for browser caching)

#### Document Root (IMPORTANT – fixes "Index of /")
Your domain **must** use the `public` folder as the document root, not the project root.

- **Correct:** Document root = `/path/to/your/project/public`
- **Wrong:** Document root = `/path/to/your/project` (this causes "Index of /" and lists app/, vendor/, etc.)

**How to set (cPanel):** Domains → your domain → Document Root → set to `public` (e.g. `public_html/yourproject/public` or the folder that contains `index.php`).

**If you cannot change document root:** The project root `.htaccess` will try to send requests to `public/`. Ensure `AllowOverride All` is set for your directory so `.htaccess` is read.

#### PHP Requirements
- PHP >= 8.1
- Required extensions: OpenSSL, PDO, Mbstring, Tokenizer, XML, Ctype, JSON, BCMath, Fileinfo

### 8. Security Checklist
- [ ] `.env` file is not accessible via web (should be outside public/)
- [ ] `APP_DEBUG=false` in production
- [ ] Strong `APP_KEY` generated
- [ ] Database credentials are secure
- [ ] `MCP_API_KEY` is set and secure
- [ ] `MIGRATE_ROUTE_KEY` is set (optional but recommended)

### 9. Post-Deployment
- Test admin login
- Test API endpoints
- Check error logs: `storage/logs/laravel.log`
- Monitor server resources

## Troubleshooting

### "Index of /" or directory listing on domain
**Cause:** The web server document root is the project root instead of the `public` folder, so the server lists files (app/, vendor/, .env risk, etc.) instead of running Laravel.

**Fix (choose one):**

1. **Best:** Change the domain’s document root to the `public` folder.
   - cPanel: Domains → your domain → Document Root → set to `.../public`.
   - So when someone visits `development.illumemedia.app`, the server uses `public/` (where `index.php` lives).

2. **If you can’t change document root:** Ensure the root `.htaccess` is present and that the server allows it:
   - Root `.htaccess` should send all requests to `public/` (already updated in this project).
   - Apache: `AllowOverride All` for this directory so `.htaccess` is applied.
   - If you still see "Index of /", the host may be ignoring `.htaccess`; then document root **must** be set to `public`.

### SQLSTATE[HY000] [1045] Access denied for user '...'@'localhost'
**Cause:** Wrong database credentials on the server. Laravel uses the database for sessions, so the error appears before any page loads.

**Quick workaround (site chalane ke liye):**  
Jab tak DB credentials sahi nahi karte, session ko database ki jagah file use karne do. Server par `.env` mein ye line add ya change karein:
```env
SESSION_DRIVER=file
```
Save karein, phir site reload karein. Ab 500 nahi aana chahiye. Baad mein DB sahi karke `SESSION_DRIVER=database` wapas kar sakte ho.

**Permanent fix (on live server):**

1. **Open `.env`** in your project root on the server (e.g. via cPanel File Manager or SSH).

2. **Get correct DB details from your hosting panel:**
   - cPanel → MySQL® Databases (or Remote MySQL)
   - Or Plesk → Databases
   - Note: **MySQL host** (often `localhost` or `127.0.0.1` or `mysql.yourdomain.com`), **database name**, **username**, **password**.

3. **Update `.env`** so these match exactly (no extra spaces, correct password):
   ```env
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=n111145_development_cms
   DB_USERNAME=n111145_development_cms
   DB_PASSWORD=your_actual_password_from_hosting
   ```

4. **Common mistakes:**
   - Password copied wrong (quotes/special characters).
   - Using a different DB user than the one that has access to `n111145_development_cms`.
   - Some hosts require `DB_HOST=127.0.0.1` instead of `localhost` (or the opposite).

5. **Clear config cache** (SSH or hosting “Run PHP”):
   ```bash
   php artisan config:clear
   ```

6. **Test:** Reload the site or hit `/run-migrations?key=YOUR_KEY` again.

### 500 Internal Server Error
- Check file permissions
- Check `.env` configuration (and DB credentials above)
- Check `storage/logs/laravel.log`
- Verify `mod_rewrite` is enabled

### CORS / "Access to script at 'http://[::1]:5173/@vite/client' blocked"
**Cause:** Live site is loading scripts from the Vite **dev server** (localhost:5173) instead of **built assets**. The dev server runs only on your PC, so the browser blocks it (CORS).

**Fix (on live server):**

1. **Delete `public/hot`** if it exists (File Manager or SSH):
   ```bash
   rm -f public/hot
   ```
   Laravel uses this file to decide "use dev server". On production it must not exist.

2. **Use built assets:** Run a production build and deploy the output:
   ```bash
   npm install
   npm run build
   ```
   Then upload the **`public/build`** folder to the server (or run the same commands on the server). So the server has:
   - `public/build/manifest.json`
   - `public/build/assets/*.js` and `*.css`

3. **Set:** `APP_ENV=production` and `APP_DEBUG=false` in `.env`.

4. Clear config cache: `php artisan config:clear`, then reload the site. Scripts will load from `https://development.illumemedia.app/build/...` (same origin, no CORS).

### Assets Not Loading
- Run `npm run build` again
- Check `public/build/` folder exists
- Verify Vite manifest file exists (`public/build/.vite/manifest.json` or `public/build/manifest.json`)
- Ensure `public/hot` does **not** exist on production

### Routes Not Working
- Clear route cache: `php artisan route:clear`
- Check `.htaccess` is in `public/` folder
- Verify `mod_rewrite` is enabled

## Quick Commands

```bash
# Clear all caches
php artisan optimize:clear

# Rebuild caches
php artisan optimize

# View logs
tail -f storage/logs/laravel.log
```
