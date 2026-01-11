
import { GoogleGenAI } from "@google/genai";
import { TribunalEvent } from "../types.ts";

export const analyzeSchedule = async (events: (TribunalEvent & { unit: string })[]) => {
  try {
    // Verificación de seguridad para la API KEY
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    
    if (!apiKey) {
      return "Para habilitar el análisis de IA, configura la API_KEY en el entorno.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const eventsStr = events.map(e => `- ${e.title} (${e.unit}): ${e.startTime.toLocaleTimeString()}`).join('\n');
    
    const prompt = `Analiza la siguiente agenda de un tribunal y proporciona un resumen ejecutivo rápido (máximo 150 palabras) indicando posibles conflictos de horario, la unidad con más carga y una recomendación para optimizar el día:\n\n${eventsStr}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "No se pudo generar el análisis en este momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la IA judicial. Verifica la configuración de la API.";
  }
};
