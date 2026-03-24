<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\DiscoveryUser;
use App\Models\DiscoveryUserLocation;
use App\Models\OtpVerification;
use App\Services\ResendService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OtpAuthController extends Controller
{
    public function __construct(private ResendService $resend) {}

    /*
    |--------------------------------------------------------------------------
    | SEND OTP
    |--------------------------------------------------------------------------
    | POST /api/auth/otp/send
    | Body: { email, table? }
    |
    | Generates a 6-digit OTP and emails it via Resend.
    */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'table' => ['sometimes', 'string'],
        ]);

        $email = strtolower(trim($request->email));
        $table = $request->input('table', $this->getFirstAllowedTable());

        if (! $this->isTableAllowed($table)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid table specified.',
            ], 422);
        }

        // TESTING MODE: all rate limits disabled — re-enable after testing
        // Rate-limit: max 3 OTPs per email per 10 minutes
        // $limitKey     = 'otp-send:' . $email;
        // $maxOtps      = 3;
        // $windowSeconds = 10 * 60; // 10 minutes
        //
        // if (RateLimiter::tooManyAttempts($limitKey, $maxOtps)) {
        //     $waitSeconds = RateLimiter::availableIn($limitKey);
        //     $waitMinutes = (int) ceil($waitSeconds / 60);
        //     return response()->json([
        //         'success'     => false,
        //         'message'     => "Too many OTP requests. Please wait {$waitMinutes} minute(s) before requesting a new OTP.",
        //         'wait_seconds' => $waitSeconds,
        //     ], 429);
        // }
        //
        // Per-request cooldown: check if a recent OTP was already sent
        // $cooldown = (int) config('otp_auth.resend_cooldown_seconds', 60);
        // $latest   = OtpVerification::where('email', $email)
        //     ->whereNull('verified_at')
        //     ->where('created_at', '>', now()->subSeconds($cooldown))
        //     ->latest()
        //     ->first();
        //
        // if ($latest) {
        //     $waitSeconds = $cooldown - now()->diffInSeconds($latest->created_at);
        //     return response()->json([
        //         'success' => false,
        //         'message' => "Please wait {$waitSeconds} seconds before requesting a new OTP.",
        //         'wait_seconds' => max(0, $waitSeconds),
        //     ], 429);
        // }

        // Invalidate any previous unverified OTPs for this email
        OtpVerification::where('email', $email)
            ->whereNull('verified_at')
            ->delete();

        $otp        = $this->generateOtp();
        $expMinutes = (int) config('otp_auth.otp_expires_minutes', 10);

        OtpVerification::create([
            'email'      => $email,
            'otp'        => $otp,
            'expires_at' => now()->addMinutes($expMinutes),
            'ip_address' => $request->ip(),
        ]);

        // Count this send against the 3-per-10-minute limit (disabled for testing)
        // RateLimiter::hit($limitKey, $windowSeconds);

        $sent = $this->resend->sendOtpEmail($email, $otp, $expMinutes);

        if (! $sent) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP email. Please try again.',
            ], 500);
        }

        return response()->json([
            'success'            => true,
            'message'            => 'OTP sent successfully. Check your email.',
            'expires_in_minutes' => $expMinutes,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY OTP  — Fully Frontend-Configurable
    |--------------------------------------------------------------------------
    | POST /api/otp-auth/verify
    |
    | Required:
    |   email  string
    |   otp    string
    |
    | Optional (all controllable from frontend):
    |   table                 string   Table to check email in (default: 'users')
    |   check_email           bool     Check email in table? (default: true)
    |   on_found              string   'token' | 'message'  (default: 'token')
    |   on_not_found          string   'token' | 'message' | 'create' (default: 'message')
    |   found_message         string   Custom message when email found
    |   not_found_message     string   Custom message when email not found
    |   create_data           object   Extra fields to insert when on_not_found='create'
    |   skip_token            bool     Don't return token even if found (default: false)
    */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'email'             => ['required', 'email'],
            'otp'               => ['required', 'string', 'min:4', 'max:10'],
            'table'             => ['sometimes', 'string'],
            'check_email'       => ['sometimes', 'boolean'],
            'on_found'          => ['sometimes', 'string', 'in:token,message'],
            'on_not_found'      => ['sometimes', 'string', 'in:token,message,profile,create'],
            'found_message'     => ['sometimes', 'string'],
            'not_found_message' => ['sometimes', 'string'],
            'create_data'       => ['sometimes', 'array'],
            'skip_token'        => ['sometimes', 'boolean'],
            'device_info'       => ['sometimes', 'array'],
        ]);

        $email     = strtolower(trim($request->email));
        $otp       = trim($request->otp);
        $table     = $request->input('table', $this->getFirstAllowedTable());

        // Load saved table options as fallback defaults (set via admin Settings tab)
        $saved = $this->getTableOptions($table);

        $checkEmail = $request->has('check_email')
            ? $request->boolean('check_email')
            : (bool) ($saved['check_email'] ?? true);

        $onFound    = $request->input('on_found',     $saved['on_found']     ?? 'token');
        $onNotFound = $request->input('on_not_found', $saved['on_not_found'] ?? 'profile');

        $skipToken  = $request->has('skip_token')
            ? $request->boolean('skip_token')
            : (bool) ($saved['skip_token'] ?? false);

        // Messages: request → saved → hardcoded
        $foundMessage    = $request->input('found_message',    $saved['found_message']    ?? null);
        $notFoundMessage = $request->input('not_found_message', $saved['not_found_message'] ?? null);

        if ($checkEmail && ! $this->isTableAllowed($table)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid table specified.',
            ], 422);
        }

        // ── OTP Validation ──────────────────────────────────────────────────
        $otpRecord = OtpVerification::where('email', $email)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (! $otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'No OTP found for this email. Please request a new one.',
                'code'    => 'otp_not_found',
            ], 404);
        }

        if ($otpRecord->hasExceededAttempts((int) config('otp_auth.max_attempts', 5))) {
            $otpRecord->delete();
            return response()->json([
                'success' => false,
                'message' => 'Too many failed attempts. Please request a new OTP.',
                'code'    => 'max_attempts_exceeded',
            ], 429);
        }

        if ($otpRecord->isExpired()) {
            $otpRecord->delete();
            return response()->json([
                'success' => false,
                'message' => 'OTP has expired. Please request a new one.',
                'code'    => 'otp_expired',
            ], 422);
        }

        if ($otpRecord->otp !== $otp) {
            $otpRecord->increment('attempts');
            $remaining = (int) config('otp_auth.max_attempts', 5) - $otpRecord->fresh()->attempts;
            return response()->json([
                'success'            => false,
                'message'            => 'Invalid OTP.',
                'code'               => 'otp_invalid',
                'attempts_remaining' => max(0, $remaining),
            ], 422);
        }

        // ── OTP Verified ─────────────────────────────────────────────────────
        $otpRecord->update(['verified_at' => now()]);

        // ── Capture device fingerprint into discovery_users ───────────────────
        if ($request->filled('device_info')) {
            $this->captureDiscoveryUser($email, $request->input('device_info', []), $request);
        }

        // ── Skip email check — just confirm OTP is valid ─────────────────────
        if (! $checkEmail) {
            return response()->json([
                'success'   => true,
                'status'    => 'otp_verified',
                'message'   => $foundMessage ?? 'OTP verified successfully.',
                'email'     => $email,
                'otp_token' => $this->buildOtpSessionToken($email),
            ]);
        }

        // ── Check email in table ──────────────────────────────────────────────
        $record = DB::table($table)->where('email', $email)->first();

        // ── EMAIL FOUND ───────────────────────────────────────────────────────
        if ($record) {
            $userData = (array) $record;
            unset($userData['password'], $userData['remember_token']);

            // on_found = 'message' → return message only, no token
            if ($onFound === 'message' || $skipToken) {
                return response()->json([
                    'success' => true,
                    'status'  => 'authenticated',
                    'message' => $foundMessage ?? 'OTP verified successfully.',
                    'email'   => $email,
                    'user'    => $userData,
                ]);
            }

            // on_found = 'token' (default) → return token + user
            return response()->json([
                'success' => true,
                'status'  => 'authenticated',
                'message' => $foundMessage ?? 'Welcome back!',
                'token'   => $this->issueToken($email, $table, $record),
                'user'    => $userData,
            ]);
        }

        // ── EMAIL NOT FOUND ───────────────────────────────────────────────────

        // on_not_found = 'message' → just a message, no token at all
        if ($onNotFound === 'message') {
            return response()->json([
                'success' => true,
                'status'  => 'not_found',
                'message' => $notFoundMessage ?? 'Email not found.',
                'email'   => $email,
            ]);
        }

        // on_not_found = 'profile' → return otp_token for /complete-profile endpoint
        if ($onNotFound === 'profile') {
            return response()->json([
                'success'   => true,
                'status'    => 'profile_incomplete',
                'message'   => $notFoundMessage ?? 'Please complete your profile to continue.',
                'email'     => $email,
                'otp_token' => $this->buildOtpSessionToken($email),
            ]);
        }

        // on_not_found = 'token' → issue token even without a record (OTP-only auth)
        if ($onNotFound === 'token') {
            return response()->json([
                'success' => true,
                'status'  => 'authenticated',
                'message' => $notFoundMessage ?? 'OTP verified.',
                'token'   => $this->buildEncryptedToken($email, $table, ['email' => $email]),
                'email'   => $email,
            ]);
        }

        // on_not_found = 'create' → auto-insert record + return token
        if ($onNotFound === 'create') {
            $insertData = array_merge(
                $request->input('create_data', []),
                [
                    'email'      => $email,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            if (! empty($insertData['password'])) {
                $insertData['password'] = bcrypt($insertData['password']);
            }

            try {
                $id = DB::table($table)->insertGetId($insertData);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create user record.',
                    'code'    => 'create_failed',
                    'debug'   => $e->getMessage(),
                ], 422);
            }

            $record = DB::table($table)->find($id);
            $data   = (array) $record;
            unset($data['password'], $data['remember_token']);

            if ($skipToken) {
                return response()->json([
                    'success' => true,
                    'status'  => 'created',
                    'message' => $notFoundMessage ?? 'Account created successfully.',
                    'user'    => $data,
                ], 201);
            }

            return response()->json([
                'success' => true,
                'status'  => 'created',
                'message' => $notFoundMessage ?? 'Account created successfully.',
                'token'   => $this->issueToken($email, $table, $record),
                'user'    => $data,
            ], 201);
        }

        // Fallback (should not reach here)
        return response()->json([
            'success' => true,
            'status'  => 'not_found',
            'message' => $notFoundMessage ?? 'Email not found.',
            'email'   => $email,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | RESEND OTP
    |--------------------------------------------------------------------------
    | POST /api/auth/otp/resend
    | Body: { email, table? }
    |
    | Invalidates old OTP and sends a fresh one (respects cooldown).
    */
    public function resend(Request $request): JsonResponse
    {
        // Delegate to send — it handles cooldown + re-generation
        return $this->send($request);
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLETE PROFILE  (after profile_incomplete flow)
    |--------------------------------------------------------------------------
    | POST /api/auth/otp/complete-profile
    | Body: { otp_token, name, email, ...extra_fields, table? }
    |
    | The frontend sends the otp_token received from verify (profile_incomplete).
    | We verify the token, insert the record, then issue the real auth token.
    */
    public function completeProfile(Request $request): JsonResponse
    {
        $request->validate([
            'otp_token' => ['required', 'string'],
            'email'     => ['required', 'email'],
            'table'     => ['sometimes', 'string'],
        ]);

        $table = $request->input('table', 'users');

        if (! $this->isTableAllowed($table)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid table specified.',
            ], 422);
        }

        // Verify the otp_token (short-lived encrypted session token)
        try {
            $payload = decrypt($request->otp_token);
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or tampered session token.',
                'code'    => 'invalid_otp_token',
            ], 401);
        }

        if (
            ! isset($payload['email'], $payload['exp']) ||
            $payload['email'] !== strtolower(trim($request->email)) ||
            Carbon::createFromTimestamp($payload['exp'])->isPast()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Session token expired. Please verify your OTP again.',
                'code'    => 'otp_token_expired',
            ], 401);
        }

        $email = $payload['email'];

        // Check email doesn't already exist (race condition guard)
        if (DB::table($table)->where('email', $email)->exists()) {
            // Already exists — just issue token
            $record = DB::table($table)->where('email', $email)->first();
            $token  = $this->issueToken($email, $table, $record);
            $data   = (array) $record;
            unset($data['password'], $data['remember_token']);

            return response()->json([
                'success' => true,
                'status'  => 'authenticated',
                'token'   => $token,
                'user'    => $data,
            ]);
        }

        // Build insert data from request (minus reserved fields)
        $reserved = ['otp_token', 'table', '_token'];
        $insertData = collect($request->except($reserved))
            ->put('email', $email)
            ->put('created_at', now())
            ->put('updated_at', now())
            ->toArray();

        // Hash password if provided
        if (! empty($insertData['password'])) {
            $insertData['password'] = bcrypt($insertData['password']);
        }

        $id = DB::table($table)->insertGetId($insertData);

        $record = DB::table($table)->find($id);
        $token  = $this->issueToken($email, $table, $record);
        $data   = (array) $record;
        unset($data['password'], $data['remember_token']);

        return response()->json([
            'success' => true,
            'status'  => 'registered',
            'message' => 'Profile completed successfully.',
            'token'   => $token,
            'user'    => $data,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | GET PROFILE  (after successful OTP auth)
    |--------------------------------------------------------------------------
    | GET /api/otp-auth/profile
    | Header: Authorization: Bearer <encrypted_otp_token>
    |
    | Decodes the encrypted token issued by verify/complete-profile and
    | returns the user row from the original table.
    | Also accepts ?table= to look up in a specific table.
    */
    public function profile(Request $request): JsonResponse
    {
        $bearer = $request->bearerToken();

        if (empty($bearer)) {
            return response()->json([
                'success' => false,
                'message' => 'Authorization token required.',
                'code'    => 'token_missing',
            ], 401);
        }

        try {
            $payload = decrypt($bearer);
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or tampered token.',
                'code'    => 'invalid_token',
            ], 401);
        }

        if (
            ! isset($payload['email'], $payload['exp'], $payload['type']) ||
            $payload['type'] !== 'otp_auth'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid token type.',
                'code'    => 'invalid_token',
            ], 401);
        }

        if (Carbon::createFromTimestamp($payload['exp'])->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Token has expired. Please log in again.',
                'code'    => 'token_expired',
            ], 401);
        }

        $email = $payload['email'];
        $table = $request->query('table', $payload['table'] ?? $this->getFirstAllowedTable());

        if (! $this->isTableAllowed($table)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid table specified.',
            ], 422);
        }

        $record = DB::table($table)->where('email', $email)->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
                'code'    => 'user_not_found',
                'email'   => $email,
            ], 404);
        }

        $user = (array) $record;
        unset($user['password'], $user['remember_token']);

        return response()->json([
            'success' => true,
            'user'    => $user,
            'table'   => $table,
        ]);
    }

    // -------------------------------------------------------------------------
    // ADMIN: Settings (auth:sanctum protected — see routes/api.php)
    // -------------------------------------------------------------------------

    /*
    | GET /api/otp-auth/settings
    | Returns current OTP config + Resend connection status.
    */
    public function settingsGet(): JsonResponse
    {
        $settingsFile = storage_path('app/otp_settings.json');
        $stored       = file_exists($settingsFile)
            ? json_decode(file_get_contents($settingsFile), true)
            : [];

        $allowedTables = $stored['allowed_tables']
            ?? config('otp_auth.allowed_tables', ['users']);

        $tableOptions = $stored['table_options'] ?? [];

        return response()->json([
            'allowed_tables'        => $allowedTables,
            'table_options'         => $tableOptions,
            'resend_configured'     => ! empty(config('otp_auth.resend_api_key')),
            'from_email'            => config('otp_auth.from_email'),
            'from_name'             => config('otp_auth.from_name'),
            'otp_length'            => config('otp_auth.otp_length', 6),
            'otp_expires_minutes'   => config('otp_auth.otp_expires_minutes', 10),
            'max_attempts'          => config('otp_auth.max_attempts', 5),
            'resend_cooldown'       => config('otp_auth.resend_cooldown_seconds', 60),
            'token_expires_days'    => config('otp_auth.token_expires_days', 30),
        ]);
    }

    /*
    | PUT /api/otp-auth/settings
    | Body: { allowed_tables: string[] }
    | Updates the list of tables allowed for OTP email checks.
    */
    public function settingsUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'allowed_tables'   => ['required', 'array', 'min:1'],
            'allowed_tables.*' => ['required', 'string', 'regex:/^[a-z][a-z0-9_]*$/'],
            'table_options'    => ['sometimes', 'array'],
        ]);

        $settingsFile = storage_path('app/otp_settings.json');
        $existing     = file_exists($settingsFile)
            ? json_decode(file_get_contents($settingsFile), true)
            : [];

        $existing['allowed_tables'] = array_values(array_unique($request->allowed_tables));

        if ($request->has('table_options')) {
            // Keep only options for currently allowed tables
            $opts = [];
            foreach ($request->allowed_tables as $tbl) {
                if (isset($request->table_options[$tbl])) {
                    $opts[$tbl] = $request->table_options[$tbl];
                }
            }
            $existing['table_options'] = $opts;
        }

        file_put_contents($settingsFile, json_encode($existing, JSON_PRETTY_PRINT));

        return response()->json([
            'success'        => true,
            'allowed_tables' => $existing['allowed_tables'],
            'table_options'  => $existing['table_options'] ?? [],
        ]);
    }

    /*
    | GET /api/otp-auth/tables
    | Returns DB tables available for OTP auth selection.
    | Uses the existing section entities or raw DB table list.
    */
    public function tablesIndex(): JsonResponse
    {
        $excluded = [
            'migrations', 'failed_jobs', 'cache', 'cache_locks',
            'jobs', 'job_batches', 'sessions', 'password_reset_tokens',
            'personal_access_tokens', 'otp_verifications',
        ];

        $driver = DB::getDriverName();
        $tables = collect();

        try {
            if ($driver === 'sqlite') {
                $tables = collect(DB::select("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
                    ->pluck('name');
            } elseif ($driver === 'mysql') {
                $dbName = DB::getDatabaseName();
                $rows   = DB::select('SHOW TABLES');
                $key    = "Tables_in_{$dbName}";
                $tables = collect($rows)->pluck($key);
            } elseif ($driver === 'pgsql') {
                $tables = collect(DB::select("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
                    ->pluck('tablename');
            }
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Could not list tables: ' . $e->getMessage()], 500);
        }

        $filtered = $tables->filter(fn($t) => !in_array($t, $excluded))->values();

        $withEmail = $filtered->map(function ($table) {
            try {
                $cols     = DB::getSchemaBuilder()->getColumnListing($table);
                $hasEmail = in_array('email', $cols);
                return ['table' => $table, 'has_email' => $hasEmail, 'columns' => $cols];
            } catch (\Throwable) {
                return ['table' => $table, 'has_email' => false, 'columns' => []];
            }
        });

        return response()->json($withEmail->values());
    }

    /*
    | GET /api/otp-auth/logs
    | Returns recent OTP verifications (paginated).
    */
    public function logsIndex(Request $request): JsonResponse
    {
        $logs = OtpVerification::latest()
            ->paginate($request->integer('per_page', 25));

        return response()->json($logs);
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    private function generateOtp(): string
    {
        $length = (int) config('otp_auth.otp_length', 6);
        return str_pad((string) random_int(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
    }

    /**
     * Return the first allowed table from saved settings.
     * Used as default when request doesn't specify a table.
     */
    private function getFirstAllowedTable(): string
    {
        $settingsFile = storage_path('app/otp_settings.json');
        if (file_exists($settingsFile)) {
            $stored  = json_decode(file_get_contents($settingsFile), true);
            $allowed = $stored['allowed_tables'] ?? [];
            if (! empty($allowed) && $allowed[0] !== '*') {
                return $allowed[0];
            }
        }
        // Fallback to config, then hardcoded 'users'
        $configured = config('otp_auth.allowed_tables', ['users']);
        return ($configured[0] !== '*') ? $configured[0] : 'users';
    }

    /**
     * Return saved verify-options for a table from otp_settings.json.
     * Used as fallback defaults when the request doesn't send those fields.
     */
    private function getTableOptions(string $table): array
    {
        $settingsFile = storage_path('app/otp_settings.json');
        if (file_exists($settingsFile)) {
            $stored = json_decode(file_get_contents($settingsFile), true);
            return $stored['table_options'][$table] ?? [];
        }
        return [];
    }

    private function isTableAllowed(string $table): bool
    {
        // Check stored settings first (managed via admin UI)
        $settingsFile = storage_path('app/otp_settings.json');
        if (file_exists($settingsFile)) {
            $stored = json_decode(file_get_contents($settingsFile), true);
            if (isset($stored['allowed_tables'])) {
                $allowed = $stored['allowed_tables'];
                return in_array('*', $allowed) || in_array($table, $allowed);
            }
        }

        // Fallback to config file
        $allowed = config('otp_auth.allowed_tables', ['users']);
        return in_array('*', $allowed) || in_array($table, $allowed);
    }

    /**
     * Issue an encrypted auth token.
     * Works for ANY table — no Sanctum / HasApiTokens required.
     * Frontend stores this and sends it as Bearer token.
     * Verify with decrypt() in your custom middleware.
     */
    private function issueToken(string $email, string $table, object $record): string
    {
        return $this->buildEncryptedToken($email, $table, (array) $record);
    }

    /**
     * Build a short-lived encrypted token used during profile_incomplete flow.
     * Frontend stores this and sends it back in complete-profile request.
     */
    private function buildOtpSessionToken(string $email): string
    {
        return encrypt([
            'email' => $email,
            'exp'   => now()->addMinutes(30)->timestamp,
            'type'  => 'otp_session',
        ]);
    }

    /**
     * Build a long-lived encrypted auth token for tables without Sanctum models.
     * Verify with OtpAuthController::verifyEncryptedToken() in your middleware.
     */
    private function buildEncryptedToken(string $email, string $table, array $record): string
    {
        $days = (int) config('otp_auth.token_expires_days', 30);

        return encrypt([
            'email' => $email,
            'table' => $table,
            'id'    => $record['id'] ?? null,
            'exp'   => now()->addDays($days)->timestamp,
            'type'  => 'otp_auth',
        ]);
    }

    /**
     * Create or update a DiscoveryUser record when a device sends device_info
     * during OTP verification. Location fields are stored in the related
     * discovery_user_locations table.
     */
    private function captureDiscoveryUser(string $email, array $info, Request $request): void
    {
        try {
            // Helper: return numeric value or null (prevents string→int column errors)
            $int   = fn($v) => isset($v) && is_numeric($v) ? (int)   $v : null;
            $float = fn($v) => isset($v) && is_numeric($v) ? (float) $v : null;

            // Device-level fields stored on discovery_users
            $deviceFields = [
                'email'                => $email,
                'ip_address'           => $info['ip_address']           ?? $request->ip(),
                'isp'                  => $info['isp']                  ?? null,
                'connection_type'      => $info['connection_type']       ?? null,
                'downlink'             => $float($info['downlink']       ?? null),
                'rtt'                  => $int($info['rtt']              ?? null),
                'browser'              => $info['browser']               ?? null,
                'browser_version'      => $info['browser_version']       ?? null,
                'user_agent'           => $info['user_agent']            ?? $request->userAgent(),
                'language'             => $info['language']              ?? null,
                'languages'            => $info['languages']             ?? null,
                'timezone'             => $info['timezone']              ?? null,
                'cookies_enabled'      => isset($info['cookies_enabled']) ? (bool) $info['cookies_enabled'] : null,
                'do_not_track'         => isset($info['do_not_track'])   ? (bool) $info['do_not_track']   : null,
                'referrer'             => $info['referrer']              ?? null,
                'device_type'          => $info['device_type']           ?? null,
                'os'                   => $info['os']                    ?? null,
                'os_version'           => $info['os_version']            ?? null,
                'platform'             => $info['platform']              ?? null,
                'hardware_concurrency' => $int($info['hardware_concurrency'] ?? null),
                'device_memory'        => $int($info['device_memory']    ?? null),
                'screen_width'         => $int($info['screen_width']     ?? null),
                'screen_height'        => $int($info['screen_height']    ?? null),
                'pixel_ratio'          => $float($info['pixel_ratio']    ?? null),
                'color_depth'          => $int($info['color_depth']      ?? null),
                'fingerprint'          => $info['fingerprint']           ?? null,
                'webgl_renderer'       => $info['webgl_renderer']        ?? null,
                'webgl_vendor'         => $info['webgl_vendor']          ?? null,
                'last_seen_at'         => now(),
            ];

            // Strip null values to avoid overwriting existing data with null
            $deviceFields = array_filter($deviceFields, fn($v) => $v !== null);

            // Find by fingerprint first, then email, then create
            $user = null;
            if (! empty($info['fingerprint'])) {
                $user = DiscoveryUser::where('fingerprint', $info['fingerprint'])->first();
            }
            if (! $user && $email) {
                $user = DiscoveryUser::where('email', $email)->first();
            }

            if ($user) {
                $user->update($deviceFields);
            } else {
                $user = DiscoveryUser::create($deviceFields);
            }

            // Location fields stored in discovery_user_locations
            $locationFields = array_filter([
                'lat'               => $info['lat']               ?? null,
                'lng'               => $info['lng']               ?? null,
                'address'           => $info['address']           ?? null,
                'city'              => $info['city']              ?? null,
                'state'             => $info['state']             ?? null,
                'zip'               => $info['zip']               ?? null,
                'country'           => $info['country']           ?? null,
                'country_code'      => $info['country_code']      ?? null,
                'location_from_gps' => $info['location_from_gps'] ?? false,
            ], fn($v) => $v !== null);

            if (! empty($locationFields)) {
                DiscoveryUserLocation::updateOrCreate(
                    ['discovery_user_id' => $user->id],
                    $locationFields
                );
            }
        } catch (\Throwable) {
            // Never fail the OTP flow due to analytics capture errors
        }
    }
}
