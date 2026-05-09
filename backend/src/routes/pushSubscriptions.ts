import { Router } from 'express';
import { PushSubscriptionController } from '../controllers/PushSubscriptionController';
import { PushNotificationService } from '../services/PushNotificationService';
import { PushSubscriptionRepository } from '../repositories/PushSubscriptionRepository';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();

const pushSubscriptionRepository = new PushSubscriptionRepository();
const pushService = new PushNotificationService(pushSubscriptionRepository);
const pushController = new PushSubscriptionController(pushService);

router.use(authenticateGoogleToken);

router.get('/vapid-public-key', pushController.getVapidKey.bind(pushController));
router.post('/subscriptions', pushController.subscribe.bind(pushController));
router.delete('/subscriptions', pushController.unsubscribe.bind(pushController));

export default router;
