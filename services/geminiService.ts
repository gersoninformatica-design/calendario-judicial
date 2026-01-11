
import { GoogleGenAI } from "@google/genai";
import { TribunalEvent } from "../types.ts";

export const analyzeSchedule = async (events: (TribunalEvent & { unit: string })[]) => {
  try {
    // Correct initialization as per guidelines: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const eventsStr = events.map(e => `- ${e.title} (${e.unit}): ${e.startTime.toLocaleTimeString()}`).join('\n');
    
    const prompt = `Analiza la siguiente agenda de un tribunal y proporciona un resumen ejecutivo rápido (máximo 150 palabras) indicando posibles conflictos de horario, la unidad con más carga y una recomendación para optimizar el día:\n\n${eventsStr}`;

    // Using gemini-3-flash-preview for a quick summary task as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    // Accessing .text property directly as per guidelines (not a method call)
    return response.text || "No se pudo generar el análisis en este momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la IA judicial. Verifica la configuración de la API.";
  }
};
