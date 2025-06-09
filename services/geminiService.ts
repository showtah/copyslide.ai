
import { GoogleGenAI, Part } from "@google/genai";
import type { GeminiStreamOutput } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("APIキーが設定されていません。環境変数 'API_KEY' を設定してください。");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const modelName = 'gemini-2.5-pro-preview-06-05'; // Updated model name

function base64ToGenerativePart(base64Data: string, mimeType: string): Part {
  return {
    inlineData: {
      data: base64Data.split(',')[1], // Remove the "data:mime/type;base64," prefix
      mimeType,
    },
  };
}

export async function* extractStructureWithGemini(
  base64Image: string,
  mimeType: string,
  promptText: string
): AsyncGenerator<GeminiStreamOutput, void, unknown> {
  try {
    const imagePart = base64ToGenerativePart(base64Image, mimeType);
    const textPart = { text: promptText };

    const responseStream = await ai.models.generateContentStream({
      model: modelName, 
      contents: { parts: [textPart, imagePart] },
      config: {
        thinkingConfig: {
          includeThoughts: true, 
        },
        responseMimeType: "application/json",
        maxOutputTokens: 50000, 
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          for (const part of candidate.content.parts) {
            if (part.text != null) {
              const isThoughtBasedOnPromptFeedback = 
                                chunk.promptFeedback && 
                                chunk.promptFeedback.blockReason && 
                                chunk.promptFeedback.blockReason !== 'SAFETY' && 
                                chunk.promptFeedback.blockReason !== 'OTHER';
              
              const isThought = ((part as any).thought === true) || isThoughtBasedOnPromptFeedback;

              if (isThought) {
                 yield { type: 'thought', content: part.text };
              } else {
                 yield { type: 'answer', content: part.text };
              }
            }
          }
        }
      } else if (chunk.text) { 
          yield { type: 'answer', content: chunk.text };
      }
    }
  } catch (error) {
    console.error("Gemini API (構造抽出) エラー:", error);
    throw new Error(`Gemini APIからの構造抽出に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}


export async function* generateHtmlWithGemini(
  prompt: string,
): AsyncGenerator<GeminiStreamOutput, void, unknown> {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName, 
      contents: prompt,
      config: {
        thinkingConfig: {
          includeThoughts: true,
        },
        responseMimeType: "text/plain", 
        maxOutputTokens: 50000,
      }
    });

    for await (const chunk of responseStream) {
       if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          for (const part of candidate.content.parts) {
            if (part.text != null) {
              const isThoughtBasedOnPromptFeedback = 
                                chunk.promptFeedback && 
                                chunk.promptFeedback.blockReason && 
                                chunk.promptFeedback.blockReason !== 'SAFETY' && 
                                chunk.promptFeedback.blockReason !== 'OTHER';

              const isThought = ((part as any).thought === true) || isThoughtBasedOnPromptFeedback;
              
              if (isThought) {
                 yield { type: 'thought', content: part.text };
              } else {
                 yield { type: 'answer', content: part.text };
              }
            }
          }
        }
      } else if (chunk.text) { 
          yield { type: 'answer', content: chunk.text };
      }
    }
  } catch (error) {
    console.error("Gemini API (HTML生成) エラー:", error);
    throw new Error(`Gemini APIからのHTML生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}
