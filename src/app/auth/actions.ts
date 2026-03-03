"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth-utils";
import { loginSchema, signupSchema } from "@/lib/auth-schema";

export async function login(formData: FormData) {
  const parseResult = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues?.[0];
    const message =
      firstIssue && "message" in firstIssue
        ? String(firstIssue.message)
        : "Invalid input";
    return { error: message };
  }

  const { email, password } = parseResult.data;
  const next = formData.get("next") as string | null;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeRedirectPath(next));
}

export async function signup(formData: FormData) {
  const parseResult = signupSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    fullName: formData.get("fullName") ?? "",
    username: formData.get("username") ?? "",
  });

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues?.[0];
    const message =
      firstIssue && "message" in firstIssue
        ? String(firstIssue.message)
        : "Invalid input";
    return { error: message };
  }

  const { email, password, fullName, username } = parseResult.data;
  const next = formData.get("next") as string | null;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        user_name: username,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeRedirectPath(next));
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || "http://localhost:3000";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/account")}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Failed to initiate Google sign-in" };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
