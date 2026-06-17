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
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: 768,
    } as any);
    
    if (!result.embedding || !result.embedding.values) {
      throw new Error('Embedding API returned an empty result');
    }
    
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate text embedding');
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Utility to retry API calls with exponential backoff on rate limits (HTTP 429 / Quota exceeded).
 * Respects retryDelay hints from Google Generative AI error details if present.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = 6,
  initialDelayMs = 2000,
  maxDelayMs = 35000
): Promise<T> => {
  let currentDelay = initialDelayMs;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.statusCode === 429 || 
                          (error.message && error.message.includes('429')) ||
                          (error.message && error.message.includes('Quota exceeded'));
      
      if (isRateLimit && attempt < retries - 1) {
        let parsedDelayMs: number | undefined;
        if (error.errorDetails && Array.isArray(error.errorDetails)) {
          const retryInfo = error.errorDetails.find(
            (detail: any) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
          );
          if (retryInfo && typeof retryInfo.retryDelay === 'string') {
            const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
            if (!isNaN(seconds)) {
              parsedDelayMs = (seconds + 1.5) * 1000; // Add 1.5s safety buffer
            }
          }
        }

        const waitTime = parsedDelayMs !== undefined ? parsedDelayMs : currentDelay;
        console.warn(`[Retry] Rate limit hit (429). Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${retries})`);
        
        await delay(waitTime);
        
        if (parsedDelayMs === undefined) {
          currentDelay = Math.min(currentDelay * 2, maxDelayMs);
        }
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

/**
 * Generates 768-dimensional vector embeddings for multiple texts using the batch API.
 * Handles batching in sizes of up to 100 requests.
 * @param texts Array of input texts.
 */
export const getBatchEmbeddings = async (texts: string[]): Promise<number[][]> => {
  if (texts.length === 0) return [];
  
  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const results: number[][] = [];
    
    // Batch size of 100 is the official maximum supported by Gemini
    const batchSize = 100;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batchTexts = texts.slice(i, i + batchSize);
      const requests = batchTexts.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768,
      }));
      
      const response = await retryWithBackoff(() => model.batchEmbedContents({ requests }));
      if (!response.embeddings) {
        throw new Error('Batch Embedding API returned an empty result');
      }
      
      for (const emb of response.embeddings) {
        if (!emb.values) {
          throw new Error('Batch Embedding API returned an embedding without values');
        }
        results.push(emb.values);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error('Failed to generate text embeddings in batch');
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
