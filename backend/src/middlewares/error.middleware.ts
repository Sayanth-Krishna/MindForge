import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('❌ Server Exception:', err);

  const status = err.statusCode || err.status || 500;
  let message = err.message || 'An unexpected server error occurred';

  if (status === 429) {
    if (message.includes('quota') || message.includes('Quota exceeded') || message.includes('Limit exceeded')) {
      message = 'Gemini API Daily Quota Exceeded. Please check your plan and billing details in Google AI Studio, or try again tomorrow.';
    } else {
      message = 'Gemini API Rate Limit Exceeded. Please wait a moment and try again.';
    }
  }

  return res.status(status).json({
    success: false,
    error: err.name || 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
