import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Tighter limit on auth endpoints specifically — brute-force mitigation.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateMe);
// Rate-limited like the other credential endpoints: this one verifies the
// current password, so it's an online guessing surface if left wide open.
router.post('/change-password', requireAuth, authLimiter, authController.changePassword);
router.post('/logout-all', requireAuth, authController.logoutEverywhere);

export default router;
