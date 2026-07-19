"use client";

import { ExternalLink, ShoppingBag } from "lucide-react";
import type { WidgetProduct } from "@/features/widget/types";
import { cn } from "@/lib/utils";

function formatPrice(price?: number | null, currency?: string | null) {
  if (price == null) return null;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency ?? "USD"} ${price.toFixed(2)}`;
  }
}

function looksLikeNoise(text: string, name: string) {
  const t = text.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (!t || t === n) return true;
  if (/^\$?\d/.test(t)) return true;
  if (/(\$\s*[\d,.]+){2,}/.test(t)) return true;
  if (/add to cart|original price|quick view/i.test(t)) return true;
  return false;
}

function ProductCard({ product }: { product: WidgetProduct }) {
  const price = formatPrice(product.price, product.currency);
  const orderUrl = product.order_url || product.url;
  const viewUrl = product.url;
  const description =
    product.description && !looksLikeNoise(product.description, product.name)
      ? product.description
      : null;

  return (
    <article
      className={cn(
        "group flex w-[232px] shrink-0 flex-col overflow-hidden rounded-2xl",
        "border border-black/5 bg-gradient-to-b from-white to-zinc-50/80",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]",
        "transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.08)]",
        "dark:border-white/10 dark:from-zinc-900 dark:to-zinc-950"
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-9 w-9 opacity-35" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
        {price && (
          <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold tracking-tight text-zinc-900 shadow-sm backdrop-blur dark:bg-zinc-950/90 dark:text-zinc-50">
            {price}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div>
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h3>
          {product.sku && (
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              {product.sku}
            </p>
          )}
        </div>

        {description && (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-0.5">
          {orderUrl && (
            <a
              href={orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Order
            </a>
          )}
          {viewUrl && viewUrl !== orderUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={`View ${product.name}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCards({ products, className }: { products: WidgetProduct[]; className?: string }) {
  if (!products.length) return null;

  return (
    <div className={cn("mt-3 w-full", className)}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
        {products.length === 1 ? "Product" : `${products.length} products`}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
