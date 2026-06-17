import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendMessage,
  deleteChatSession,
} from '../controllers/chat.controller';

const router = Router();

// Secure all chat sessions endpoints
router.use(requireAuth);

router.get('/sessions', getChatSessions);
router.post('/sessions', createChatSession);
router.get('/sessions/:id/messages', getChatMessages);
router.post('/sessions/:id/messages', sendMessage);
router.delete('/sessions/:id', deleteChatSession);

export default router;
