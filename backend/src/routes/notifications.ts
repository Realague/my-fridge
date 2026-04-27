import { Router } from 'express';
import { ExpirationNotificationController } from '../controllers/ExpirationNotificationController';
import { ExpirationNotificationService } from '../services/ExpirationNotificationService';
import { ExpirationNotificationRepository } from '../repositories/ExpirationNotificationRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { HouseholdSettingsRepository } from '../repositories/HouseholdSettingsRepository';
import { HouseholdSettingsService } from '../services/HouseholdSettingsService';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();

const notificationRepository = new ExpirationNotificationRepository();
const householdRepository = new HouseholdRepository();
const settingsRepository = new HouseholdSettingsRepository();
const settingsService = new HouseholdSettingsService(settingsRepository, householdRepository);
const notificationService = new ExpirationNotificationService(
  notificationRepository,
  householdRepository,
  settingsService
);
const notificationController = new ExpirationNotificationController(notificationService);

router.use(authenticateGoogleToken);

router.get('/:householdId/notifications', notificationController.getNotifications.bind(notificationController));
router.post(
  '/:householdId/notifications/read-all',
  notificationController.markAllRead.bind(notificationController)
);
router.delete(
  '/:householdId/notifications',
  notificationController.clearAll.bind(notificationController)
);
router.post(
  '/:householdId/notifications/:notificationId/read',
  notificationController.markRead.bind(notificationController)
);
router.delete(
  '/:householdId/notifications/:notificationId',
  notificationController.deleteNotification.bind(notificationController)
);
router.get(
  '/:householdId/expiring-now',
  notificationController.getExpiringNow.bind(notificationController)
);

export default router;
