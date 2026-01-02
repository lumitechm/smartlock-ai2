
import { GoogleGenAI } from "@google/genai";

async function imageUrlToBase64(url: string): Promise<{ data: string, mimeType: string }> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({ data: base64String, mimeType: blob.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error("Could not process the lock reference image.");
  }
}

export const generateVisualizedDoor = async (
  doorImageBase64: string,
  lockReferenceUrl: string
): Promise<string> => {
  // Use the defined process.env.API_KEY from vite.config.ts
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing. Please set it in Vercel Environment Variables.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const doorData = doorImageBase64.split(',')[1] || doorImageBase64;
  const lockInfo = await imageUrlToBase64(lockReferenceUrl);

  const prompt = `
    ROLE: Professional Architectural Visualizer.
    TASK: Replicate the smart lock from the provided REFERENCE image onto the target DOOR image.
    RULES:
    1. Clone the EXACT design and shape of the lock.
    2. Match the door's lighting, shadows, and perspective.
    3. Remove any existing handle or lock on the original door.
    4. If the reference lock has no handle (push-pull), DO NOT add one.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: doorData, mimeType: 'image/png' } },
          { inlineData: { data: lockInfo.data, mimeType: lockInfo.mimeType } },
          { text: prompt },
        ],
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("AI failed to return an image. Try a different photo.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
