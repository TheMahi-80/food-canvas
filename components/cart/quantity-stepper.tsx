"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { messages, toBanglaDigits } from "@/lib/i18n";

export function QuantityStepper({
  value,
  onChange,
  itemName,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  itemName: string;
  min?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border" role="group" aria-label={`${itemName}: ${messages.cart.quantity}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={messages.cart.decrease(itemName)}
      >
        <Minus aria-hidden />
      </Button>
      <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite">
        {toBanglaDigits(value)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={value >= MAX_LINE_QUANTITY}
        onClick={() => onChange(value + 1)}
        aria-label={messages.cart.increase(itemName)}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
