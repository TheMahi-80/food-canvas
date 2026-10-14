/**
 * Cart lines hold only IDs and a quantity. Prices are never stored in the cart; they are
 * always recomputed from current menu data by lib/pricing.
 */

export const MAX_LINE_QUANTITY = 99;

export interface CartLine {
  productId: string;
  variantId: string | null;
  /** Sorted, unique. Use normalizeAddonIds before storing. */
  addonIds: string[];
  quantity: number;
}

export function normalizeAddonIds(addonIds: readonly string[]): string[] {
  return [...new Set(addonIds)].sort();
}

/** Identity of a line: same product + same variant + same add-on set => same line. */
export function cartLineKey(line: Pick<CartLine, "productId" | "variantId" | "addonIds">): string {
  return [line.productId, line.variantId ?? "", normalizeAddonIds(line.addonIds).join(",")].join("|");
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

/** Adds an item; merges into an identical existing line, otherwise appends a new line. */
export function addCartLine(lines: readonly CartLine[], item: CartLine): CartLine[] {
  const incoming: CartLine = { ...item, addonIds: normalizeAddonIds(item.addonIds), quantity: clampQuantity(item.quantity) };
  const key = cartLineKey(incoming);
  const index = lines.findIndex((line) => cartLineKey(line) === key);
  if (index === -1) return [...lines, incoming];
  return lines.map((line, i) => (i === index ? { ...line, quantity: clampQuantity(line.quantity + incoming.quantity) } : line));
}

/** Sets a line's quantity; quantity <= 0 removes the line. */
export function setCartLineQuantity(lines: readonly CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return removeCartLine(lines, key);
  return lines.map((line) => (cartLineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : line));
}

export function removeCartLine(lines: readonly CartLine[], key: string): CartLine[] {
  return lines.filter((line) => cartLineKey(line) !== key);
}

export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Validates untrusted data (e.g. from localStorage) into cart lines. Malformed entries are
 * dropped and duplicates are merged, so a tampered or outdated cart can never crash the app.
 */
export function parseStoredCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  let lines: CartLine[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const { productId, variantId, addonIds, quantity } = raw as Record<string, unknown>;
    if (typeof productId !== "string" || productId.length === 0 || productId.length > 64) continue;
    if (variantId !== null && (typeof variantId !== "string" || variantId.length > 64)) continue;
    if (!Array.isArray(addonIds) || addonIds.length > 50 || !addonIds.every((id) => typeof id === "string" && id.length <= 64)) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;
    lines = addCartLine(lines, { productId, variantId: variantId as string | null, addonIds: addonIds as string[], quantity });
  }
  return lines;
}
