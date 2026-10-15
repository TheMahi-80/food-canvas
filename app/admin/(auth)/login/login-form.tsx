"use client";

import { useActionState, useId } from "react";
import { signIn, type SignInState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/lib/i18n";

const a = messages.admin;

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { error: null });
  const ids = { email: useId(), password: useId(), error: useId() };

  return (
    <form action={action} className="space-y-4" aria-describedby={state.error ? ids.error : undefined}>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor={ids.email} className="text-sm font-medium">
          {a.email}
        </label>
        <Input id={ids.email} name="email" type="email" autoComplete="username" required dir="ltr" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={ids.password} className="text-sm font-medium">
          {a.password}
        </label>
        <Input id={ids.password} name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </div>
      {state.error && (
        <p id={ids.error} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? a.signingIn : a.signIn}
      </Button>
    </form>
  );
}
