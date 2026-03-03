import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRefineQuestions } from "@/lib/ai";
import { getLightweightUserContext } from "@/lib/user-context";
import { checkRefineRateLimit } from "@/lib/ratelimit";
import { getCachedRefine, setCachedRefine } from "@/lib/refine-cache";
import { ContentType, RefineAnswer } from "@/lib/types";
import { VALID_CONTENT_TYPES } from "@/config/media-types";

const MAX_ANSWERS = 10;

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkRefineRateLimit(request.headers);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const {
      query,
      type,
      previousAnswers: rawPreviousAnswers,
    } = body as {
      query: string;
      type: ContentType | ContentType[];
      previousAnswers?: RefineAnswer[];
    };

    const previousAnswers: RefineAnswer[] = Array.isArray(rawPreviousAnswers)
      ? rawPreviousAnswers.slice(0, MAX_ANSWERS)
      : [];

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: "Query must be 500 characters or less" },
        { status: 400 },
      );
    }

    const types = Array.isArray(type) ? type : [type];
    const allValid = types.every((t) => VALID_CONTENT_TYPES.includes(t));

    if (!allValid) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    const trimmedQuery = query.trim();

    // Fetch lightweight user context for tailored questions (logged-in only)
    let userContext: Awaited<
      ReturnType<typeof getLightweightUserContext>
    > = null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userContext = await getLightweightUserContext(user.id);
    }

    const useCache = !userContext;
    const cached = useCache
      ? await getCachedRefine(trimmedQuery, type, previousAnswers)
      : null;
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await generateRefineQuestions(
      trimmedQuery,
      type,
      previousAnswers,
      {
        userContext: userContext
          ? {
              ...userContext,
              streamingServices: null,
              recentlyWatched: [],
              recentlyRated: [],
            }
          : undefined,
      },
    );

    if (useCache) {
      await setCachedRefine(trimmedQuery, type, previousAnswers, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refine API error:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up questions. Please try again." },
      { status: 500 },
    );
  }
}
