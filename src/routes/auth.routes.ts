import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/validate', (req, res) => authController.validateToken(req, res));
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

// Rotas protegidas
router.use(authMiddleware);
router.get('/me', (req, res) => authController.getMe(req, res));
router.put('/me', (req, res) => authController.updateProfile(req, res));

export { router as authRoutes };
