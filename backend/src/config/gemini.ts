import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

if (!env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY must be defined in the environment config.');
}

export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
