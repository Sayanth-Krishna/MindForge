import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import {
  uploadDocument,
  getSubjectDocuments,
  getDocumentById,
  deleteDocument,
  summarizeDocument,
} from '../controllers/document.controller';

const router = Router();

// Secure all document endpoints
router.use(requireAuth);

// Single file upload endpoint (expects multipart key 'file')
router.post('/', uploadMiddleware.single('file'), uploadDocument);

router.get('/subject/:subjectId', getSubjectDocuments);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);
router.post('/:id/summarize', summarizeDocument);

export default router;
