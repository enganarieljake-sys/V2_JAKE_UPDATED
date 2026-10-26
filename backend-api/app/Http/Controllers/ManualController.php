<?php

namespace App\Http\Controllers;

use App\Mail\UserManualMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ManualController extends Controller
{
    public function challenge()
    {
        $a = random_int(2, 9);
        $b = random_int(1, 9);

        return response()->json([
            'question' => "What is {$a} + {$b}?",
            'token' => Crypt::encryptString(json_encode(['answer' => (string) ($a + $b), 'nonce' => (string) Str::uuid(), 'expires' => time() + 600])),
        ])->header('Cache-Control', 'no-store');
    }

    public function download(string $language)
    {
        [$path, $edition] = $this->resolve($language);

        return response()->download($path, $edition['file'], ['Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff']);
    }

    private function resolve(string $language): array
    {
        $edition = config("manuals.languages.{$language}");
        abort_unless(is_array($edition), 404, 'This manual language is unavailable.');
        $path = config('manuals.directory').DIRECTORY_SEPARATOR.$edition['file'];
        abort_unless(is_file($path) && is_readable($path), 503, 'The manual is temporarily unavailable. Please try again later.');
        abort_if(filesize($path) > config('manuals.max_bytes'), 503, 'This manual exceeds the delivery size limit.');

        return [$path, $edition];
    }

    public function email(Request $request)
    {
        $data = $request->validate([
            'language' => ['required', Rule::in(array_keys(config('manuals.languages')))],
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'challenge_token' => ['required', 'string', 'max:2000'],
            'challenge_answer' => ['required', 'string', 'max:3'],
        ]);
        try {
            $challenge = json_decode(Crypt::decryptString($data['challenge_token']), true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            abort(422, 'Please refresh the verification question and try again.');
        }
        abort_unless(isset($challenge['expires'], $challenge['answer'], $challenge['nonce']) && $challenge['expires'] >= time() && hash_equals($challenge['answer'], trim($data['challenge_answer'])), 422, 'The verification answer is incorrect or expired. Please try again.');
        [$path] = $this->resolve($data['language']);
        $keys = ['manual-recipient:'.hash('sha256', strtolower($data['email'])), 'manual-global'];
        abort_if(RateLimiter::tooManyAttempts($keys[0], 3) || RateLimiter::tooManyAttempts($keys[1], 30), 429, 'Manual email requests are temporarily limited. Please download the PDF or try again later.');
        abort_unless(Cache::add('manual-challenge:'.$challenge['nonce'], true, 600), 422, 'This verification was already used. Please refresh the question.');
        foreach ($keys as $key) {
            RateLimiter::hit($key, 3600);
        }
        // Log/array/failover-to-log transports cannot confirm external acceptance.
        abort_unless(app()->environment('testing') || in_array(config('mail.default'), ['smtp', 'ses', 'ses-v2', 'postmark', 'resend', 'mailgun', 'sendmail'], true), 503, 'Email delivery is not configured. You can download the manual instead.');
        // Attachments take longer than short account messages on slow links.
        // Keep the request budget bounded and socket failures catchable.
        if (! app()->environment('testing')) {
            set_time_limit(120);
            if (config('mail.default') === 'smtp') {
                config(['mail.mailers.smtp.timeout' => 20]);
            }
        }
        try {
            Mail::to($data['email'])->send(new UserManualMail($data['language'], $path));
        } catch (\Throwable $error) {
            // Do not log recipient addresses or SMTP credentials/errors.
            Log::warning('VMS manual email failed', ['exception_type' => get_class($error)]);
            abort(502, 'The email service could not accept the manual. Please download it or try again later.');
        }

        return response()->json(['message' => 'The email service accepted your manual. Please check your inbox and Spam folder.']);
    }
}
