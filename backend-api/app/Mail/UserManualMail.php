<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class UserManualMail extends Mailable
{
    public function __construct(public string $language, public string $pdfPath) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your VMS User Manual — '.config("manuals.languages.{$this->language}.label"));
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.user-manual', with: ['language' => $this->language]);
    }

    public function attachments(): array
    {
        return [Attachment::fromPath($this->pdfPath)->as(config("manuals.languages.{$this->language}.file"))->withMime('application/pdf')];
    }
}
