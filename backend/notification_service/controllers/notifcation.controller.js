const Notification = require('../models/notificationModel');
const { sendEmail } = require('../services/email.service');
const { sendPush } = require('../services/push.service');

// ✅ Create and send notification
exports.sendNotification = async (req, res) => {
  try {
    const { userId, type, title, message, email } = req.body;

    if (!userId || !message)
      return res.status(400).json({ message: "Missing required fields" });

    // Store in DB
    const notification = await Notification.create({
      userId,
      type,
      title,
      message
    });

    // Optional: Email + Push
    if (email) await sendEmail(email, title || "Ride Update", message);
    await sendPush(userId, message);

    res.status(201).json({
      message: "Notification sent successfully",
      notification
    });
  } catch (error) {
    console.error("❌ sendNotification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get all notifications for a user
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ getNotifications error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });

    res.status(200).json({ message: "Marked as read", notification });
  } catch (error) {
    console.error("❌ markAsRead error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};