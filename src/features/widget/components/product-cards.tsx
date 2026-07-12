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

function ProductCard({ product }: { product: WidgetProduct }) {
  const price = formatPrice(product.price, product.currency);
  const orderUrl = product.order_url || product.url;
  const viewUrl = product.url;

  return (
    <article className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10 opacity-40" />
          </div>
        )}
        {price && (
          <span className="absolute bottom-2 left-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow">
            {price}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
          {product.sku && (
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{product.sku}</p>
          )}
        </div>

        {product.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          {orderUrl && (
            <a
              href={orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
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
              className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition hover:bg-muted"
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
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
