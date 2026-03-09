<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Meeting Booked</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: {{ $platform->color ?? '#6366f1' }}; padding: 28px 32px; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .header p  { color: rgba(255,255,255,.85); margin: 6px 0 0; font-size: 14px; }
        .body { padding: 32px; }
        .body h2 { color: #111827; font-size: 18px; margin: 0 0 20px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 0; vertical-align: top; }
        td:first-child { color: #6b7280; font-size: 13px; width: 140px; }
        td:last-child  { color: #111827; font-size: 14px; font-weight: 500; }
        tr + tr td { border-top: 1px solid #f3f4f6; }
        .btn { display: inline-block; margin-top: 28px; padding: 12px 28px; background: {{ $platform->color ?? '#6366f1' }}; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; }
        .footer { padding: 20px 32px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>📅 New Meeting Booked</h1>
        <p>Platform: {{ $platform->name }}</p>
    </div>
    <div class="body">
        <h2>{{ $meeting->title }}</h2>
        <table>
            <tr>
                <td>Attendee</td>
                <td>{{ $meeting->attendee_name ?? '—' }}</td>
            </tr>
            <tr>
                <td>Email</td>
                <td>{{ $meeting->attendee_email ?? '—' }}</td>
            </tr>
            <tr>
                <td>Start Time</td>
                <td>{{ $meeting->start_time?->format('D, M j Y  g:i A') ?? '—' }}</td>
            </tr>
            <tr>
                <td>End Time</td>
                <td>{{ $meeting->end_time?->format('D, M j Y  g:i A') ?? '—' }}</td>
            </tr>
            @if($meeting->attendee_timezone)
            <tr>
                <td>Timezone</td>
                <td>{{ $meeting->attendee_timezone }}</td>
            </tr>
            @endif
            <tr>
                <td>Status</td>
                <td>{{ ucfirst($meeting->status ?? 'upcoming') }}</td>
            </tr>
            @if($meeting->description)
            <tr>
                <td>Description</td>
                <td>{{ $meeting->description }}</td>
            </tr>
            @endif
        </table>

        @if($meeting->meeting_url)
            <a href="{{ $meeting->meeting_url }}" class="btn">🔗 Join Meeting</a>
        @endif
    </div>
    <div class="footer">
        {{ config('app.name') }} &bull; Automated notification
    </div>
</div>
</body>
</html>
