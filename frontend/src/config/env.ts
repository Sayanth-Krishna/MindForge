import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY cannot be empty'),
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL').optional(),
});

/**
 * Validates Vite client-side environment variables at startup.
 */
export const validateEnv = () => {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_API_URL: import.meta.env.VITE_API_URL,
  };

  const parsed = envSchema.safeParse(envVars);

  if (!parsed.success) {
    console.warn('⚠️ Invalid Frontend Environment Variables:');
    console.warn(JSON.stringify(parsed.error.format(), null, 2));
  }
};
