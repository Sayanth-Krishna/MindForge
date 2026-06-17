import { Router } from 'express';
import authRoutes from './auth.routes';
import subjectRoutes from './subject.routes';
import documentRoutes from './document.routes';
import chatRoutes from './chat.routes';
import flashcardRoutes from './flashcard.routes';
import quizRoutes from './quiz.routes';

const router = Router();

// Mount sub-routers under their respective resources
router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/flashcards', flashcardRoutes);
router.use('/quizzes', quizRoutes);

export default router;
