import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';

const router = Router();

router.use(authRateLimiter);

router.get('/github', AuthController.githubLogin);
router.get('/github/callback', AuthController.githubCallback);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
