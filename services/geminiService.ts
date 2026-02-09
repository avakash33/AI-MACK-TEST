
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateMockTestFromContent(
  pdfBase64: string,
  questionCount: number = 10,
  topics: string = ""
): Promise<Question[]> {
  const modelName = 'gemini-3-flash-preview';
  
  // Note: For very high question counts (e.g., 100+), we usually need to batch. 
  // We'll prompt for the requested amount up to a reasonable limit for a single response.
  const count = Math.min(questionCount, 50); 

  const systemInstruction = `You are a professional examiner. Analyze the provided PDF content and generate a comprehensive mock test. 
  Each question must have 4 options. Categorize questions by topic. 
  Ensure a mix of difficulty levels. Use clear language.
  For each question, provide a short "hint" that guides the user without giving away the answer directly.
  If specific topics are requested, focus 80% of the questions on those topics.`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        question: { type: Type.STRING },
        options: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          minItems: 4,
          maxItems: 4
        },
        correctAnswer: { 
          type: Type.INTEGER, 
          description: "Index of the correct answer (0-3)" 
        },
        explanation: { type: Type.STRING },
        hint: { type: Type.STRING, description: "A subtle hint to help the user" },
        category: { type: Type.STRING },
        difficulty: { 
          type: Type.STRING,
          enum: ["Easy", "Medium", "Hard"]
        }
      },
      required: ["id", "question", "options", "correctAnswer", "explanation", "hint", "category", "difficulty"]
    }
  };

  try {
    const topicConstraint = topics ? `Focus specifically on these topics: ${topics}.` : "";
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64
              }
            },
            {
              text: `Generate exactly ${count} multiple-choice questions based on this document. ${topicConstraint} Return the response strictly as a JSON array.`
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as Question[];
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
