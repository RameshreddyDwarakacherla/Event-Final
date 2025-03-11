const OpenAI = require('openai');
const Vendor = require('../models/Vendor');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// @desc    Get vendor recommendations based on user preferences
// @route   GET /api/ai/recommendations/vendors
// @access  Private
exports.getVendorRecommendations = async (req, res, next) => {
  try {
    const { eventType, budget, location, guestCount, preferences } = req.query;
    
    // Get user's past bookings
    const userBookings = await Booking.find({ userId: req.user.id })
      .populate('vendorId')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Extract vendor types and ratings from past bookings
    const pastVendorPreferences = userBookings.map(booking => ({
      serviceType: booking.vendorId.serviceType,
      rating: booking.vendorId.averageRating
    }));
    
    // Get top-rated vendors
    let vendorQuery = {};
    
    if (eventType) {
      // Find vendors that match the event type
      const vendorTypes = getVendorTypesForEvent(eventType);
      vendorQuery.serviceType = { $in: vendorTypes };
    }
    
    // Get verified vendors with good ratings
    vendorQuery.isVerified = true;
    vendorQuery.averageRating = { $gte: 4 };
    
    const vendors = await Vendor.find(vendorQuery)
      .sort({ averageRating: -1 })
      .limit(20);
    
    // Use OpenAI to generate personalized recommendations
    const prompt = generateRecommendationPrompt(
      vendors,
      pastVendorPreferences,
      {
        eventType,
        budget,
        location,
        guestCount,
        preferences
      }
    );
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI event planning assistant that provides personalized vendor recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const recommendations = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get budget recommendations
// @route   GET /api/ai/recommendations/budget
// @access  Private
exports.getBudgetRecommendations = async (req, res, next) => {
  try {
    const { eventType, totalBudget, guestCount, location, preferences } = req.query;
    
    // Get average costs for different vendor types
    const vendorTypes = getVendorTypesForEvent(eventType);
    const vendorCosts = {};
    
    for (const type of vendorTypes) {
      const vendors = await Vendor.find({ 
        serviceType: type,
        isVerified: true
      });
      
      if (vendors.length > 0) {
        // Calculate average cost for this vendor type
        let totalCost = 0;
        let count = 0;
        
        vendors.forEach(vendor => {
          vendor.services.forEach(service => {
            totalCost += service.price;
            count++;
          });
        });
        
        vendorCosts[type] = count > 0 ? totalCost / count : 0;
      }
    }
    
    // Use OpenAI to generate budget recommendations
    const prompt = generateBudgetPrompt(
      vendorCosts,
      {
        eventType,
        totalBudget,
        guestCount,
        location,
        preferences
      }
    );
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI event planning assistant that provides personalized budget recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const recommendations = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate social media post
// @route   POST /api/ai/social-media
// @access  Private
exports.generateSocialMediaPost = async (req, res, next) => {
  try {
    const { eventId, platform, tone } = req.body;
    
    // Get event details
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Make sure user owns the event
    if (event.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this event'
      });
    }
    
    // Use OpenAI to generate social media post
    const prompt = generateSocialMediaPrompt(
      event,
      platform,
      tone
    );
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI social media content creator that generates engaging event announcements."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    const postContent = completion.choices[0].message.content;
    
    res.status(200).json({
      success: true,
      data: {
        platform,
        content: postContent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pricing suggestions for vendors
// @route   GET /api/ai/pricing-suggestions
// @access  Private (Vendor only)
exports.getPricingSuggestions = async (req, res, next) => {
  try {
    const { serviceType, serviceName, currentPrice } = req.query;
    
    // Get vendor's profile
    const vendor = await Vendor.findOne({ userId: req.user.id });
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }
    
    // Get market data for similar services
    const similarVendors = await Vendor.find({
      serviceType: serviceType || vendor.serviceType,
      _id: { $ne: vendor._id }
    });
    
    const marketPrices = [];
    
    similarVendors.forEach(v => {
      v.services.forEach(service => {
        if (serviceName) {
          if (service.name.toLowerCase().includes(serviceName.toLowerCase())) {
            marketPrices.push({
              price: service.price,
              priceUnit: service.priceUnit,
              vendorRating: v.averageRating
            });
          }
        } else {
          marketPrices.push({
            price: service.price,
            priceUnit: service.priceUnit,
            vendorRating: v.averageRating
          });
        }
      });
    });
    
    // Use OpenAI to generate pricing suggestions
    const prompt = generatePricingSuggestionPrompt(
      marketPrices,
      {
        serviceType: serviceType || vendor.serviceType,
        serviceName,
        currentPrice,
        vendorRating: vendor.averageRating
      }
    );
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI pricing analyst that provides market-based pricing suggestions for event vendors."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const suggestions = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const getVendorTypesForEvent = (eventType) => {
  const commonTypes = ['catering', 'decoration', 'photography', 'venue'];
  
  switch (eventType) {
    case 'wedding':
      return [...commonTypes, 'entertainment', 'transportation'];
    case 'corporate':
      return [...commonTypes, 'entertainment', 'technology'];
    case 'birthday':
      return [...commonTypes, 'entertainment'];
    case 'conference':
      return ['venue', 'catering', 'technology', 'photography'];
    default:
      return commonTypes;
  }
};

const generateRecommendationPrompt = (vendors, pastPreferences, criteria) => {
  return `
    I need vendor recommendations for an event with the following criteria:
    - Event Type: ${criteria.eventType || 'Not specified'}
    - Budget: ${criteria.budget || 'Not specified'}
    - Location: ${criteria.location || 'Not specified'}
    - Guest Count: ${criteria.guestCount || 'Not specified'}
    - Additional Preferences: ${criteria.preferences || 'None'}
    
    The user has previously booked these types of vendors:
    ${JSON.stringify(pastPreferences)}
    
    Here are the available vendors:
    ${JSON.stringify(vendors.map(v => ({
      id: v._id,
      businessName: v.businessName,
      serviceType: v.serviceType,
      rating: v.averageRating,
      services: v.services.map(s => ({
        name: s.name,
        price: s.price,
        priceUnit: s.priceUnit
      }))
    })))}
    
    Please provide recommendations for each vendor type needed for this event.
    For each recommendation, include:
    1. The vendor ID
    2. Why this vendor is recommended
    3. Estimated cost
    4. Any special considerations
    
    Format your response as a JSON object with the following structure:
    {
      "recommendations": [
        {
          "vendorId": "id",
          "vendorName": "name",
          "serviceType": "type",
          "reason": "reason for recommendation",
          "estimatedCost": number,
          "specialConsiderations": "any special notes"
        }
      ],
      "totalEstimatedCost": number,
      "budgetAnalysis": "analysis of how these recommendations fit within the budget"
    }
  `;
};

const generateBudgetPrompt = (vendorCosts, criteria) => {
  return `
    I need budget recommendations for an event with the following criteria:
    - Event Type: ${criteria.eventType || 'Not specified'}
    - Total Budget: ${criteria.totalBudget || 'Not specified'}
    - Guest Count: ${criteria.guestCount || 'Not specified'}
    - Location: ${criteria.location || 'Not specified'}
    - Additional Preferences: ${criteria.preferences || 'None'}
    
    Here are the average costs for different vendor types in this area:
    ${JSON.stringify(vendorCosts)}
    
    Please provide a detailed budget breakdown for this event, including:
    1. Recommended allocation for each vendor type
    2. Estimated cost per guest
    3. Areas where costs can be reduced if needed
    4. Alternative options for staying within budget
    
    Format your response as a JSON object with the following structure:
    {
      "budgetBreakdown": [
        {
          "vendorType": "type",
          "allocation": number,
          "percentageOfTotal": number,
          "notes": "any special notes"
        }
      ],
      "costPerGuest": number,
      "savingsSuggestions": [
        {
          "area": "area where costs can be reduced",
          "potentialSavings": number,
          "impact": "description of impact on event quality"
        }
      ],
      "alternativeOptions": [
        {
          "description": "alternative approach",
          "estimatedSavings": number
        }
      ]
    }
  `;
};

const generateSocialMediaPrompt = (event, platform, tone) => {
  return `
    I need to create a social media post announcing an event with the following details:
    - Event Name: ${event.title}
    - Event Type: ${event.eventType}
    - Date: ${new Date(event.startDate).toLocaleDateString()}
    - Location: ${event.location.city}, ${event.location.state}
    - Description: ${event.description}
    
    The post should be for ${platform} and have a ${tone || 'friendly'} tone.
    
    Please create an engaging post that would generate excitement about this event.
    Include appropriate hashtags and a call to action.
  `;
};

const generatePricingSuggestionPrompt = (marketPrices, criteria) => {
  return `
    I need pricing suggestions for a vendor service with the following details:
    - Service Type: ${criteria.serviceType}
    - Service Name: ${criteria.serviceName || 'Not specified'}
    - Current Price: ${criteria.currentPrice || 'Not specified'}
    - Vendor Rating: ${criteria.vendorRating || 'Not specified'}
    
    Here is market data for similar services:
    ${JSON.stringify(marketPrices)}
    
    Please provide pricing suggestions based on this market data, including:
    1. Recommended price range
    2. Optimal price point
    3. Analysis of how the vendor's rating affects pricing
    4. Seasonal pricing strategy
    
    Format your response as a JSON object with the following structure:
    {
      "recommendedPriceRange": {
        "min": number,
        "max": number
      },
      "optimalPrice": number,
      "analysis": "detailed analysis of pricing recommendation",
      "seasonalStrategy": [
        {
          "season": "season name",
          "adjustmentFactor": number,
          "reasoning": "reason for adjustment"
        }
      ]
    }
  `;
}; 