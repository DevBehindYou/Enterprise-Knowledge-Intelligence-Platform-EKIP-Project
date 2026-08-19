import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

router.post('/ask', chatController.ask);
router.post('/messages/:messageId/feedback', chatController.submitFeedback);
router.get('/conversations', chatController.listConversations);
router.get('/conversations/:id', chatController.getConversation);
router.patch('/conversations/:id', chatController.updateConversation);
router.delete('/conversations/:id', chatController.deleteConversation);

export default router;
