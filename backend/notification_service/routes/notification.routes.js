const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifcation.controller');

router.post('/send', notificationController.sendNotification);
router.get('/:userId', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;