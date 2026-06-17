import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  generateFlashcards,
  getSubjectFlashcards,
  deleteFlashcard,
} from '../controllers/flashcard.controller';

const router = Router();

// Protect all flashcard endpoints
router.use(requireAuth);

router.post('/generate', generateFlashcards);
router.get('/subject/:subjectId', getSubjectFlashcards);
router.delete('/:id', deleteFlashcard);

export default router;
