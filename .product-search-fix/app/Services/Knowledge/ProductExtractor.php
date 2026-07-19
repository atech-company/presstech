<?php

namespace App\Services\Knowledge;

use App\Support\Utf8;

class ProductExtractor
{
    /**
     * @return list<array<string, mixed>>
     */
    public function extractFromHtml(string $html, string $pageUrl): array
    {
        $products = [];

        foreach ($this->extractJsonLdProducts($html, $pageUrl) as $product) {
            $products[] = $product;
        }

        $ogProduct = $this->extractOpenGraphProduct($html, $pageUrl);
        if ($ogProduct) {
            $products[] = $ogProduct;
        }

        $pageProduct = $this->extractFromPageContent($html, $pageUrl);
        if ($pageProduct) {
            $products[] = $pageProduct;
        }

        foreach ($this->extractWooCommerceProducts($html, $pageUrl) as $product) {
            $products[] = $product;
        }

        return $this->dedupeProducts($products);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function extractWooCommerceProducts(string $html, string $pageUrl): array
    {
        $products = [];

        if (! preg_match_all(
            '/<li[^>]*class=["\'][^"\']*product[^"\']*["\'][^>]*>(.*?)<\/li>/is',
            $html,
            $items
        )) {
            return $products;
        }

        foreach ($items[1] as $item) {
            $name = null;
            if (preg_match('/class=["\'][^"\']*woocommerce-loop-product__title[^"\']*["\'][^>]*>(.*?)<\//is', $item, $m)) {
                $name = trim(strip_tags($m[1]));
            } elseif (preg_match('/<h2[^>]*class=["\'][^"\']*woocommerce-loop-product__title[^"\']*["\'][^>]*>(.*?)<\/h2>/is', $item, $m)) {
                $name = trim(strip_tags($m[1]));
            }

            $price = null;
            if (preg_match('/class=["\'][^"\']*woocommerce-Price-amount[^"\']*["\'][^>]*>.*?([\d,.]+)/is', $item, $m)) {
                $price = str_replace(',', '', $m[1]);
            }

            $image = null;
            if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $item, $m)) {
                $image = $m[1];
            }

            $url = $pageUrl;
            if (preg_match('/<a[^>]+href=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*woocommerce-LoopProduct-link/i', $item, $m)) {
                $url = $m[1];
            } elseif (preg_match('/<a[^>]+href=["\']([^"\']+)["\']/i', $item, $m)) {
                $url = $m[1];
            }

            $product = $this->normalizeProduct([
                'name' => $name,
                'price' => $price,
                'image' => $image,
                'url' => $url,
            ], $pageUrl);

            if ($product) {
                $products[] = $product;
            }
        }

        return $products;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function extractJsonLdProducts(string $html, string $pageUrl): array
    {
        $products = [];

        if (! preg_match_all('/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $matches)) {
            return $products;
        }

        foreach ($matches[1] as $json) {
            $decoded = json_decode(trim($json), true);
            if (! is_array($decoded)) {
                continue;
            }

            foreach ($this->flattenJsonLd($decoded) as $node) {
                $type = $node['@type'] ?? null;
                if (! is_string($type) || ! str_contains(strtolower($type), 'product')) {
                    continue;
                }

                $product = $this->normalizeProduct([
                    'name' => $node['name'] ?? null,
                    'description' => $node['description'] ?? null,
                    'image' => $node['image'] ?? null,
                    'url' => $node['url'] ?? $pageUrl,
                    'offers' => $node['offers'] ?? null,
                    'sku' => $node['sku'] ?? null,
                ], $pageUrl);

                if ($product) {
                    $products[] = $product;
                }
            }
        }

        return $products;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function flattenJsonLd(array $node): array
    {
        if (isset($node['@graph']) && is_array($node['@graph'])) {
            return $node['@graph'];
        }

        if (isset($node[0]) && is_array($node[0])) {
            return $node;
        }

        return [$node];
    }

    private function extractOpenGraphProduct(string $html, string $pageUrl): ?array
    {
        $title = $this->metaContent($html, 'og:title') ?? $this->tagContent($html, 'title');
        $image = $this->metaContent($html, 'og:image');
        $description = $this->metaContent($html, 'og:description') ?? $this->metaContent($html, 'description');
        $price = $this->metaContent($html, 'product:price:amount')
            ?? $this->metaContent($html, 'og:price:amount');
        $currency = $this->metaContent($html, 'product:price:currency')
            ?? $this->metaContent($html, 'og:price:currency');

        if (! $price) {
            $price = $this->findPriceInText(strip_tags($html));
        }

        if (! $title) {
            return null;
        }

        return $this->normalizeProduct([
            'name' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $this->metaContent($html, 'og:url') ?? $pageUrl,
            'price' => $price,
            'currency' => $currency,
        ], $pageUrl);
    }

    private function extractFromPageContent(string $html, string $pageUrl): ?array
    {
        $title = null;
        if (preg_match('/<h1[^>]*>(.*?)<\/h1>/is', $html, $match)) {
            $title = trim(strip_tags($match[1]));
        }

        $image = null;
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $match)) {
            $image = $this->resolveUrl($match[1], $pageUrl);
        }

        $text = strip_tags($html);
        $price = $this->findPriceInText($text);

        if (! $title && ! $price) {
            return null;
        }

        $description = null;
        if (preg_match('/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $match)) {
            $description = html_entity_decode($match[1]);
        }

        return $this->normalizeProduct([
            'name' => $title ?? 'Product',
            'description' => $description,
            'image' => $image,
            'url' => $pageUrl,
            'price' => $price,
        ], $pageUrl);
    }

    /**
     * @param  array<string, mixed>  $raw
     */
    private function normalizeProduct(array $raw, string $fallbackUrl): ?array
    {
        $name = trim((string) ($raw['name'] ?? ''));
        $name = preg_replace('/[\r\n\t]+/', ' ', $name) ?? $name;
        $name = preg_replace('/\s+/', ' ', $name) ?? $name;
        $name = trim($name);

        if ($name === '' || strlen($name) < 2) {
            return null;
        }

        // Reject category / store listing titles
        if (preg_match('/^(laptops?|macbooks?|phones?|tablets?|printers?|products?)\s*[-–—|:]/i', $name)) {
            return null;
        }
        if (preg_match('/^(product|home|welcome|shop|store)$/i', $name)) {
            return null;
        }
        if (mb_strlen($name) > 90 || preg_match('/\b(add to cart|original price was)\b/i', $name)) {
            return null;
        }

        $image = $raw['image'] ?? null;
        if (is_array($image)) {
            $image = $image['url'] ?? $image[0] ?? null;
        }

        $price = $raw['price'] ?? null;
        $currency = $raw['currency'] ?? null;

        if (isset($raw['offers']) && is_array($raw['offers'])) {
            $offers = isset($raw['offers'][0]) ? $raw['offers'][0] : $raw['offers'];
            $price = $price ?? ($offers['price'] ?? $offers['lowPrice'] ?? null);
            $currency = $currency ?? ($offers['priceCurrency'] ?? null);
        }

        $url = trim((string) ($raw['url'] ?? $fallbackUrl));
        $description = trim((string) ($raw['description'] ?? ''));

        return [
            'id' => md5(mb_strtolower($name.'|'.$url)),
            'name' => Utf8::string($name),
            'description' => $description !== '' ? Utf8::string(mb_substr($description, 0, 280)) : null,
            'price' => $this->normalizePrice($price),
            'currency' => $currency ? strtoupper((string) $currency) : 'USD',
            'image_url' => $image ? $this->resolveUrl((string) $image, $fallbackUrl) : null,
            'url' => $this->resolveUrl($url, $fallbackUrl),
            'order_url' => $this->resolveUrl($url, $fallbackUrl),
            'sku' => isset($raw['sku']) ? Utf8::string((string) $raw['sku']) : null,
        ];
    }

    private function metaContent(string $html, string $property): ?string
    {
        $patterns = [
            '/<meta[^>]+(?:property|name)=["\']'.preg_quote($property, '/').'["\'][^>]+content=["\']([^"\']+)["\']/i',
            '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']'.preg_quote($property, '/').'["\']/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $match)) {
                return html_entity_decode(trim($match[1]));
            }
        }

        return null;
    }

    private function tagContent(string $html, string $tag): ?string
    {
        if (preg_match('/<'.$tag.'[^>]*>(.*?)<\/'.$tag.'>/is', $html, $match)) {
            return trim(strip_tags($match[1]));
        }

        return null;
    }

    private function findPriceInText(string $text): ?float
    {
        $patterns = [
            '/(?:USD|SAR|AED|EUR|GBP|\$|€|£)\s*([\d,]+(?:\.\d{2})?)/i',
            '/([\d,]+(?:\.\d{2})?)\s*(?:USD|SAR|AED|EUR|GBP)/i',
            '/\b([\d,]+\.\d{2})\b/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $match)) {
                return $this->normalizePrice($match[1]);
            }
        }

        return null;
    }

    private function normalizePrice(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $numeric = (float) str_replace(',', '', (string) $value);

        return $numeric > 0 ? $numeric : null;
    }

    private function resolveUrl(string $url, string $base): string
    {
        $url = trim(html_entity_decode($url));

        if ($url === '' || str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        if (str_starts_with($url, '//')) {
            $scheme = parse_url($base, PHP_URL_SCHEME) ?? 'https';

            return $scheme.':'.$url;
        }

        $parts = parse_url($base);
        if (! $parts || empty($parts['host'])) {
            return $url;
        }

        $origin = ($parts['scheme'] ?? 'https').'://'.$parts['host'];

        return str_starts_with($url, '/') ? $origin.$url : rtrim($origin, '/').'/'.$url;
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
}
