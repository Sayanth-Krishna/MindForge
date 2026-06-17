import { PDFParse } from 'pdf-parse';

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  content: string;
  pageNumber: number;
}

/**
 * Extracts text from a PDF buffer page-by-page using pdf-parse.
 * @param buffer The PDF file buffer.
 */
export const parsePdf = async (buffer: Buffer): Promise<PageText[]> => {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    return result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text,
    }));
  } catch (error) {
    console.error('Error parsing PDF content:', error);
    throw new Error('Failed to parse PDF document text');
  }
};


/**
 * Splits page text into overlapping chunks of a target size, avoiding cutting words in half.
 * @param text The raw page text.
 * @param pageNumber The page number context for this chunk.
 * @param chunkSize The target maximum character count per chunk.
 * @param overlap The target character overlap between adjacent chunks.
 */
export const chunkPageText = (
  text: string,
  pageNumber: number,
  chunkSize = 1000,
  overlap = 200
): TextChunk[] => {
  const chunks: TextChunk[] = [];
  
  // Normalize double spaces and carriage returns but preserve general structure
  const cleanText = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  if (cleanText.length === 0) {
    return chunks;
  }

  let start = 0;
  while (start < cleanText.length) {
    let end = start + chunkSize;

    if (end < cleanText.length) {
      // Find the last space inside the overlap window to avoid splitting a word
      const lastSpace = cleanText.lastIndexOf(' ', end);
      if (lastSpace > start + chunkSize - overlap) {
        end = lastSpace;
      }
    } else {
      end = cleanText.length;
    }

    const content = cleanText.substring(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        pageNumber,
      });
    }

    start = end - overlap;
    
    // Safety break logic to avoid infinite loops
    if (start < 0) start = 0;
    if (end >= cleanText.length) break;
    if (chunkSize <= overlap) break;
  }

  return chunks;
};
