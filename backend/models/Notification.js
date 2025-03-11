const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'booking_request', 
      'booking_confirmed', 
      'booking_cancelled', 
      'payment_received', 
      'payment_pending', 
      'message_received', 
      'review_received', 
      'event_reminder', 
      'system_notification',
      'ai_recommendation'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Event', 'Booking', 'Payment', 'Chat', 'User', 'Vendor']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  actionUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema); 