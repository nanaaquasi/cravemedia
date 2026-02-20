import { NextRequest, NextResponse } from "next/server";
import { generateRefineQuestions } from "@/lib/ai";
import { ContentType, RefineAnswer } from "@/lib/types";
import { VALID_CONTENT_TYPES } from "@/config/media-types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      type,
      previousAnswers = [],
    } = body as {
      query: string;
      type: ContentType | ContentType[];
      previousAnswers: RefineAnswer[];
    };

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
    const result = await generateRefineQuestions(
      trimmedQuery,
      type,
      previousAnswers,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refine API error:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up questions. Please try again." },
      { status: 500 },
    );
  }
}
