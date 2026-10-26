<?php

namespace Tests\Feature;

use App\Mail\UserManualMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class UserManualTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        Mail::fake();
    }

    private function payload(string $language = 'en', string $email = 'reader@example.com'): array
    {
        $challenge = $this->getJson('/api/manuals/challenge')->assertOk()->json();
        preg_match('/(\d+) \+ (\d+)/', $challenge['question'], $numbers);

        return ['language' => $language, 'email' => $email, 'challenge_token' => $challenge['token'], 'challenge_answer' => (string) ($numbers[1] + $numbers[2])];
    }

    public function test_all_editions_download_the_complete_shipped_pdf(): void
    {
        foreach (config('manuals.languages') as $language => $edition) {
            $path = config('manuals.directory').DIRECTORY_SEPARATOR.$edition['file'];
            $this->assertFileExists($path);
            $this->assertStringStartsWith('%PDF-', file_get_contents($path));
            $this->get('/api/manuals/'.$language.'/download')->assertOk()->assertDownload($edition['file']);
        }
        $this->getJson('/api/manuals/../download')->assertNotFound();
        $this->getJson('/api/manuals/unknown/download')->assertNotFound();
    }

    public function test_email_attaches_each_correct_language_pdf_and_translated_body(): void
    {
        foreach (config('manuals.languages') as $language => $edition) {
            $this->postJson('/api/manuals/email', $this->payload($language))->assertOk()->assertJsonFragment(['message' => 'The email service accepted your manual. Please check your inbox and Spam folder.']);
            Mail::assertSent(UserManualMail::class, function ($mail) use ($language, $edition) {
                return $mail->language === $language && $mail->hasTo('reader@example.com') && basename($mail->pdfPath) === $edition['file'] && count($mail->attachments()) === 1 && str_contains($mail->render(), 'VMS');
            });
        }
        Mail::assertSentCount(3);
    }

    public function test_invalid_language_email_and_verification_are_rejected(): void
    {
        $payload = $this->payload();
        $this->postJson('/api/manuals/email', [...$payload, 'language' => '../../.env', 'email' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors(['language', 'email']);
        $this->postJson('/api/manuals/email', [...$payload, 'challenge_answer' => '999'])->assertUnprocessable();
        $this->postJson('/api/manuals/email', [...$payload, 'challenge_token' => 'forged'])->assertUnprocessable();
        Mail::assertNothingSent();
    }

    public function test_challenge_cannot_be_replayed(): void
    {
        $payload = $this->payload();
        $this->postJson('/api/manuals/email', $payload)->assertOk();
        $this->postJson('/api/manuals/email', $payload)->assertUnprocessable();
        Mail::assertSentCount(1);
    }

    public function test_expired_challenge_is_rejected(): void
    {
        $payload = $this->payload();
        $payload['challenge_token'] = Crypt::encryptString(json_encode(['answer' => $payload['challenge_answer'], 'nonce' => 'expired-test', 'expires' => time() - 1]));
        $this->postJson('/api/manuals/email', $payload)->assertUnprocessable();
        Mail::assertNothingSent();
    }

    public function test_email_failure_is_not_reported_as_success(): void
    {
        $payload = $this->payload();
        Mail::shouldReceive('to')->once()->andThrow(new \RuntimeException('Simulated transport failure'));
        $this->postJson('/api/manuals/email', $payload)->assertStatus(502)->assertJsonFragment(['message' => 'The email service could not accept the manual. Please download it or try again later.']);
    }

    public function test_missing_pdf_and_attachment_size_are_handled(): void
    {
        config(['manuals.directory' => storage_path('framework/testing/no-manuals-here')]);
        $this->getJson('/api/manuals/en/download')->assertStatus(503);
        $this->postJson('/api/manuals/email', $this->payload())->assertStatus(503);
        Mail::assertNothingSent();
    }

    public function test_oversized_attachment_is_rejected(): void
    {
        config(['manuals.max_bytes' => 1]);
        $this->postJson('/api/manuals/email', $this->payload())->assertStatus(503);
        Mail::assertNothingSent();
    }

    public function test_public_email_rate_limit_blocks_fourth_request(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/manuals/email', $this->payload())->assertOk();
        }
        $this->postJson('/api/manuals/email', $this->payload())->assertStatus(429);
        Mail::assertSentCount(3);
    }

    public function test_recipient_limit_applies_across_different_ip_addresses(): void
    {
        for ($i = 1; $i <= 4; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.'.$i]);
            $this->postJson('/api/manuals/email', $this->payload())->assertStatus($i === 4 ? 429 : 200);
        }
        Mail::assertSentCount(3);
    }
}
