import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  generateQuiz,
  getSubjectQuizzes,
  getQuizById,
  deleteQuiz,
} from '../controllers/quiz.controller';

const router = Router();

// Protect all quiz endpoints
router.use(requireAuth);

router.post('/generate', generateQuiz);
router.get('/subject/:subjectId', getSubjectQuizzes);
router.get('/:id', getQuizById);
router.delete('/:id', deleteQuiz);

export default router;
