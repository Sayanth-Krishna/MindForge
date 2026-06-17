import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authorization token was provided',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token directly with Supabase Auth API
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user || !user.email) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: error ? error.message : 'The authorization token is invalid',
      });
    }

    // Attach user properties to the Express request
    req.user = {
      id: user.id,
      email: user.email,
    };

    return next();
  } catch (error: any) {
    console.error('Supabase Auth verification error:', error.message || error);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
};
export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};
