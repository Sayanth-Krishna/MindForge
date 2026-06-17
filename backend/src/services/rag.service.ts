import crypto from 'crypto';
import { prisma } from '../config/db';
import { getEmbedding, getBatchEmbeddings } from './gemini';
import { TextChunk } from './pdf.service';

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  similarity: number;
  documentName: string;
}

/**
 * Loops through text chunks, requests embedding vectors from Gemini in batches,
 * and bulk inserts them into Neon PostgreSQL using batched transactions.
 * @param documentId The ID of the parent Document.
 * @param chunks The text chunks to process and store.
 */
export const storeDocumentChunks = async (
  documentId: string,
  chunks: TextChunk[]
): Promise<void> => {
  try {
    const contents = chunks.map((c) => c.content);
    const vectors = await getBatchEmbeddings(contents);

    const chunksWithVectors = chunks.map((chunk, index) => ({
      ...chunk,
      vector: vectors[index],
    }));

    // Write to DB inside a transaction in batches of 50 to avoid Neon connection/timeout issues
    const dbBatchSize = 50;
    for (let i = 0; i < chunksWithVectors.length; i += dbBatchSize) {
      const batch = chunksWithVectors.slice(i, i + dbBatchSize);

      await prisma.$transaction(
        batch.map((chunk) => {
          const id = crypto.randomUUID();
          const vectorString = `[${chunk.vector.join(',')}]`;

          return prisma.$executeRawUnsafe(
            `INSERT INTO "DocumentChunk" (id, "documentId", content, "pageNumber", embedding)
             VALUES ($1, $2, $3, $4, $5::vector)`,
            id,
            documentId,
            chunk.content,
            chunk.pageNumber,
            vectorString
          );
        })
      );
    }
  } catch (error) {
    console.error('Error storing document chunks in pgvector:', error);
    throw new Error('Failed to create and index document vectors');
  }
};


/**
 * Performs cosine similarity search using pgvector on Neon PostgreSQL.
 * @param documentIds List of document IDs to search within.
 * @param queryText The search query.
 * @param limit The maximum number of chunks to return (default 5).
 */
export const searchSimilarChunks = async (
  documentIds: string[],
  queryText: string,
  limit = 5
): Promise<RetrievedChunk[]> => {
  if (documentIds.length === 0) {
    return [];
  }

  try {
    const queryVector = await getEmbedding(queryText);
    const vectorString = `[${queryVector.join(',')}]`;

    // Construct positional parameters: $1 = vectorString, $2..$N = doc IDs, $(N+1) = limit
    const placeholders = documentIds.map((_, i) => `$${i + 2}`).join(', ');
    const limitPlaceholder = `$${documentIds.length + 2}`;

    const sql = `
      SELECT c.id, c."documentId", c.content, c."pageNumber", d.name AS "documentName",
             1 - (c.embedding <=> $1::vector) AS similarity
      FROM "DocumentChunk" c
      INNER JOIN "Document" d ON c."documentId" = d.id
      WHERE c."documentId" IN (${placeholders})
      ORDER BY c.embedding <=> $1::vector
      LIMIT ${limitPlaceholder}
    `;

    const params = [vectorString, ...documentIds, limit];
    
    const results = await prisma.$queryRawUnsafe<RetrievedChunk[]>(sql, ...params);
    return results;
  } catch (error) {
    console.error('Error querying vectors with pgvector:', error);
    throw new Error('Failed to perform semantic retrieval search');
  }
};
