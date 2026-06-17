import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import * as storageService from '../services/supabase.service';
import * as pdfService from '../services/pdf.service';
import * as ragService from '../services/rag.service';
import * as geminiService from '../services/gemini';

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Set connection timeout to 10 minutes to accommodate rate-limited PDF ingestion
    req.setTimeout(600000);
    res.setTimeout(600000);

    const userId = req.user!.id as string;
    const { subjectId } = req.body;
    const file = req.file;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'subjectId is required',
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'No file was uploaded',
      });
    }

    // Verify subject ownership
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Subject not found or access denied',
      });
    }

    // Define unique storage path starting with userId to comply with standard Supabase folder RLS templates
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/subjects/${subjectId}/${timestamp}-${sanitizedFilename}`;

    // 1. Upload to Supabase Storage
    const fileUrl = await storageService.uploadFile(file, storagePath, req.headers.authorization);

    // 2. Parse PDF and extract pages text
    const parsedPages = await pdfService.parsePdf(file.buffer);

    // 3. Create Document entry in Neon Postgres
    const document = await prisma.document.create({
      data: {
        name: file.originalname,
        storagePath,
        fileUrl,
        fileSize: file.size,
        subjectId,
        userId,
      },
    });

    try {
      // 4. Split page text into overlapping chunks (using 1500 size / 300 overlap to reduce API calls)
      const chunks: pdfService.TextChunk[] = [];
      for (const page of parsedPages) {
        const pageChunks = pdfService.chunkPageText(page.text, page.pageNumber, 1500, 300);
        chunks.push(...pageChunks);
      }

      // 5. Generate embeddings and bulk save to vector database
      if (chunks.length > 0) {
        await ragService.storeDocumentChunks(document.id, chunks);
      }
    } catch (processingError) {
      console.error('Error processing document chunks/embeddings. Cleaning up document record...', processingError);
      // Clean up the document record to avoid orphaned database entries
      await prisma.document.delete({ where: { id: document.id } }).catch((cleanupError) => {
        console.error('Failed to delete document record during cleanup:', cleanupError);
      });
      throw processingError;
    }

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and indexed successfully',
      data: document,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSubjectDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const subjectId = req.params.subjectId as string;

    // Verify subject ownership
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Subject not found or access denied',
      });
    }

    const documents = await prisma.document.findMany({
      where: { subjectId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    return next(error);
  }
};

export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Document not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    // Verify ownership
    const document = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Document not found',
      });
    }

    // 1. Delete from Supabase Storage
    await storageService.deleteFile(document.storagePath, req.headers.authorization);

    // 2. Delete from Postgres (Prisma triggers cascade deletions on DocumentChunks)
    await prisma.document.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};

export const summarizeDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Document not found',
      });
    }

    // If summary is cached, return it directly
    if (document.summary) {
      return res.status(200).json({
        success: true,
        data: { summary: document.summary },
      });
    }

    // Load document content chunks to compile the full context
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: id },
      orderBy: { pageNumber: 'asc' },
      select: { content: true },
    });

    if (chunks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'This document has no indexable text content to summarize',
      });
    }

    const documentText = chunks.map((c) => c.content).join('\n\n');
    // Constrain context size to prevent extreme API latencies
    const sampleText = documentText.slice(0, 80000);

    const prompt = `You are an expert study assistant. Provide a comprehensive, highly-structured, and easy-to-read summary of the following study material. Use markdown headers, clean bullet points, and explicitly define any key terms or formulas.

Study Material:
---
${sampleText}
---

Summary:`;

    const summary = await geminiService.generateChatResponse(prompt);

    // Cache the generated summary in database
    await prisma.document.update({
      where: { id },
      data: { summary },
    });

    return res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    return next(error);
  }
};
