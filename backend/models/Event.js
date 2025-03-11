const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['wedding', 'corporate', 'birthday', 'conference', 'other']
  },
  expectedAttendees: {
    type: Number,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  services: [{
    type: String,
    enum: ['venue', 'catering', 'decoration', 'photography', 'music', 'transportation']
  }],
  status: {
    type: String,
    enum: ['planning', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'planning'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', EventSchema); 