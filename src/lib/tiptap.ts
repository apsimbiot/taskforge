/**
 * Extract plain text from a Tiptap JSON document.
 * Handles the nested { type: "doc", content: [{ type: "paragraph", content: [{ text: "..." }] }] } structure.
 */
export function extractTextFromTiptap(doc: unknown): string {
  if (!doc) return ""
  if (typeof doc === "string") return doc

  if (typeof doc === "object" && doc !== null) {
    const obj = doc as Record<string, unknown>

    // If it has a "text" key, return it
    if (typeof obj.text === "string") return obj.text

    // If it has a "content" array, recurse
    if (Array.isArray(obj.content)) {
      return obj.content
        .map((child: unknown) => extractTextFromTiptap(child))
        .filter(Boolean)
        .join("\n")
    }
  }

  return ""
}
