
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';

// Ensure API_KEY is handled by the build/environment, not hardcoded.
// For development, you might set this in a .env file and use a bundler like Vite to expose it.
// For this example, we'll directly reference process.env.API_KEY as per instructions.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set. AI features will be disabled. Ensure process.env.API_KEY is configured.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const generateProductDescriptionIdea = async (productName: string, productType: string): Promise<string> => {
  if (!ai) {
    return Promise.resolve("AI service is not available. Please configure the API key.");
  }

  const prompt = `Gere uma sugestão de descrição curta e atraente para um produto de comunicação visual/gráfica.
Nome do Produto: ${productName}
Tipo de Produto: ${productType}
A descrição deve ser em português do Brasil, focada nos benefícios e diferenciais, com no máximo 50 palavras.
Exemplo: "Cartões de visita premium com acabamento sofisticado, perfeitos para causar uma primeira impressão memorável."`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      // No thinkingConfig for higher quality default for this type of task
    });
    return response.text.trim() || "Não foi possível gerar uma descrição.";
  } catch (error) {
    console.error("Error generating product description with Gemini:", error);
    if (error instanceof Error) {
        return `Erro ao contatar IA: ${error.message}`;
    }
    return "Erro desconhecido ao contatar IA.";
  }
};

// Placeholder for other Gemini functions if needed
// export const analyzeCashFlow = async (entries: CashFlowEntry[]): Promise<string> => { ... }
