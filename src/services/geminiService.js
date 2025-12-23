import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

export const analyzeLostItem = async (base64String, mimeType) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  // Clean base64 string for Gemini
  const base64Data = base64String.split(",")[1] || base64String;
  const finalMimeType = mimeType || "image/jpeg";
  const prompt = `Return only a valid JSON object with: "title" (specific name), "category" (e.g. Electronics, Personal), "color". Do not include any other text or markdown.`;

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { data: base64Data, mimeType: finalMimeType } },
  ]);

  const text = result.response.text();
  const cleanedText = text.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleanedText);
};
