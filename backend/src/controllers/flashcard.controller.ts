import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import * as geminiService from '../services/gemini';

export const generateFlashcards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const { subjectId, documentId, count = 5 } = req.body;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'subjectId is required',
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

    // Determine context scope (specific document or all documents under subject)
    let chunks;
    if (documentId) {
      // Verify document ownership
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

      chunks = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { pageNumber: 'asc' },
        select: { content: true },
      });
    } else {
      // Fetch chunks for all documents in subject
      const docs = await prisma.document.findMany({
        where: { subjectId, userId },
        select: { id: true },
      });
      const docIds = docs.map((d) => d.id);

      chunks = await prisma.documentChunk.findMany({
        where: { documentId: { in: docIds } },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      });
    }

    if (chunks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'No indexable document text available in this scope to generate flashcards',
      });
    }

    // Extract raw text context
    const fullText = chunks.map((c) => c.content).join('\n\n');
    const sampledText = fullText.slice(0, 50000); // Constraint input text size

    // Construct prompting instruction requesting JSON array of cards
    const prompt = `You are an expert study assistant. Based on the following study materials, generate exactly ${count} educational flashcards.
Each flashcard must contain a "front" (a question, concept name, term, or formula to define) and a "back" (the clear, concise explanation, answer, definition, or solution).
Focus on core terms, conceptual understandings, definitions, and key takeaways. Do not generate overly simple questions.

Your response must be a valid JSON array matching this structure:
[
  {
    "front": "The concept name or question",
    "back": "The concise definition, key answer, or explanation"
  }
]

Study Material:
---
${sampledText}
---`;

    // 1. Query Gemini for structured JSON array
    interface FlashcardInput {
      front: string;
      back: string;
    }
    const generatedCards = await geminiService.generateStructuredJson<FlashcardInput[]>(prompt);

    if (!Array.isArray(generatedCards) || generatedCards.length === 0) {
      throw new Error('AI failed to return a valid list of flashcards');
    }

    // 2. Save cards to database inside a transaction
    const savedCards = await prisma.$transaction(
      generatedCards.map((card) =>
        prisma.flashcard.create({
          data: {
            front: card.front,
            back: card.back,
            subjectId,
            documentId: documentId || null,
            userId,
          },
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: `Generated ${savedCards.length} flashcards successfully`,
      data: savedCards,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSubjectFlashcards = async (
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

    const flashcards = await prisma.flashcard.findMany({
      where: { subjectId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: flashcards,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteFlashcard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    // Verify card ownership
    const flashcard = await prisma.flashcard.findFirst({
      where: { id, userId },
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Flashcard not found',
      });
    }

    await prisma.flashcard.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Flashcard deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};
