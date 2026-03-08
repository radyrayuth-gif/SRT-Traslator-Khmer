import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface TranslationBatch {
  id: number;
  original: string;
  translated?: string;
}

export type TranslationStyle = 'ancient' | 'modern';

export async function translateBatch(texts: string[], style: TranslationStyle = 'modern'): Promise<string[]> {
  const model = "gemini-3.1-pro-preview";
  
  const styleInstruction = style === 'ancient' 
    ? "Use formal, poetic, and respectful Khmer language suitable for ancient Chinese historical dramas (Wuxia/Xianxia). Use appropriate royal terms, honorifics, and classical vocabulary."
    : "Use natural, contemporary, and polite Khmer language suitable for modern daily life and conversations.";

  const prompt = `Translate the following Chinese subtitle entries into natural, fluent, and high-quality Khmer.
Style: ${styleInstruction}

CRITICAL GUIDELINES:
- Translate EVERYTHING. Do NOT skip any words or lines.
- Translate 100% into Khmer. No Chinese or English characters allowed.
- Ensure the language is polite, appropriate for the character's personality, and comprehensive (ក្បោះក្បាយ).
- The translation must capture the true meaning and emotion of the dialogue.
- Each entry is provided on a new line. 
- Some entries may contain the placeholder "[BR]" which represents a line break within the subtitle. 
- You MUST preserve the "[BR]" placeholder in the translated output exactly where it makes sense for the Khmer translation.
- IMPORTANT: You MUST return exactly ${texts.length} lines of translation. Each line corresponds to one input subtitle.
- Return ONLY the translated entries, one per line. 
- Do not include any explanations, numbering, or extra text.

Subtitles:
${texts.join("\n")}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1, // Lower temperature for more focused output
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const translatedText = response.text || "";
    // Split by newline and handle potential empty lines
    let lines = translatedText.split("\n").map(line => line.trim()).filter(l => l !== "");
    
    // If the model failed to provide enough lines, we fill with original to avoid index errors
    // but we prioritize accuracy in the prompt first.
    if (lines.length < texts.length) {
      console.warn(`Translation mismatch: expected ${texts.length} lines, got ${lines.length}`);
      // Try to re-split if the model combined lines (sometimes happens)
      // For now, we'll just pad to avoid breaking the UI
      while (lines.length < texts.length) {
        lines.push("..."); // Placeholder for missing translation
      }
    } else if (lines.length > texts.length) {
      lines = lines.slice(0, texts.length);
    }
    
    return lines;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}
