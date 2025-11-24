import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const checkPronunciation = async (
  audioBase64: string, 
  targetWord: string
): Promise<{ score: number; feedback: string }> => {
  if (!apiKey) {
    console.error("No API Key found");
    return { score: 0, feedback: "API Key Missing" };
  }

  try {
    const model = 'gemini-2.5-flash';
    
    // Construct the prompt
    const promptText = `
      You are an encouraging English teacher for Vietnamese students (B1 level). 
      The student is trying to pronounce the word: "${targetWord}".
      Listen to the audio. 
      1. Rate the pronunciation on a scale of 0 to 100.
      2. Provide specific, helpful feedback in Vietnamese (Tiếng Việt) on how to improve. Keep it short (under 20 words).
      
      Return JSON format: { "score": number, "feedback": "string" }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm',
              data: audioBase64
            }
          },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini Error:", error);
    return { score: 0, feedback: "Lỗi kết nối AI. Vui lòng thử lại." };
  }
};

export const generateQuizQuestions = async (words: string[]): Promise<any> => {
    // This is a placeholder. In a full app, we would generate questions dynamically.
    return [];
}