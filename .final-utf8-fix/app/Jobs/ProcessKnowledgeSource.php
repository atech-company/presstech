<?php

namespace App\Jobs;

use App\Models\KnowledgeChunk;
use App\Models\KnowledgeSource;
use App\Services\Knowledge\WebsiteCrawler;
use App\Support\Utf8;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ProcessKnowledgeSource implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public KnowledgeSource $source) {}

    public function handle(): void
    {
        $this->source->update(['status' => 'processing']);

        try {
            $result = Utf8::sanitize($this->extractContent());

            if (empty(trim((string) ($result['content'] ?? '')))) {
                $hint = ! empty($result['errors'])
                    ? implode('; ', array_slice($result['errors'], 0, 3))
                    : 'No content could be extracted from this source.';
                throw new \RuntimeException(Utf8::string($hint));
            }

            $this->source->chunks()->delete();

            $chunks = $this->chunkText((string) $result['content']);
            $position = 0;

            foreach ($chunks as $chunk) {
                KnowledgeChunk::create([
                    'knowledge_source_id' => $this->source->id,
                    'content' => Utf8::string($chunk),
                    'position' => $position++,
                    'token_count' => (int) (strlen($chunk) / 4),
                ]);
            }

            $previousMeta = $this->source->metadata ?? [];
            unset($previousMeta['error'], $previousMeta['failed_at']);

            $this->source->update([
                'status' => 'indexed',
                'chunk_count' => $position,
                'metadata' => Utf8::sanitize(array_merge($previousMeta, [
                    'indexed_at' => now()->toIso8601String(),
                    'content_length' => strlen((string) $result['content']),
                    'pages_found' => $result['pages_found'] ?? null,
                    'pages_indexed' => $result['pages_indexed'] ?? null,
                    'crawl_errors' => $result['errors'] ?? [],
                    'products' => $result['products'] ?? [],
                    'product_count' => count($result['products'] ?? []),
                    'error' => null,
                    'failed_at' => null,
                ])),
            ]);
        } catch (\Throwable $e) {
            try {
                $this->source->update([
                    'status' => 'failed',
                    'metadata' => Utf8::sanitize(array_merge($this->source->metadata ?? [], [
                        'error' => Utf8::string($e->getMessage()),
                        'failed_at' => now()->toIso8601String(),
                    ])),
                ]);
            } catch (\Throwable) {
                $this->source->forceFill([
                    'status' => 'failed',
                    'metadata' => [
                        'error' => 'Processing failed (encoding error while saving metadata).',
                        'failed_at' => now()->toIso8601String(),
                    ],
                ])->saveQuietly();
            }
        }
    }

    private function extractContent(): array
    {
        if ($this->source->file_path && Storage::disk('local')->exists($this->source->file_path)) {
            $content = Storage::disk('local')->get($this->source->file_path);

            return ['content' => Utf8::string($content), 'pages_found' => 1, 'pages_indexed' => 1, 'errors' => []];
        }

        if (! $this->source->source_url) {
            return ['content' => '', 'pages_found' => 0, 'pages_indexed' => 0, 'errors' => []];
        }

        if (in_array($this->source->type, ['website', 'sitemap'], true)) {
            return app(WebsiteCrawler::class)->crawl(
                $this->source->source_url,
                $this->source->type
            );
        }

        try {
            $response = Http::timeout(45)
                ->withHeaders(['User-Agent' => 'PressTechBot/1.0'])
                ->get($this->source->source_url);

            if (! $response->successful()) {
                return [
                    'content' => '',
                    'pages_found' => 1,
                    'pages_indexed' => 0,
                    'errors' => ["HTTP {$response->status()} for {$this->source->source_url}"],
                ];
            }

            $body = $response->body();
            $content = str_contains($response->header('Content-Type', ''), 'html')
                ? $this->stripHtml($body)
                : $body;

            return ['content' => Utf8::string($content), 'pages_found' => 1, 'pages_indexed' => 1, 'errors' => []];
        } catch (\Throwable $e) {
            return [
                'content' => '',
                'pages_found' => 1,
                'pages_indexed' => 0,
                'errors' => [Utf8::string($e->getMessage())],
            ];
        }
    }

    private function stripHtml(string $html): string
    {
        $html = preg_replace('/<(script|style|noscript)[^>]*>.*?<\/\1>/is', ' ', $html) ?? $html;

        return Utf8::string(trim(strip_tags($html)));
    }

    private function chunkText(string $text, int $size = 1000): array
    {
        if (empty(trim($text))) {
            return [];
        }

        $chunks = [];
        $length = strlen($text);

        for ($i = 0; $i < $length; $i += $size) {
            $chunks[] = substr($text, $i, $size);
        }

        return $chunks;
    }
}
