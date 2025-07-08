import asyncHandler from 'express-async-handler';
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set. AI features will be disabled.");
}
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// @desc    Generate a product description using AI
// @route   POST /api/ai/generate-description
// @access  Private
const generateDescription = asyncHandler(async (req, res) => {
  if (!ai) {
    res.status(503);
    throw new Error("AI service is not available. Please configure the API key on the server.");
  }
  
  const { productName, productType } = req.body;
  if (!productName || !productType) {
    res.status(400);
    throw new Error("Product name and type are required.");
  }

  const prompt = `Gere uma sugestão de descrição curta e atraente para um produto de comunicação visual/gráfica.
Nome do Produto: ${productName}
Tipo de Produto: ${productType}
A descrição deve ser em português do Brasil, focada nos benefícios e diferenciais, com no máximo 50 palavras.
Exemplo: "Cartões de visita premium com acabamento sofisticado, perfeitos para causar uma primeira impressão memorável."`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: prompt,
    });

    const descriptionText = response.text.trim();
    if (!descriptionText) {
        res.status(500);
        throw new Error("AI failed to generate a description.");
    }
    
    res.json({ description: descriptionText });

  } catch (error) {
    console.error("Error generating product description with Gemini:", error);
    res.status(500);
    throw new Error(`Erro ao contatar IA: ${error.message}`);
  }
});

export { generateDescription };
