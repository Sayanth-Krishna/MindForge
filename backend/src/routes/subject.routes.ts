import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subject.controller';

const router = Router();

// Apply requireAuth middleware to protect all subject routes
router.use(requireAuth);

router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
