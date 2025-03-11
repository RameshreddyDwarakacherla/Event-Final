const Vendor = require('../models/Vendor');
const User = require('../models/User');

// @desc    Create vendor profile
// @route   POST /api/vendors
// @access  Private (User role)
exports.createVendor = async (req, res, next) => {
  try {
    // Check if vendor profile already exists for this user
    const existingVendor = await Vendor.findOne({ userId: req.user.id });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile already exists for this user'
      });
    }

    // Create vendor profile
    const vendor = await Vendor.create({
      userId: req.user.id,
      businessName: req.body.businessName,
      businessDescription: req.body.businessDescription,
      serviceType: req.body.serviceType,
      contactEmail: req.body.contactEmail || req.user.email,
      contactPhone: req.body.contactPhone || req.user.phone,
      businessAddress: req.body.businessAddress,
      services: req.body.services || []
    });

    // Update user role to vendor
    await User.findByIdAndUpdate(req.user.id, { role: 'vendor' });

    res.status(201).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Public
exports.getVendors = async (req, res, next) => {
  try {
    // Build query
    let query = {};

    // Filter by service type
    if (req.query.serviceType) {
      query.serviceType = req.query.serviceType;
    }

    // Filter by verification status
    if (req.query.isVerified) {
      query.isVerified = req.query.isVerified === 'true';
    }

    // Filter by rating
    if (req.query.minRating) {
      query.averageRating = { $gte: parseFloat(req.query.minRating) };
    }

    // Search by business name
    if (req.query.search) {
      query.businessName = { $regex: req.query.search, $options: 'i' };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Vendor.countDocuments(query);

    // Execute query
    const vendors = await Vendor.find(query)
      .populate('userId', 'name email')
      .skip(startIndex)
      .limit(limit)
      .sort({ averageRating: -1 });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: vendors.length,
      pagination,
      data: vendors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor
// @route   GET /api/vendors/:id
// @access  Public
exports.getVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('userId', 'name email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor profile
// @route   PUT /api/vendors/:id
// @access  Private (Vendor owner or Admin)
exports.updateVendor = async (req, res, next) => {
  try {
    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Make sure user is vendor owner or admin
    if (vendor.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vendor profile'
      });
    }

    // Update vendor
    vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vendor profile
// @route   DELETE /api/vendors/:id
// @access  Private (Vendor owner or Admin)
exports.deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Make sure user is vendor owner or admin
    if (vendor.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this vendor profile'
      });
    }

    await vendor.remove();

    // Update user role back to user if this is the only vendor profile
    const vendorCount = await Vendor.countDocuments({ userId: vendor.userId });
    if (vendorCount === 0) {
      await User.findByIdAndUpdate(vendor.userId, { role: 'user' });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add vendor service
// @route   POST /api/vendors/:id/services
// @access  Private (Vendor owner)
exports.addService = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Make sure user is vendor owner
    if (vendor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vendor profile'
      });
    }

    // Add service
    vendor.services.push(req.body);
    await vendor.save();

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor service
// @route   PUT /api/vendors/:id/services/:serviceId
// @access  Private (Vendor owner)
exports.updateService = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Make sure user is vendor owner
    if (vendor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vendor profile'
      });
    }

    // Find service index
    const serviceIndex = vendor.services.findIndex(
      service => service._id.toString() === req.params.serviceId
    );

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update service
    vendor.services[serviceIndex] = {
      ...vendor.services[serviceIndex].toObject(),
      ...req.body
    };

    await vendor.save();

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vendor service
// @route   DELETE /api/vendors/:id/services/:serviceId
// @access  Private (Vendor owner)
exports.deleteService = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Make sure user is vendor owner
    if (vendor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this vendor profile'
      });
    }

    // Find service index
    const serviceIndex = vendor.services.findIndex(
      service => service._id.toString() === req.params.serviceId
    );

    if (serviceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Remove service
    vendor.services.splice(serviceIndex, 1);
    await vendor.save();

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add vendor review
// @route   POST /api/vendors/:id/reviews
// @access  Private (User role)
exports.addReview = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if user has already reviewed this vendor
    const alreadyReviewed = vendor.reviews.find(
      review => review.userId.toString() === req.user.id
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this vendor'
      });
    }

    // Add review
    const review = {
      userId: req.user.id,
      rating: req.body.rating,
      comment: req.body.comment
    };

    vendor.reviews.push(review);

    // Calculate average rating
    vendor.calculateAverageRating();
    await vendor.save();

    res.status(201).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
}; 