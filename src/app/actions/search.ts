"use server";

import { createClient } from "@/lib/supabase/server";
import { ContentType } from "@/lib/types";

export async function createSearchSession(
  query: string,
  contentTypes: ContentType | ContentType[],
  mode: string = "list",
) {
  const supabase = await createClient();

  // Normalize query to prevent duplicates with trailing spaces or redundant whitespace
  const normalizedQuery = query.trim().replaceAll(/\s+/g, " ");

  // Ensure types are handled consistently as an array in DB
  const types = Array.isArray(contentTypes) ? contentTypes : [contentTypes];

  // Check for existing session with same exact params to avoid duplicates and reuse IDs
  // We sort types to ensure consistency
  const sortedTypes = [...types].sort();

  const { data: existing } = await supabase
    .from("search_sessions")
    .select("id")
    .eq("query", normalizedQuery)
    .eq("content_types", sortedTypes)
    .eq("mode", mode)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Generate a short ID (8 characters)
  const id = Math.random().toString(36).substring(2, 10);

  const { error } = await supabase.from("search_sessions").insert({
    id,
    query: normalizedQuery,
    content_types: sortedTypes,
    mode,
  });

  if (error) {
    console.error("Error creating search session:", error);
    throw new Error(`Failed to create search session: ${error.message}`);
  }

  return id;
}

export async function getSearchSession(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("search_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching search session:", error);
    return null;
  }

  return data;
}
