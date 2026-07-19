<?php

namespace App\Jobs;

use App\Models\KnowledgeChunk;
use App\Models\KnowledgeSource;
use App\Services\Knowledge\WebsiteCrawler;
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
            $result = $this->extractContent();

            if (empty(trim($result['content']))) {
                $hint = ! empty($result['errors'])
                    ? implode('; ', array_slice($result['errors'], 0, 3))
                    : 'No content could be extracted from this source.';
                throw new \RuntimeException($hint);
            }

            $this->source->chunks()->delete();

            $chunks = $this->chunkText($result['content']);
            $position = 0;

            foreach ($chunks as $chunk) {
                KnowledgeChunk::create([
                    'knowledge_source_id' => $this->source->id,
                    'content' => $chunk,
                    'position' => $position++,
                    'token_count' => (int) (strlen($chunk) / 4),
                ]);
            }

            $this->source->update([
                'status' => 'indexed',
                'chunk_count' => $position,
                'metadata' => array_merge($this->source->metadata ?? [], [
                    'indexed_at' => now()->toIso8601String(),
                    'content_length' => strlen($result['content']),
                    'pages_found' => $result['pages_found'] ?? null,
                    'pages_indexed' => $result['pages_indexed'] ?? null,
                    'crawl_errors' => $result['errors'] ?? [],
                    'products' => $result['products'] ?? [],
                    'product_count' => count($result['products'] ?? []),
                ]),
            ]);
        } catch (\Throwable $e) {
            $this->source->update([
                'status' => 'failed',
                'metadata' => array_merge($this->source->metadata ?? [], [
                    'error' => $e->getMessage(),
                    'failed_at' => now()->toIso8601String(),
                ]),
            ]);
        }
    }

    private function extractContent(): array
    {
        if ($this->source->file_path && Storage::disk('local')->exists($this->source->file_path)) {
            $content = Storage::disk('local')->get($this->source->file_path);

            return ['content' => $content, 'pages_found' => 1, 'pages_indexed' => 1, 'errors' => []];
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

            return ['content' => $content, 'pages_found' => 1, 'pages_indexed' => 1, 'errors' => []];
        } catch (\Throwable $e) {
            return [
                'content' => '',
                'pages_found' => 1,
                'pages_indexed' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    private function stripHtml(string $html): string
    {
        $html = preg_replace('/<(script|style|noscript)[^>]*>.*?<\/\1>/is', ' ', $html) ?? $html;

        return trim(strip_tags($html));
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
