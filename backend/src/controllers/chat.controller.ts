import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import * as ragService from '../services/rag.service';
import * as geminiService from '../services/gemini';

export const getChatSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const subjectId = req.query.subjectId as string;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'subjectId is required in query params',
      });
    }

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId,
        subjectId: subjectId as string,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    return next(error);
  }
};

export const createChatSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const { title, subjectId, documentId } = req.body;

    if (!subjectId || !title) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'title and subjectId are required',
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

    // If documentId is provided, verify it belongs to this subject/user
    if (documentId) {
      const document = await prisma.document.findFirst({
        where: { id: documentId, subjectId, userId },
      });
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Document not found in this subject',
        });
      }
    }

    const session = await prisma.chatSession.create({
      data: {
        title,
        subjectId,
        documentId: documentId || null,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Chat session created successfully',
      data: session,
    });
  } catch (error) {
    return next(error);
  }
};

export const getChatMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const sessionId = req.params.id as string;

    // Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Chat session not found',
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return next(error);
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const sessionId = req.params.id as string;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Message content cannot be empty',
      });
    }

    // Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Chat session not found',
      });
    }

    // Determine RAG search scope (list of document IDs)
    let documentIds: string[] = [];

    if (session.documentId) {
      documentIds = [session.documentId];
    } else {
      // Find all documents inside the subject
      const docs = await prisma.document.findMany({
        where: { subjectId: session.subjectId, userId },
        select: { id: true },
      });
      documentIds = docs.map((d) => d.id);
    }

    // 1. Perform pgvector similarity search
    let retrievedChunks: ragService.RetrievedChunk[] = [];
    if (documentIds.length > 0) {
      retrievedChunks = await ragService.searchSimilarChunks(documentIds, content, 5);
    }

    // Filter retrieved chunks by similarity threshold (e.g. 0.3 to ensure relevance)
    const relevantChunks = retrievedChunks.filter((c) => c.similarity >= 0.3);

    // 2. Build system context block
    let contextText = '';
    const sourcesData: Array<{ chunkId: string; documentName: string; pageNumber: number | null }> = [];

    if (relevantChunks.length > 0) {
      contextText = relevantChunks
        .map((c) => {
          sourcesData.push({
            chunkId: c.id,
            documentName: c.documentName,
            pageNumber: c.pageNumber,
          });
          return `[Source Document: ${c.documentName}, Page: ${c.pageNumber || 'N/A'}]\nContent Chunk: ${c.content}`;
        })
        .join('\n\n');
    }

    const systemPrompt = `You are MindForge, an expert, encouraging study assistant. Use the following context retrieved from the student's uploaded notes to answer their question.
Your answers should prioritize the provided context. If the answer cannot be found in the context, do your best to answer based on general knowledge, but clearly state that the information was not found in the uploaded documents.

Retrieved Context:
---
${contextText || 'No relevant study materials found.'}
---

Student Question: ${content}`;

    // 3. Load chat history (limit to last 10 messages to keep request lightweight)
    const messageHistory = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // Map history to Gemini API format
    const geminiHistory: geminiService.ChatHistoryMessage[] = messageHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // 4. Generate AI completion
    const assistantResponse = await geminiService.generateChatResponse(systemPrompt, geminiHistory);

    // 5. Store conversation records in the database
    // Add User Message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content,
      },
    });

    // Add Assistant Message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantResponse,
        sources: sourcesData.length > 0 ? (sourcesData as any) : null,
      },
    });

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        sources: sourcesData,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteChatSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const sessionId = req.params.id as string;

    // Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Chat session not found or access denied',
      });
    }

    // Delete session from database (cascades to ChatMessage automatically)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return res.status(200).json({
      success: true,
      message: 'Chat session deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};
