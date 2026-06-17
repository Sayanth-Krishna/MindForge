import { genAI } from '../config/gemini';

const EMBEDDING_MODEL = 'gemini-embedding-2';
const GENERATIVE_MODEL = 'gemini-2.5-flash';

/**
 * Generates a 768-dimensional vector embedding for the given text.
 * @param text The input text.
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    
    if (!result.embedding || !result.embedding.values) {
      throw new Error('Embedding API returned an empty result');
    }
    
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate text embedding');
  }
};

/**
 * Generates a conversational response using the RAG context.
 * @param prompt The prompt containing context + question.
 * @param history Optional conversation history.
 */
export const generateChatResponse = async (
  prompt: string,
  history: Array<{ role: 'user' | 'model'; parts: { text: string }[] }> = []
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: GENERATIVE_MODEL });
    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error('Model returned an empty text response');
    }

    return text;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw new Error('Failed to generate chat response from AI');
  }
};

/**
 * Helper to generate structured JSON payloads by forcing the model response to be JSON.
 * @param prompt The instructions prompt describing the requested JSON schema.
 */
export const generateStructuredJson = async <T>(prompt: string): Promise<T> => {
  try {
    const model = genAI.getGenerativeModel({ model: GENERATIVE_MODEL });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const text = result.response.text();
    if (!text) {
      throw new Error('Model returned empty response for structured JSON');
    }

    const parsedData = JSON.parse(text) as T;
    return parsedData;
  } catch (error) {
    console.error('Error in structured JSON generation:', error);
    throw new Error('Failed to generate structured data from AI');
  }
};
export type ChatHistoryMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};
