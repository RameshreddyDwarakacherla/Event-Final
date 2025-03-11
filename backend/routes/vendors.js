const express = require('express');
const {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  addService,
  updateService,
  deleteService,
  addReview
} = require('../controllers/vendorController');
const { protect, authorize, isVerified } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getVendors);
router.get('/:id', getVendor);

// Protected routes
router.post('/', protect, createVendor);
router.put('/:id', protect, updateVendor);
router.delete('/:id', protect, deleteVendor);

// Service routes
router.post('/:id/services', protect, authorize('vendor', 'admin'), addService);
router.put('/:id/services/:serviceId', protect, authorize('vendor', 'admin'), updateService);
router.delete('/:id/services/:serviceId', protect, authorize('vendor', 'admin'), deleteService);

// Review routes
router.post('/:id/reviews', protect, isVerified, addReview);

module.exports = router; 