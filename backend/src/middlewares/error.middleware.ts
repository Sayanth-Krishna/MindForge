import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('❌ Server Exception:', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected server error occurred';

  return res.status(status).json({
    success: false,
    error: err.name || 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
