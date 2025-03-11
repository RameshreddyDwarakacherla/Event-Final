const express = require('express');
const { protect } = require('../middleware/auth');
const router = express.Router();
const Event = require('../models/Event');

// Note: We'll need to create an eventController file later
// For now, we'll create placeholder routes

// @route   GET /api/events
// @desc    Get all events for the authenticated user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const events = await Event.find({ user: req.user.id })
      .sort({ date: 'asc' });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
});

// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Server error while fetching event' });
  }
});

// @route   POST /api/events
// @desc    Create a new event
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      user: req.user.id // Add the authenticated user's ID
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error while creating event' });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error while updating event' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
});

module.exports = router; 