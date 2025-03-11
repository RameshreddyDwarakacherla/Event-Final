const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessDescription: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['catering', 'decoration', 'photography', 'venue', 'entertainment', 'transportation', 'other']
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    required: true,
    trim: true
  },
  businessAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  businessLogo: {
    type: String,
    default: ''
  },
  gallery: [{
    type: String
  }],
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true
    },
    priceUnit: {
      type: String,
      enum: ['flat', 'per_hour', 'per_person', 'per_day'],
      default: 'flat'
    }
  }],
  availability: [{
    date: Date,
    timeSlots: [{
      startTime: String,
      endTime: String,
      isBooked: {
        type: Boolean,
        default: false
      }
    }]
  }],
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String
  }],
  paymentDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    upiId: String,
    stripeAccountId: String
  },
  socialMedia: {
    website: String,
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
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

// Calculate average rating when a review is added or modified
VendorSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    return;
  }
  
  const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
  this.averageRating = sum / this.reviews.length;
};

module.exports = mongoose.model('Vendor', VendorSchema); 