import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createSubjectSchema, updateSubjectSchema } from '../validators/subject.validator';

export const getSubjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const subjects = await prisma.subject.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    
    return res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSubjectById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    const subject = await prisma.subject.findFirst({
      where: { id, userId },
      include: {
        documents: {
          select: {
            id: true,
            name: true,
            storagePath: true,
            fileUrl: true,
            fileSize: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Subject not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    return next(error);
  }
};

export const createSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;

    // Validate request body
    const validationResult = createSubjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid input data',
        details: validationResult.error.format(),
      });
    }

    const { name, description, color } = validationResult.data;

    const subject = await prisma.subject.create({
      data: {
        name,
        description,
        color,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    // Verify ownership
    const existingSubject = await prisma.subject.findFirst({
      where: { id, userId },
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Subject not found',
      });
    }

    // Validate input data
    const validationResult = updateSubjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid input data',
        details: validationResult.error.format(),
      });
    }

    const { name, description, color } = validationResult.data;

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        color: color !== undefined ? color : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id as string;
    const id = req.params.id as string;

    // Verify ownership
    const existingSubject = await prisma.subject.findFirst({
      where: { id, userId },
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Subject not found',
      });
    }

    // Delete subject. Prisma handles cascades if configured (onDelete: Cascade)
    await prisma.subject.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};
