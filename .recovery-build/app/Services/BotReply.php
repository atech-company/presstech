<?php

namespace App\Services;

class BotReply
{
    /**
     * @param  list<array<string, mixed>>  $products
     */
    public function __construct(
        public readonly string $content,
        public readonly array $products = [],
    ) {}

    /**
     * @return array{content: string, products: list<array<string, mixed>>}
     */
    public function toArray(): array
    {
        return [
            'content' => $this->content,
            'products' => $this->products,
        ];
    }
}
