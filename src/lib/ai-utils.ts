/** Extract content from markdown code blocks if present */
function extractFromCodeBlock(text: string): string {
  const trimmed = text.trim();
  const jsonBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (jsonBlock?.[1]) return jsonBlock[1].trim();
  return trimmed;
}

/** Extract the first complete JSON object when AI appends extra text after it */
function extractFirstJSONObject(text: string): string {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escape = false;
  let quoteChar: string | null = null;

  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === quoteChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quoteChar = c;
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

/** Try to repair truncated JSON by appending missing closing brackets */
function tryRepairTruncated(json: string): string {
  const trimmed = json.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let quoteChar: string | null = null;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === quoteChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quoteChar = c;
      continue;
    }
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  if (stack.length === 0) return trimmed;
  let repaired = trimmed.replace(/,\s*$/, "");
  repaired = repaired + stack.reverse().join("");
  return repaired;
}

export function cleanAndParseJSON<T>(text: string): T {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid JSON from AI: empty or non-string input");
  }
  let cleanedText = text
    .replace(/\uFEFF/g, "")
    .replace(/\0/g, "")
    .trim();
  cleanedText = extractFromCodeBlock(cleanedText);
  cleanedText = cleanedText.replaceAll(/```json\n?|```/g, "").trim();
  const trailingCommaFixed = cleanedText.replaceAll(/,\s*([\]}])/g, "$1");
  const attempts = [
    cleanedText,
    trailingCommaFixed,
    extractFirstJSONObject(cleanedText),
    extractFirstJSONObject(trailingCommaFixed),
    tryRepairTruncated(extractFirstJSONObject(cleanedText)),
    tryRepairTruncated(extractFirstJSONObject(trailingCommaFixed)),
  ].filter((s) => s && s.startsWith("{"));

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Try next attempt
    }
  }

  const preview = text.length > 1200 ? text.substring(0, 1200) + "…" : text;
  console.error("Failed to parse AI JSON after all attempts");
  console.error("Raw response preview:", preview);
  throw new Error("Invalid JSON from AI: could not parse response");
}
