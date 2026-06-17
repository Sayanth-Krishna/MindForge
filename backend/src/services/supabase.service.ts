import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { supabase as globalSupabase } from '../config/supabase';

const BUCKET_NAME = 'documents';

const getClient = (token?: string) => {
  if (token) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      },
    });
  }
  return globalSupabase;
};

/**
 * Uploads a file buffer directly to the Supabase Storage bucket.
 * @param file The Express.Multer.File object containing the buffer and mimetype.
 * @param path The destination path inside the bucket.
 * @param token Optional authorization token.
 * @returns The public URL of the uploaded asset.
 */
export const uploadFile = async (
  file: Express.Multer.File,
  path: string,
  token?: string
): Promise<string> => {
  const client = getClient(token);
  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  // Retrieve the public URL for the file
  const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(path);
  
  if (!data || !data.publicUrl) {
    throw new Error('Could not retrieve public URL for uploaded file');
  }

  return data.publicUrl;
};

/**
 * Deletes a file from Supabase Storage by its unique bucket path.
 * @param path The path of the file in the bucket.
 * @param token Optional authorization token.
 */
export const deleteFile = async (path: string, token?: string): Promise<void> => {
  const client = getClient(token);
  const { error } = await client.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error('Supabase delete error:', error);
    throw new Error(`Failed to delete file from storage: ${error.message}`);
  }
};
