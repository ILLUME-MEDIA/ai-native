<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResendService
{
    private string $apiKey;
    private string $fromEmail;
    private string $fromName;
    private string $baseUrl = 'https://api.resend.com';

    public function __construct()
    {
        $this->apiKey    = config('otp_auth.resend_api_key', '');
        $this->fromEmail = config('otp_auth.from_email', 'noreply@example.com');
        $this->fromName  = config('otp_auth.from_name', config('app.name'));
    }

    /**
     * Send OTP email via Resend API.
     */
    public function sendOtpEmail(string $toEmail, string $otp, int $expiresMinutes = 10): bool
    {
        $appName = config('app.name', 'App');

        $html = $this->buildOtpEmailHtml($otp, $expiresMinutes, $appName);

        return $this->send(
            to: $toEmail,
            subject: "Your {$appName} Verification Code: {$otp}",
            html: $html,
        );
    }

    /**
     * Send a raw email via Resend.
     */
    public function send(
        string $to,
        string $subject,
        string $html,
        ?string $text = null,
        array $cc = [],
        array $bcc = [],
        array $replyTo = [],
    ): bool {
        if (empty($this->apiKey)) {
            Log::error('ResendService: RESEND_API_KEY is not set.');
            return false;
        }

        $payload = [
            'from'    => "{$this->fromName} <{$this->fromEmail}>",
            'to'      => [$to],
            'subject' => $subject,
            'html'    => $html,
        ];

        if ($text) {
            $payload['text'] = $text;
        }
        if (!empty($cc)) {
            $payload['cc'] = $cc;
        }
        if (!empty($bcc)) {
            $payload['bcc'] = $bcc;
        }
        if (!empty($replyTo)) {
            $payload['reply_to'] = $replyTo;
        }

        try {
            $response = Http::withToken($this->apiKey)
                ->acceptJson()
                ->post("{$this->baseUrl}/emails", $payload);

            if ($response->successful()) {
                return true;
            }

            Log::error('ResendService: Failed to send email', [
                'to'     => $to,
                'status' => $response->status(),
                'body'   => $response->json(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('ResendService: Exception while sending email', [
                'to'      => $to,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function buildOtpEmailHtml(string $otp, int $expiresMinutes, string $appName): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verification Code</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
            .wrapper { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
            .header { background: #111827; padding: 32px 40px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: -0.3px; }
            .body { padding: 40px; }
            .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
            .otp-box { background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #111827; font-family: 'Courier New', monospace; }
            .expiry { color: #6b7280; font-size: 13px; margin-top: 8px; }
            .footer { background: #f9fafb; padding: 20px 40px; text-align: center; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h1>{$appName}</h1>
            </div>
            <div class="body">
              <p>Hi there,</p>
              <p>Use the verification code below to confirm your identity. Do not share this code with anyone.</p>
              <div class="otp-box">
                <div class="otp-code">{$otp}</div>
                <div class="expiry">Expires in {$expiresMinutes} minutes</div>
              </div>
              <p>If you did not request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; {$appName}. This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
        HTML;
    }
}
