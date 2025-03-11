const express = require('express');
const {
  getVendorRecommendations,
  getBudgetRecommendations,
  generateSocialMediaPost,
  getPricingSuggestions
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Vendor recommendations
router.get('/recommendations/vendors', protect, getVendorRecommendations);

// Budget recommendations
router.get('/recommendations/budget', protect, getBudgetRecommendations);

// Social media post generation
router.post('/social-media', protect, generateSocialMediaPost);

// Pricing suggestions (vendor only)
router.get('/pricing-suggestions', protect, authorize('vendor', 'admin'), getPricingSuggestions);

module.exports = router; 