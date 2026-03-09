<?php

namespace App\Mail;

use App\Models\CalMeeting;
use App\Models\CalPlatform;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewMeetingNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly CalMeeting  $meeting,
        public readonly CalPlatform $platform,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New Meeting Booked: {$this->meeting->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new_meeting',
        );
    }
}
