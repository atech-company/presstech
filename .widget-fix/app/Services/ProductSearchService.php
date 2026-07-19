<?php

namespace App\Services;

use App\Models\Bot;
use App\Models\Conversation;
use App\Models\KnowledgeChunk;
use App\Models\KnowledgeSource;
use App\Models\TableDefinition;
use App\Models\TableRow;

class ProductSearchService
{
    public function shouldSearch(string $query, ?Conversation $conversation = null): bool
    {
        if ($this->isGreeting($query) || $this->isSmallTalk($query)) {
            return false;
        }

        if ($this->isProductQuery($query) || $this->isCardRequest($query)) {
            return true;
        }

        if ($conversation && ($this->isMediaFollowUp($query) || $this->isCardRequest($query))) {
            return $this->resolveSearchQuery($query, $conversation) !== $query;
        }

        return false;
    }

    public function wantsProductCards(string $query, ?Conversation $conversation = null): bool
    {
        if ($this->isGreeting($query) || $this->isSmallTalk($query)) {
            return false;
        }

        if ($this->isProductQuery($query) || $this->isCardRequest($query)) {
            return true;
        }

        if ($conversation && $this->isMediaFollowUp($query)) {
            return $this->resolveSearchQuery($query, $conversation) !== $query;
        }

        return false;
    }

    public function isGreeting(string $query): bool
    {
        $lower = mb_strtolower(trim($query));

        return (bool) preg_match(
            '/^(hi|hello|hey|hiya|howdy|good\s+(morning|afternoon|evening|day)|greetings|sup|yo)[!.?\s]*$/u',
            $lower
        );
    }

    public function isSmallTalk(string $query): bool
    {
        $lower = mb_strtolower(trim($query));

        return (bool) preg_match(
            '/^(thanks|thank\s+you|ok|okay|cool|great|nice|bye|goodbye|see\s+you)[!.?\s]*$/u',
            $lower
        );
    }

    public function isCardRequest(string $query): bool
    {
        $lower = mb_strtolower(trim($query));

        return (bool) preg_match(
            '/\b(cards?|catalog|info|details|images?|photos?|pictures?|pics?|show|list|stock|inventory|available)\b/',
            $lower
        );
    }

    public function isProductQuery(string $query): bool
    {
        $lower = mb_strtolower(trim($query));

        if ($lower === '') {
            return false;
        }

        $keywords = [
            'product', 'buy', 'price', 'cost', 'order', 'shop', 'catalog',
            'laptop', 'phone', 'item', 'model', 'sku', 'show me', 'looking for',
            'need', 'want', 'available', 'stock', 'offer', 'deal', 'thinkpad',
            'lenovo', 'dell', 'hp', 'macbook', 'inventory',
        ];

        foreach ($keywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return true;
            }
        }

        return preg_match('/\b[a-z]?\d{1,}[a-z]?\b/i', $query) === 1;
    }

    public function isMediaFollowUp(string $query): bool
    {
        $lower = mb_strtolower(trim($query));

        return (bool) preg_match('/\b(image|images|photo|photos|picture|pictures|pic|pics|show)\b/', $lower);
    }

    public function resolveSearchQuery(string $query, ?Conversation $conversation = null): string
    {
        if (! $conversation) {
            return $query;
        }

        $needsContext = $this->isMediaFollowUp($query) || $this->isCardRequest($query);
        if (! $needsContext) {
            return $query;
        }

        $history = $conversation->messages()
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['role', 'content']);

        foreach ($history as $message) {
            $content = trim($message->content);
            if ($message->role === 'user' && ! $this->isCardRequest($content) && ! $this->isMediaFollowUp($content) && mb_strlen($content) >= 2) {
                if ($this->isProductQuery($content) || preg_match('/\b(t\d+|thinkpad|lenovo)\b/i', $content)) {
                    return $content;
                }
            }
        }

        foreach ($history as $message) {
            if (preg_match('/\b(t\d+|thinkpad\s+t\d+|lenovo\s+thinkpad)\b/i', $message->content, $match)) {
                return $match[0];
            }
        }

        return $query;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function search(Bot $bot, string $query, int $limit = 6): array
    {
        $baseTerms = $this->terms($query);
        $terms = $this->expandTerms($baseTerms);
        if (empty($baseTerms)) {
            return [];
        }

        $products = array_merge(
            $this->searchStoredProducts($bot, $terms, $limit * 3),
            $this->searchTableProducts($bot, $terms, $limit * 3),
            $this->searchKnowledgeProducts($bot, $terms, $limit * 3),
        );

        // Rank with the user's words only — expanded synonyms must not become AND requirements
        $products = $this->rankAndLimit($products, $baseTerms, $limit);

        if (empty($products)) {
            $context = $this->fetchKnowledgeText($bot, $query, $terms);
            $products = $this->extractFromText($context, $query, $limit);
        }

        return $this->prepareForDisplay($this->enrichProducts($bot, $products));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function extractFromConversation(Bot $bot, Conversation $conversation, string $query, int $limit = 6): array
    {
        $text = $conversation->messages()
            ->orderBy('created_at')
            ->pluck('content')
            ->implode("\n\n");

        $products = $this->extractFromText($text, $query, $limit);

        return $this->prepareForDisplay($this->enrichProducts($bot, $products));
    }

    public function buildIntro(array $products, string $query): string
    {
        $name = $products[0]['name'] ?? 'this product';
        $count = count($products);

        if ($count === 1) {
            return "Here's what we have for {$name} — see the card below for specs, price, and photos:";
        }

        return "Here are {$count} matching products — browse the cards below for images, prices, and ordering:";
    }

    public function buildNotFoundMessage(string $query): string
    {
        $q = trim($query);
        if ($q === '') {
            return "I couldn't find that product in our catalog. Tell me another model or brand and I'll check again.";
        }

        return "I couldn't find \"{$q}\" in our current catalog. If you have another model name or brand, I can check again.";
    }

    public function looksLikeClarifyingQuestions(string $reply): bool
    {
        $lower = mb_strtolower($reply);

        return str_contains($lower, 'budget')
            || str_contains($lower, 'could you tell')
            || str_contains($lower, 'could you please')
            || str_contains($lower, 'let me know')
            || str_contains($lower, 'primary use')
            || str_contains($lower, 'preferred specs')
            || preg_match('/\d+\.\s+\*\*/', $reply) === 1;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function extractFromText(string $text, string $query, int $limit = 6): array
    {
        if (trim($text) === '') {
            return [];
        }

        $baseTerms = $this->terms($query);
        $terms = $this->expandTerms($baseTerms);
        $products = [];
        $sourceUrl = null;

        if (preg_match('/Source:\s*(https?:\/\/\S+)/i', $text, $match)) {
            $sourceUrl = trim($match[1]);
        }

        foreach ($this->parseInventoryListings($text, $sourceUrl) as $product) {
            if (! empty($baseTerms) && $this->matchesTerms($product, $baseTerms)) {
                $products[] = $product;
            }
        }

        foreach ($this->parseProductsFromChunk($text, $sourceUrl) as $product) {
            if (! empty($baseTerms) && $this->matchesTerms($product, $baseTerms)) {
                $products[] = $product;
            }
        }

        return $this->prepareForDisplay($this->rankAndLimit($products, $baseTerms, $limit));
    }

    /**
     * @param  list<string>  $terms
     * @return list<array<string, mixed>>
     */
    private function searchStoredProducts(Bot $bot, array $terms, int $limit): array
    {
        $sources = KnowledgeSource::query()
            ->where('workspace_id', $bot->workspace_id)
            ->where('status', 'indexed')
            ->where(function ($q) use ($bot) {
                $q->whereNull('bot_id')->orWhere('bot_id', $bot->id);
            })
            ->get(['metadata']);

        $products = [];
        foreach ($sources as $source) {
            $stored = $source->metadata['products'] ?? [];
            if (! is_array($stored)) {
                continue;
            }

            foreach ($stored as $product) {
                if (! is_array($product)) {
                    continue;
                }

                $normalized = $this->normalizeProductRecord($product);
                if ($normalized && $this->matchesTerms($normalized, $terms)) {
                    $products[] = $normalized;
                }
            }
        }

        return array_slice($products, 0, $limit);
    }

    /**
     * @param  list<string>  $terms
     * @return list<array<string, mixed>>
     */
    private function searchTableProducts(Bot $bot, array $terms, int $limit): array
    {
        $settings = $bot->settings ?? [];
        $tableId = $settings['products_table_id'] ?? null;

        $tableQuery = TableDefinition::query()->where('workspace_id', $bot->workspace_id);

        if ($tableId) {
            $tableQuery->where('id', $tableId);
        } else {
            $tableQuery->where(function ($q) {
                $q->where('slug', 'products')
                    ->orWhere('slug', 'catalog')
                    ->orWhere('name', 'like', '%product%');
            });
        }

        $tables = $tableQuery->with('rows')->limit(3)->get();
        $products = [];

        foreach ($tables as $table) {
            foreach ($table->rows as $row) {
                $normalized = $this->normalizeTableRow($row->data ?? [], $row->id);
                if ($normalized && $this->matchesTerms($normalized, $terms)) {
                    $products[] = $normalized;
                }
            }
        }

        return array_slice($products, 0, $limit);
    }

    /**
     * @param  list<string>  $terms
     * @return list<array<string, mixed>>
     */
    private function searchKnowledgeProducts(Bot $bot, array $terms, int $limit): array
    {
        $chunks = $this->matchingChunks($bot, $terms);
        $products = [];

        foreach ($chunks as $chunk) {
            $sourceUrl = null;
            if (preg_match('/^Source:\s*(https?:\/\/\S+)/im', $chunk, $match)) {
                $sourceUrl = trim($match[1]);
            }

            foreach ($this->parseInventoryListings($chunk, $sourceUrl) as $product) {
                if ($this->matchesTerms($product, $terms)) {
                    $products[] = $product;
                }
            }

            foreach ($this->parseProductsFromChunk($chunk, $sourceUrl) as $product) {
                if ($this->matchesTerms($product, $terms)) {
                    $products[] = $product;
                }
            }
        }

        return array_slice($products, 0, $limit);
    }

    /**
     * @param  list<string>  $terms
     * @return list<string>
     */
    private function matchingChunks(Bot $bot, array $terms): array
    {
        $chunkQuery = KnowledgeChunk::query()
            ->whereHas('source', function ($q) use ($bot) {
                $q->where('workspace_id', $bot->workspace_id)
                    ->where('status', 'indexed')
                    ->where(function ($inner) use ($bot) {
                        $inner->whereNull('bot_id')->orWhere('bot_id', $bot->id);
                    });
            });

        if (! empty($terms)) {
            $chunkQuery->where(function ($q) use ($terms) {
                foreach (array_slice($terms, 0, 8) as $term) {
                    $q->orWhere('content', 'like', '%'.$term.'%');
                }
            });
        }

        return $chunkQuery->limit(12)->pluck('content')->all();
    }

    private function fetchKnowledgeText(Bot $bot, string $query, ?array $terms = null): string
    {
        $terms = $terms ?? $this->expandTerms($this->terms($query));

        return implode("\n\n---\n\n", $this->matchingChunks($bot, $terms));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseInventoryListings(string $content, ?string $sourceUrl = null): array
    {
        $products = [];

        $patterns = [
            '/\*\*((?:Used\s+)?[^*\n]{5,120}?)\*\*[^\n$]{0,300}?(?:Price|price)\s*:?\s*[\$€£]?\s*([\d,]+(?:\.\d{2})?)/iu',
            '/((?:Used\s+)?(?:Lenovo|Dell|HP|Asus|Apple|Microsoft)\s+[^\n$]{5,100}?)\s*(?:[-–—]\s*)?(?:Price|price)\s*:?\s*(?:USD\s*)?[\$€£]?\s*([\d,]+(?:\.\d{2})?)/iu',
            '/((?:Used\s+)?ThinkPad\s+T\d+[^\n$]{0,100}?)\s*(?:[-–—]\s*)?(?:Price|price)\s*:?\s*(?:USD\s*)?[\$€£]?\s*([\d,]+(?:\.\d{2})?)/iu',
            '/((?:Used\s+)?[^\n]{8,100}?ThinkPad[^\n]{0,60})\s+[\$€£]\s*([\d,]+(?:\.\d{2})?)/iu',
            '/([A-Z][^\n]{10,100}?)\s+-\s+([\d,]+(?:\.\d{2})?)\s*(?:USD|usd|\$)/u',
        ];

        foreach ($patterns as $pattern) {
            if (! preg_match_all($pattern, $content, $matches, PREG_SET_ORDER)) {
                continue;
            }

            foreach ($matches as $match) {
                $name = trim(preg_replace('/\s+/', ' ', $match[1]) ?? $match[1]);
                $name = str_replace('**', '', $name);
                $price = (float) str_replace(',', '', $match[2]);
                $description = $this->extractDescriptionNear($content, $name);

                $product = $this->normalizeProductRecord([
                    'name' => $name,
                    'price' => $price,
                    'description' => $description,
                    'image_url' => $this->findImageInText($content, $name),
                    'url' => $sourceUrl,
                ], $sourceUrl);

                if ($product) {
                    $products[] = $product;
                }
            }
        }

        if (preg_match_all('/ThinkPad\s+T\d+/i', $content, $modelMatches)) {
            foreach (array_unique($modelMatches[0]) as $model) {
                $price = null;
                if (preg_match('/'.preg_quote($model, '/').'[^\n$]{0,200}?[\$€£]\s*([\d,]+(?:\.\d{2})?)/is', $content, $priceMatch)) {
                    $price = (float) str_replace(',', '', $priceMatch[1]);
                } elseif (preg_match('/'.preg_quote($model, '/').'[^\n]{0,200}?(?:Price|price)\s*:?\s*[\$€£]?\s*([\d,]+(?:\.\d{2})?)/is', $content, $priceMatch)) {
                    $price = (float) str_replace(',', '', $priceMatch[1]);
                }

                $name = 'Lenovo '.ucwords(strtolower($model));
                if (preg_match('/((?:Used\s+)?Lenovo\s+'.preg_quote($model, '/').'[^\n$]{0,80})/i', $content, $nameMatch)) {
                    $name = trim($nameMatch[1]);
                }

                $product = $this->normalizeProductRecord([
                    'name' => $name,
                    'price' => $price,
                    'description' => $this->extractDescriptionNear($content, $model),
                    'image_url' => $this->findImageInText($content, $model),
                    'url' => $sourceUrl,
                ], $sourceUrl);

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
    private function parseProductsFromChunk(string $content, ?string $sourceUrl = null): array
    {
        $products = [];

        if (preg_match('/```json\s*(\{.*?\}|\[.*?\])\s*```/is', $content, $match)) {
            $decoded = json_decode($match[1], true);
            if (is_array($decoded)) {
                $items = isset($decoded[0]) ? $decoded : [$decoded];
                foreach ($items as $item) {
                    if (is_array($item)) {
                        $normalized = $this->normalizeProductRecord($item, $sourceUrl);
                        if ($normalized) {
                            $products[] = $normalized;
                        }
                    }
                }
            }
        }

        return $products;
    }

    private function extractDescriptionNear(string $content, string $needle): ?string
    {
        $pos = mb_stripos($content, $needle);
        if ($pos === false) {
            return null;
        }

        $snippet = mb_substr($content, $pos, 280);
        $snippet = preg_replace('/\s+/', ' ', $snippet) ?? $snippet;

        return mb_substr(trim($snippet), 0, 220) ?: null;
    }

    private function findImageInText(string $content, string $needle): ?string
    {
        $pos = mb_stripos($content, $needle);
        $window = $pos !== false
            ? mb_substr($content, max(0, $pos - 400), 1200)
            : $content;

        if (preg_match('/(https?:\/\/[^\s"\']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"\']*)?)/i', $window, $match)) {
            return $match[1];
        }

        if (preg_match('/(https?:\/\/[^\s"\']+\/wp-content\/uploads\/[^\s"\']+)/i', $window, $match)) {
            return $match[1];
        }

        return null;
    }

    /**
     * @param  list<array<string, mixed>>  $products
     * @return list<array<string, mixed>>
     */
    public function prepareForDisplay(array $products): array
    {
        $cleaned = [];

        foreach ($products as $product) {
            $name = $this->cleanProductName((string) ($product['name'] ?? ''));
            if ($name === '' || $this->isJunkProductName($name)) {
                continue;
            }

            $product['name'] = $name;
            if (! empty($product['description'])) {
                $product['description'] = $this->cleanDescription((string) $product['description']);
            }

            $key = mb_strtolower(preg_replace('/\s+/', ' ', $name) ?? $name);
            if (isset($cleaned[$key])) {
                $existing = $cleaned[$key];
                if (empty($existing['image_url']) && ! empty($product['image_url'])) {
                    $cleaned[$key] = $product;
                } elseif (empty($existing['price']) && ! empty($product['price'])) {
                    $cleaned[$key] = array_merge($existing, array_filter([
                        'price' => $product['price'],
                        'image_url' => $product['image_url'] ?? null,
                        'url' => $product['url'] ?? null,
                    ]));
                }

                continue;
            }

            $cleaned[$key] = $product;
        }

        $result = array_values($cleaned);
        usort($result, fn (array $a, array $b) => $this->displayScore($b) <=> $this->displayScore($a));

        return $result;
    }

    /**
     * @param  array<string, mixed>  $product
     */
    private function displayScore(array $product): int
    {
        $score = 0;

        if (! empty($product['image_url'])) {
            $score += 50;
        }
        if (! empty($product['price'])) {
            $score += 20;
        }
        if (! empty($product['url'])) {
            $score += 10;
        }

        $name = (string) ($product['name'] ?? '');
        if (mb_strlen($name) <= 80) {
            $score += 10;
        }

        return $score;
    }

    /**
     * @param  list<array<string, mixed>>  $products
     * @return list<array<string, mixed>>
     */
    private function enrichProducts(Bot $bot, array $products): array
    {
        if (empty($products)) {
            return [];
        }

        $storedProducts = $this->collectStoredProducts($bot);
        $imagePool = $this->collectImageUrls($bot);

        return array_map(function (array $product) use ($storedProducts, $imagePool) {
            if (empty($product['image_url'])) {
                $product['image_url'] = $this->matchImageForProduct($product, $storedProducts, $imagePool);
            }

            if (empty($product['url'])) {
                foreach ($storedProducts as $stored) {
                    $storedName = mb_strtolower((string) ($stored['name'] ?? ''));
                    $productName = mb_strtolower((string) ($product['name'] ?? ''));
                    if ($storedName !== '' && ($storedName === $productName || str_contains($productName, $storedName)) && ! empty($stored['url'])) {
                        $product['url'] = $stored['url'];
                        break;
                    }
                }
            }

            if (empty($product['order_url']) && ! empty($product['url'])) {
                $product['order_url'] = $product['url'];
            }

            return $product;
        }, $products);
    }

    /**
     * @param  array<string, mixed>  $product
     * @param  list<array<string, mixed>>  $storedProducts
     * @param  list<string>  $imagePool
     */
    private function matchImageForProduct(array $product, array $storedProducts, array $imagePool): ?string
    {
        $productName = mb_strtolower((string) ($product['name'] ?? ''));

        foreach ($storedProducts as $stored) {
            $storedName = mb_strtolower((string) ($stored['name'] ?? ''));
            if ($storedName === '' || empty($stored['image_url'])) {
                continue;
            }

            if ($storedName === $productName
                || str_contains($productName, $storedName)
                || str_contains($storedName, $productName)) {
                return $stored['image_url'];
            }

            if (preg_match('/t\d+/i', $productName, $model) && str_contains($storedName, strtolower($model[0]))) {
                return $stored['image_url'];
            }
        }

        foreach ($imagePool as $image) {
            $imageLower = mb_strtolower($image);
            if (preg_match('/t(\d+)/i', $productName, $model) && str_contains($imageLower, 't'.$model[1])) {
                return $image;
            }
            if (str_contains($productName, 'thinkpad') && str_contains($imageLower, 'thinkpad')) {
                return $image;
            }
        }

        return null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function collectStoredProducts(Bot $bot): array
    {
        $sources = KnowledgeSource::query()
            ->where('workspace_id', $bot->workspace_id)
            ->where('status', 'indexed')
            ->where(function ($q) use ($bot) {
                $q->whereNull('bot_id')->orWhere('bot_id', $bot->id);
            })
            ->get(['metadata']);

        $products = [];
        foreach ($sources as $source) {
            foreach ($source->metadata['products'] ?? [] as $product) {
                if (is_array($product)) {
                    $normalized = $this->normalizeProductRecord($product);
                    if ($normalized) {
                        $products[] = $normalized;
                    }
                }
            }
        }

        return $products;
    }

    /**
     * @return list<string>
     */
    private function collectImageUrls(Bot $bot): array
    {
        $chunks = KnowledgeChunk::query()
            ->whereHas('source', function ($q) use ($bot) {
                $q->where('workspace_id', $bot->workspace_id)->where('status', 'indexed');
            })
            ->limit(20)
            ->pluck('content');

        $images = [];
        foreach ($chunks as $content) {
            if (preg_match_all('/(https?:\/\/[^\s"\']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"\']*)?)/i', $content, $matches)) {
                foreach ($matches[1] as $url) {
                    $images[] = $url;
                }
            }
        }

        $sources = KnowledgeSource::query()
            ->where('workspace_id', $bot->workspace_id)
            ->where('status', 'indexed')
            ->get(['metadata']);

        foreach ($sources as $source) {
            foreach ($source->metadata['products'] ?? [] as $product) {
                if (is_array($product) && ! empty($product['image_url'])) {
                    $images[] = $product['image_url'];
                }
            }
        }

        return array_values(array_unique($images));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function normalizeTableRow(array $data, string $rowId): ?array
    {
        return $this->normalizeProductRecord([
            'id' => $rowId,
            'name' => $data['name'] ?? $data['title'] ?? $data['product_name'] ?? $data['product'] ?? null,
            'description' => $data['description'] ?? $data['details'] ?? null,
            'price' => $data['price'] ?? $data['amount'] ?? $data['cost'] ?? null,
            'currency' => $data['currency'] ?? null,
            'image_url' => $data['image_url'] ?? $data['image'] ?? $data['photo'] ?? null,
            'url' => $data['url'] ?? $data['link'] ?? $data['product_url'] ?? null,
            'order_url' => $data['order_url'] ?? $data['checkout_url'] ?? $data['buy_url'] ?? null,
            'sku' => $data['sku'] ?? $data['code'] ?? null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $raw
     */
    private function normalizeProductRecord(array $raw, ?string $fallbackUrl = null): ?array
    {
        $name = trim((string) ($raw['name'] ?? $raw['title'] ?? ''));
        $name = $this->cleanProductName(str_replace('**', '', $name));
        $name = preg_replace('/^(Source|Price|Used)\s*:?\s*/i', '', $name) ?? $name;
        $name = trim($name, " -:\t\n\r");

        if ($name === '' || strlen($name) < 3 || mb_strlen($name) > 120 || $this->isJunkProductName($name)) {
            return null;
        }

        $url = trim((string) ($raw['url'] ?? $raw['link'] ?? $raw['product_url'] ?? $fallbackUrl ?? ''));
        $orderUrl = trim((string) ($raw['order_url'] ?? $raw['buy_url'] ?? $url));
        $price = $raw['price'] ?? null;
        $price = is_numeric($price) ? (float) $price : null;

        return [
            'id' => (string) ($raw['id'] ?? md5(mb_strtolower($name.'|'.$url))),
            'name' => $name,
            'description' => isset($raw['description']) ? mb_substr(trim((string) $raw['description']), 0, 280) : null,
            'price' => $price,
            'currency' => strtoupper((string) ($raw['currency'] ?? 'USD')),
            'image_url' => $raw['image_url'] ?? $raw['image'] ?? null,
            'url' => $url !== '' ? $url : null,
            'order_url' => $orderUrl !== '' ? $orderUrl : null,
            'sku' => isset($raw['sku']) ? (string) $raw['sku'] : null,
        ];
    }

    private function cleanProductName(string $name): string
    {
        $name = str_replace('**', '', $name);
        $name = preg_replace('/^in\s+used\s+laptops\s*/i', '', $name) ?? $name;
        $name = preg_replace('/^used\s+laptops\s*/i', '', $name) ?? $name;
        $name = preg_replace('/\s+add to cart.*$/i', '', $name) ?? $name;
        $name = preg_replace('/\s+original price was:.*$/i', '', $name) ?? $name;
        $name = preg_replace('/\s+current price is:.*$/i', '', $name) ?? $name;
        $name = preg_replace('/\s+quick view.*$/i', '', $name) ?? $name;
        $name = preg_replace('/^[\$€£]\s*[\d,.]+\s*/', '', $name) ?? $name;
        $name = preg_replace('/\s+/', ' ', $name) ?? $name;

        return trim($name, " -\t\n\r");
    }

    private function cleanDescription(string $description): string
    {
        $description = preg_replace('/\s+add to cart.*$/i', '', $description) ?? $description;
        $description = preg_replace('/original price was:.*?current price is:/i', '', $description) ?? $description;
        $description = preg_replace('/\s+/', ' ', $description) ?? $description;

        return mb_substr(trim($description), 0, 160);
    }

    private function isJunkProductName(string $name): bool
    {
        $lower = mb_strtolower(trim($name));

        if ($name === '' || mb_strlen($name) < 5) {
            return true;
        }

        if (preg_match('/^[\$€£]\s*[\d,.]+$/', $name)) {
            return true;
        }

        // Homepage / crawl noise frequently stored as "products"
        $junkExact = [
            'product', 'products', 'home', 'homepage', 'shop', 'store', 'catalog',
            'the power of technology', 'electroslab', 'welcome', 'about us',
        ];
        if (in_array($lower, $junkExact, true)) {
            return true;
        }

        if (preg_match('/\b(tech hub|powering every project|steam kits)\b/i', $name)) {
            return true;
        }

        $junk = [
            'add to cart', 'quick view', 'wishlist', 'compare', 'original price was',
            'current price is', 'in used laptops', 'sku:', 'sale ',
        ];

        foreach ($junk as $phrase) {
            if (str_starts_with($lower, $phrase)) {
                return true;
            }
        }

        return (bool) preg_match('/^(in\s+)?used\s+laptops$/i', $name);
    }

    /**
     * @param  array<string, mixed>  $product
     * @param  list<string>  $terms
     */
    private function matchesTerms(array $product, array $terms): bool
    {
        return $this->score($product, $terms) >= $this->minAcceptScore($terms);
    }

    /**
     * @param  list<string>  $terms
     */
    private function minAcceptScore(array $terms): int
    {
        $significant = $this->significantTerms($terms);
        $specific = array_values(array_filter($significant, fn (string $t) => $this->isSpecificTerm($t)));

        // Brand/model queries must hit the product name strongly
        if (! empty($specific)) {
            return 40;
        }

        // Generic category ("laptop") must still match the name, not only a site blurb
        return 25;
    }

    /**
     * @param  list<array<string, mixed>>  $products
     * @param  list<string>  $terms
     * @return list<array<string, mixed>>
     */
    private function rankAndLimit(array $products, array $terms, int $limit): array
    {
        $unique = [];
        foreach ($products as $product) {
            $key = (string) ($product['id'] ?? $product['name']);
            $unique[$key] = $product;
        }

        $minScore = $this->minAcceptScore($terms);
        $ranked = array_values(array_filter(
            $unique,
            fn (array $product) => $this->score($product, $terms) >= $minScore
        ));

        usort($ranked, function (array $a, array $b) use ($terms) {
            return $this->score($b, $terms) <=> $this->score($a, $terms);
        });

        return array_slice($ranked, 0, $limit);
    }

    /**
     * @param  array<string, mixed>  $product
     * @param  list<string>  $terms
     */
    private function score(array $product, array $terms): int
    {
        $significant = $this->significantTerms($terms);
        if ($significant === []) {
            return 0;
        }

        $name = mb_strtolower((string) ($product['name'] ?? ''));
        $description = mb_strtolower((string) ($product['description'] ?? ''));
        $sku = mb_strtolower((string) ($product['sku'] ?? ''));
        $haystack = trim($name.' '.$description.' '.$sku);

        $specific = array_values(array_filter($significant, fn (string $t) => $this->isSpecificTerm($t)));
        $generic = array_values(array_filter($significant, fn (string $t) => ! $this->isSpecificTerm($t)));

        $score = 0;
        $nameHits = 0;

        // Brand / model terms must appear in the product name (or SKU), not only site copy
        foreach ($specific as $term) {
            $inName = $this->termInText($name, $term);
            $inSku = $this->termInText($sku, $term);
            if (! $inName && ! $inSku) {
                return 0;
            }
            $score += $inName ? 40 : 25;
            if ($inName) {
                $nameHits++;
            }
        }

        foreach ($generic as $term) {
            if ($this->termInText($name, $term)) {
                $score += 25;
                $nameHits++;
            } elseif ($this->termInText($description, $term)) {
                // Description-only category words are weak and easily match homepage junk
                $score += 2;
            }
        }

        if ($nameHits === 0) {
            return 0;
        }

        if (! empty($product['image_url'])) {
            $score += 3;
        }
        if (! empty($product['price'])) {
            $score += 2;
        }

        return $score;
    }

    private function termInText(string $text, string $term): bool
    {
        if ($text === '' || $term === '') {
            return false;
        }

        if (str_contains($text, $term)) {
            return true;
        }

        if (preg_match('/^t\d+$/i', $term)) {
            return str_contains($text, 'thinkpad '.$term)
                || str_contains($text, 'thinkpad'.strtolower($term));
        }

        if ($term === 'apple') {
            return (bool) preg_match('/\b(macbook|imac|iphone|ipad|mac\s?mini|airpods|\bmac\b)/i', $text);
        }

        if ($term === 'lenovo') {
            return str_contains($text, 'thinkpad')
                || str_contains($text, 'ideapad')
                || str_contains($text, 'yoga');
        }

        return false;
    }

    private function isSpecificTerm(string $term): bool
    {
        if (preg_match('/^t\d+$/i', $term)) {
            return true;
        }

        // Model-like tokens: macbook, esp8266, i7, rtx3060
        if (preg_match('/^(macbook|imac|iphone|ipad|thinkpad|surface|yoga|ideapad|inspiron|latitude|elitebook|pavilion|rog|tuf)/i', $term)) {
            return true;
        }

        if (preg_match('/^[a-z]{1,6}\d{1,5}[a-z0-9]*$/i', $term) && strlen($term) >= 2) {
            return true;
        }

        $brands = [
            'apple', 'lenovo', 'dell', 'hp', 'asus', 'acer', 'msi', 'razer',
            'samsung', 'microsoft', 'sony', 'lg', 'huawei', 'xiaomi',
        ];

        return in_array($term, $brands, true);
    }

    /**
     * @param  list<string>  $terms
     * @return list<string>
     */
    private function significantTerms(array $terms): array
    {
        $out = [];
        foreach ($terms as $term) {
            $term = mb_strtolower(trim($term));
            if ($term === '' || $this->isStopword($term)) {
                continue;
            }
            $out[] = $term;
        }

        return array_values(array_unique($out));
    }

    private function isStopword(string $word): bool
    {
        static $stop = null;
        if ($stop === null) {
            $stop = array_flip([
                'i', 'a', 'an', 'the', 'me', 'my', 'please', 'hi', 'hello', 'hey',
                'do', 'you', 'your', 'our', 'we', 'us', 'they', 'them', 'it',
                'have', 'has', 'had', 'having', 'got', 'get', 'getting',
                'any', 'some', 'something', 'anything', 'everything',
                'looking', 'look', 'for', 'with', 'from', 'about', 'into',
                'need', 'needs', 'want', 'wanna', 'wants', 'show', 'list',
                'can', 'could', 'would', 'should', 'is', 'are', 'was', 'were', 'be', 'been', 'im', "i'm",
                'of', 'to', 'in', 'on', 'or', 'and', 'as', 'at', 'by',
                'like', 'tell', 'what', 'which', 'where', 'who', 'how', 'why',
                'mean', 'also', 'still', 'there', 'these', 'those', 'this', 'that',
                'info', 'information', 'details', 'please', 'pls', 'plz',
                'buy', 'price', 'cost', 'order', 'available', 'stock', 'offer',
                'product', 'products', 'item', 'items', 'model', 'one', 'pro',
            ]);
        }

        return isset($stop[$word]);
    }

    /**
     * @param  list<string>  $terms
     * @return list<string>
     */
    private function expandTerms(array $terms): array
    {
        $expanded = $terms;

        foreach ($terms as $term) {
            if (preg_match('/^t(\d+)$/i', $term, $m)) {
                $expanded[] = 'thinkpad t'.$m[1];
                $expanded[] = 'thinkpad';
            }
        }

        return array_values(array_unique($expanded));
    }

    /**
     * @return list<string>
     */
    private function terms(string $query): array
    {
        $normalized = mb_strtolower(trim($query));
        $normalized = preg_replace('/[^\p{L}\p{N}\s\-+]/u', ' ', $normalized) ?? $normalized;
        $words = preg_split('/\s+/', $normalized) ?: [];
        $terms = [];

        foreach ($words as $word) {
            $word = trim($word, "- \t\n\r");
            if ($word === '' || $this->isStopword($word)) {
                continue;
            }
            if (strlen($word) >= 2 || preg_match('/^t\d+$/i', $word)) {
                $terms[] = $word;
            }
        }

        return array_values(array_unique($terms));
    }
}
