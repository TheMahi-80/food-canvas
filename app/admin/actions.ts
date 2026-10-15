"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAdmin } from "@/lib/auth/check";
import { ADMIN_LOGIN, safeAdminNext } from "@/lib/auth/routes";
import { messages } from "@/lib/i18n";
import { createAuthClient } from "@/lib/supabase/server";

export interface SignInState {
  error: string | null;
}

const credentialsSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

/** Email + password sign-in. Non-admin accounts are signed out again immediately. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "") || undefined,
  });
  if (!parsed.success) return { error: messages.admin.invalidInput };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    // Never echo provider error text; it can reveal whether an account exists.
    if (error.status === 429) return { error: messages.admin.tooManyAttempts };
    if (error.status === 400 || error.code === "invalid_credentials") return { error: messages.admin.invalidCredentials };
    console.error("admin signIn failed", error.status, error.code);
    return { error: messages.admin.loginFailed };
  }

  const check = await checkAdmin(supabase);
  if (check.status !== "admin") {
    await supabase.auth.signOut();
    return { error: messages.admin.notAdmin };
  }

  redirect(safeAdminNext(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN);
}
