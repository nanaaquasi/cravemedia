export function cleanAndParseJSON<T>(text: string): T {
  try {
    // 1. Basic cleanup: remove markdown code blocks if they exist
    const cleanedText = text.replaceAll(/```json\n?|```/g, "").trim();

    // 2. Try parsing
    return JSON.parse(cleanedText) as T;
  } catch (err) {
    console.error("Failed to parse AI JSON response:", err);
    console.error(
      "Raw response text preview:",
      text.substring(0, 1000) + "...",
    );

    // 3. Try fixing common issues like trailing commas
    try {
      const fixedText = text
        .replaceAll(/,\s*([\]}])/g, "$1")
        .replaceAll(/```json\n?|```/g, "")
        .trim();
      return JSON.parse(fixedText) as T;
    } catch {
      // Log the error position if available from the syntax error
      if (err instanceof SyntaxError) {
        console.error("JSON Syntax error details:", err.message);
      }
      throw new Error(
        `Invalid JSON from AI: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
