/** Extract the first complete JSON object when AI appends extra text after it */
function extractFirstJSONObject(text: string): string {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      depth++;
      continue;
    }
    if (c === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return trimmed;
}

export function cleanAndParseJSON<T>(text: string): T {
  const cleanedText = text.replaceAll(/```json\n?|```/g, "").trim();

  const trailingCommaFixed = cleanedText.replaceAll(/,\s*([\]}])/g, "$1");
  const attempts = [
    cleanedText,
    trailingCommaFixed,
    extractFirstJSONObject(cleanedText),
    extractFirstJSONObject(trailingCommaFixed),
  ];

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      if (attempts.indexOf(candidate) === attempts.length - 1) {
        console.error("Failed to parse AI JSON response:", err);
        console.error(
          "Raw response text preview:",
          text.substring(0, 1000) + "...",
        );
        if (err instanceof SyntaxError) {
          console.error("JSON Syntax error details:", err.message);
        }
        throw new Error(
          `Invalid JSON from AI: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  throw new Error("Invalid JSON from AI: could not parse response");
}
