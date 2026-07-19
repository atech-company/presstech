<?php

namespace App\Services\Knowledge;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebsiteCrawler
{
    private const MAX_PAGES = 25;

    public function crawl(string $startUrl, string $type = 'website'): array
    {
        $startUrl = $this->normalizeUrl($startUrl);

        $urls = match ($type) {
            'sitemap' => $this->urlsFromSitemap($startUrl),
            default => $this->urlsFromWebsite($startUrl),
        };

        if (empty($urls)) {
            $urls = [$startUrl];
        }

        $sections = [];
        $errors = [];
        $products = [];

        foreach (array_slice(array_unique($urls), 0, self::MAX_PAGES) as $url) {
            $html = $this->fetchHtml($url);
            if (! $html) {
                $errors[] = "Failed to fetch: {$url}";

                continue;
            }

            foreach (app(ProductExtractor::class)->extractFromHtml($html, $url) as $product) {
                $products[] = $product;
            }

            $text = $this->htmlToText($html);
            if (strlen(trim($text)) < 40) {
                $errors[] = "No readable text: {$url}";

                continue;
            }

            $sections[] = "Source: {$url}\n\n{$text}";
        }

        return [
            'content' => implode("\n\n---\n\n", $sections),
            'pages_found' => count(array_unique($urls)),
            'pages_indexed' => count($sections),
            'errors' => $errors,
            'products' => $this->dedupeProducts($products),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $products
     * @return list<array<string, mixed>>
     */
    private function dedupeProducts(array $products): array
    {
        $seen = [];
        $result = [];

        foreach ($products as $product) {
            $key = mb_strtolower((string) ($product['name'] ?? ''));
            if ($key === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $result[] = $product;
        }

        return $result;
    }

    private function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://'.$url;
        }

        return $url;
    }

    private function urlsFromWebsite(string $startUrl): array
    {
        $parsed = parse_url($startUrl);
        if (! $parsed || empty($parsed['host'])) {
            return [$startUrl];
        }

        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'];
        $base = "{$scheme}://{$host}";

        $html = $this->fetchHtml($startUrl);
        if (! $html) {
            return [$startUrl];
        }

        $urls = [$startUrl];

        foreach ($this->discoverSitemapUrls($base) as $sitemapUrl) {
            foreach ($this->urlsFromSitemap($sitemapUrl) as $sitemapPage) {
                if (parse_url($sitemapPage, PHP_URL_HOST) === $host) {
                    $urls[] = $sitemapPage;
                }
            }
        }

        preg_match_all('/href=["\']([^"\']+)["\']/i', $html, $matches);

        foreach ($matches[1] ?? [] as $href) {
            $href = trim(html_entity_decode($href));
            if ($href === '' || str_starts_with($href, '#') || str_starts_with($href, 'mailto:') || str_starts_with($href, 'tel:') || str_starts_with($href, 'javascript:')) {
                continue;
            }

            if (str_starts_with($href, '//')) {
                $href = "{$scheme}:{$href}";
            } elseif (str_starts_with($href, '/')) {
                $href = $base.$href;
            } elseif (! str_starts_with($href, 'http')) {
                continue;
            }

            if (parse_url($href, PHP_URL_HOST) !== $host) {
                continue;
            }

            $path = parse_url($href, PHP_URL_PATH) ?? '';
            if (preg_match('/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|webp|ico|woff2?)$/i', $path)) {
                continue;
            }

            $urls[] = strtok($href, '#') ?: $href;
        }

        return array_values(array_unique($urls));
    }

    private function discoverSitemapUrls(string $base): array
    {
        $candidates = [
            rtrim($base, '/').'/sitemap.xml',
            rtrim($base, '/').'/sitemap_index.xml',
            rtrim($base, '/').'/wp-sitemap.xml',
        ];

        return array_values(array_filter($candidates, fn ($url) => (bool) $this->fetchHtml($url, headOnly: true)));
    }

    private function urlsFromSitemap(string $sitemapUrl): array
    {
        $xml = $this->fetchHtml($sitemapUrl);
        if (! $xml) {
            return [$sitemapUrl];
        }

        preg_match_all('/<loc>([^<]+)<\/loc>/i', $xml, $matches);

        $urls = array_values(array_filter(array_map('trim', $matches[1] ?? [])));

        if (preg_match('/sitemapindex/i', $xml)) {
            $nested = [];
            foreach (array_slice($urls, 0, 5) as $nestedSitemap) {
                $nested = array_merge($nested, $this->urlsFromSitemap($nestedSitemap));
            }

            return $nested;
        }

        return $urls;
    }

    private function fetchHtml(string $url, bool $headOnly = false): ?string
    {
        $attempts = [$this->normalizeUrl($url)];

        if (str_starts_with($attempts[0], 'https://')) {
            $attempts[] = 'http://'.substr($attempts[0], 8);
        }

        foreach ($attempts as $attemptUrl) {
            try {
                $request = Http::timeout(45)
                    ->withOptions(['allow_redirects' => true])
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (compatible; PressTechBot/1.0; +https://presstech.com)',
                        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language' => 'en-US,en;q=0.9',
                    ]);

                $response = $headOnly
                    ? $request->head($attemptUrl)
                    : $request->get($attemptUrl);

                if ($response->successful()) {
                    return $headOnly ? 'ok' : $response->body();
                }
            } catch (\Throwable $e) {
                Log::debug('Crawl fetch failed', ['url' => $attemptUrl, 'error' => $e->getMessage()]);
            }
        }

        return null;
    }

    private function htmlToText(string $html): string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $title)) {
            $html = '<h1>'.strip_tags($title[1])."</h1>\n".$html;
        }

        $html = preg_replace('/<(script|style|noscript|svg|iframe|nav|footer|header)[^>]*>.*?<\/\1>/is', ' ', $html) ?? $html;
        $html = preg_replace('/<!--.*?-->/s', ' ', $html) ?? $html;
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;

        return trim($text);
    }
}
