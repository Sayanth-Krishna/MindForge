import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { syncProfile } from '../controllers/auth.controller';

const router = Router();

// Profile synchronization endpoint, secured by requireAuth middleware
router.post('/sync', requireAuth, syncProfile);

export default router;
