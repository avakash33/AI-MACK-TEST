
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

// Always use GEMINI_API_KEY from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateMockTestFromContent(
  pdfBase64: string,
  questionCount: number = 10,
  topics: string = "",
  onProgress?: (current: number, total: number) => void
): Promise<Question[]> {
  // Use gemini-3-flash-preview for speed and efficiency as per guidelines
  const modelName = 'gemini-3-flash-preview';

  // Smaller batch size for faster individual generations and better parallelization
  // Reduced to 2 to avoid JSON truncation issues with long bilingual content
  const BATCH_SIZE = 2;
  const iterations = Math.ceil(questionCount / BATCH_SIZE);
  
  const systemInstruction = `You are a professional examiner. Analyze the provided PDF and generate high-quality multiple-choice questions.
  - 4 options per question.
  - Include a subtle "hint" (max 60 chars) and a clear "explanation" (max 150 chars).
  - Categorize by topic.
  - Be extremely concise. Use short sentences.
  - DO NOT include the document text in the explanation.
  - CRITICAL: Ensure every question is unique and covers different parts of the material.
  
  LANGUAGE RULES:
  - If PDF is Hindi: All fields in Hindi.
  - If PDF is English: All fields in English.
  - If PDF is BOTH: Populate standard fields in English AND Hindi fields (hindiQuestion, hindiOptions, etc.) in Hindi.
  - CRITICAL: hindiOptions MUST have exactly 4 strings if hindiQuestion is present.
  - DO NOT use markdown backticks. Return raw JSON.
  
  Focus 80% on these topics if provided: ${topics}`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Short unique ID" },
        question: { type: Type.STRING },
        options: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          minItems: 4,
          maxItems: 4
        },
        correctAnswer: { 
          type: Type.INTEGER, 
          description: "Index of correct answer (0-3)" 
        },
        explanation: { type: Type.STRING, description: "Max 250 characters" },
        hint: { type: Type.STRING, description: "Max 100 characters" },
        category: { type: Type.STRING },
        difficulty: { 
          type: Type.STRING,
          enum: ["Easy", "Medium", "Hard"]
        },
        hindiQuestion: { type: Type.STRING },
        hindiOptions: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          minItems: 4,
          maxItems: 4,
          description: "Hindi translations of the options. REQUIRED if hindiQuestion is provided."
        },
        hindiExplanation: { type: Type.STRING, description: "Max 250 characters" },
        hindiHint: { type: Type.STRING, description: "Max 100 characters" }
      },
      required: ["question", "options", "correctAnswer", "explanation", "hint", "category", "difficulty"]
    }
  };

  const DIFFICULTY_PATTERN = ['Hard', 'Medium', 'Hard', 'Medium', 'Easy', 'Hard', 'Medium'];

  let completedQuestions = 0;

  const generateBatch = async (index: number) => {
    const startIdx = index * BATCH_SIZE;
    const currentBatchCount = Math.min(BATCH_SIZE, questionCount - startIdx);
    if (currentBatchCount <= 0) return [];

    const targetDifficulties = Array.from({ length: currentBatchCount }, (_, i) => {
      const globalIdx = startIdx + i;
      return DIFFICULTY_PATTERN[globalIdx % DIFFICULTY_PATTERN.length];
    });

    let retries = 2;
    while (retries > 0) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: pdfBase64
                  }
                },
                {
                  text: `${systemInstruction}\n\nGenerate exactly ${currentBatchCount} unique questions. This is batch ${index + 1}.
                  The questions MUST follow these specific difficulty levels in order: ${targetDifficulties.join(', ')}.
                  Return as a JSON array.`
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema,
            maxOutputTokens: 8192, // Increased further to prevent truncation
            temperature: 0.1 // Even lower temperature for maximum stability
          }
        });

        const text = result.text;
        if (!text) {
          retries--;
          continue;
        }
        
        let batch: Question[] = [];
        try {
          // Clean the text in case there are markdown blocks or extra characters
          const cleanedText = text.replace(/```json\n?|```/g, '').trim();
          batch = JSON.parse(cleanedText) as Question[];
        } catch (parseError) {
          console.error(`JSON Parse Error in batch ${index + 1} (Attempt ${3 - retries}):`, parseError);
          
          // Enhanced salvage: Try to extract any complete objects from the malformed JSON
          try {
            const extracted: any[] = [];
            let braceCount = 0;
            let startIndex = -1;
            let inString = false;
            
            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              if (char === '"' && text[i-1] !== '\\') inString = !inString;
              if (!inString) {
                if (char === '{') {
                  if (braceCount === 0) startIndex = i;
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0 && startIndex !== -1) {
                    try {
                      const objStr = text.substring(startIndex, i + 1);
                      extracted.push(JSON.parse(objStr));
                    } catch (e) {}
                    startIndex = -1;
                  }
                }
              }
            }
            
            if (extracted.length > 0) {
              batch = extracted as Question[];
              console.log(`Extracted ${batch.length} complete questions from malformed batch ${index + 1}`);
            }
          } catch (salvageError) {
            console.error("Failed to extract objects from malformed JSON:", salvageError);
          }
          
          if (batch.length === 0) {
            retries--;
            continue;
          }
        }
        
        const processedBatch = batch.map((q, qIdx) => ({
          ...q,
          // Ensure ID is globally unique even if AI repeats IDs across batches
          id: `${index}-${qIdx}-${Math.random().toString(36).substr(2, 5)}-${q.id || 'q'}`
        }));

        completedQuestions += processedBatch.length;
        if (onProgress) {
          onProgress(completedQuestions, questionCount);
        }

        return processedBatch;
      } catch (error) {
        console.error(`Error generating batch ${index + 1} (Attempt ${3 - retries}):`, error);
        retries--;
        if (retries === 0) return [];
      }
    }
    return [];
  };

  // Run batches with concurrency control to avoid rate limits and browser lag
  const results: Question[][] = [];
  const CONCURRENCY_LIMIT = 5; // Process 5 batches at a time
  
  for (let i = 0; i < iterations; i += CONCURRENCY_LIMIT) {
    const batchGroup = Array.from(
      { length: Math.min(CONCURRENCY_LIMIT, iterations - i) }, 
      (_, j) => generateBatch(i + j)
    );
    const groupResults = await Promise.all(batchGroup);
    results.push(...groupResults);
  }
  
  const allQuestions = results.flat();

  // If we failed to get enough questions, try one more small recovery batch if needed
  if (allQuestions.length < questionCount * 0.5 && questionCount > 5) {
    console.warn("Significant shortfall in questions, attempting recovery...");
    const recoveryBatch = await generateBatch(iterations);
    allQuestions.push(...recoveryBatch);
  }

  return allQuestions.slice(0, questionCount);
}
