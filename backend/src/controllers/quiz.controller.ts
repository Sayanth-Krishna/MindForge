import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import * as geminiService from '../services/gemini';

interface QuizQuestionInput {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface QuizInput {
  questions: QuizQuestionInput[];
}

export const generateQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const { title, subjectId, documentId, count = 5 } = req.body;

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

    // Retrieve context chunks based on scope (specific document or subject-wide)
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
        message: 'No indexable document text available in this scope to generate a quiz',
      });
    }

    const fullText = chunks.map((c) => c.content).join('\n\n');
    const sampledText = fullText.slice(0, 50000);

    const prompt = `You are an expert study assistant. Based on the following study materials, generate exactly ${count} multiple-choice questions for a student quiz.
Each question must contain:
1. "question": The clear question string.
2. "options": An array of exactly 4 strings representing multi-choice possibilities.
3. "correctOptionIndex": The 0-indexed integer of the correct option in the options array.
4. "explanation": A concise, detailed sentence explaining why that option is correct based on the context.

Focus on core concepts, important definitions, and facts. Do not generate overly obvious incorrect options.

Your response must be a valid JSON object matching this structure:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 1,
      "explanation": "Explanation for why Option B is correct"
    }
  ]
}`;

    // 1. Fetch structured JSON quiz
    const generatedQuiz = await geminiService.generateStructuredJson<QuizInput>(
      `${prompt}\n\nStudy Material:\n---\n${sampledText}\n---`
    );

    if (!generatedQuiz || !Array.isArray(generatedQuiz.questions) || generatedQuiz.questions.length === 0) {
      throw new Error('AI failed to return a valid list of quiz questions');
    }

    // 2. Save Quiz and QuizQuestions inside database transaction
    const quiz = await prisma.quiz.create({
      data: {
        title,
        subjectId,
        documentId: documentId || null,
        userId,
      },
    });

    const questionsData = generatedQuiz.questions.map((q) => ({
      quizId: quiz.id,
      question: q.question,
      options: q.options as any, // Cast JSON array
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
    }));

    await prisma.quizQuestion.createMany({
      data: questionsData,
    });

    const fullQuiz = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Generated quiz "${title}" with ${questionsData.length} questions successfully`,
      data: fullQuiz,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSubjectQuizzes = async (
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

    const quizzes = await prisma.quiz.findMany({
      where: { subjectId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    return next(error);
  }
};

export const getQuizById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Quiz not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    // Verify ownership
    const quiz = await prisma.quiz.findFirst({
      where: { id, userId },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Quiz not found',
      });
    }

    await prisma.quiz.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};
