import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export const syncProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No user information found in request context',
      });
    }

    const { fullName, avatarUrl } = req.body;

    // Upsert profile into database using Supabase's unique auth ID
    const profile = await prisma.profile.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email,
        fullName: fullName !== undefined ? fullName : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      },
      create: {
        id: authUser.id,
        email: authUser.email,
        fullName: fullName || null,
        avatarUrl: avatarUrl || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile synchronized successfully',
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
};
