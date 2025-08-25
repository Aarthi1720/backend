import Offer from '../models/Offer.js';
import Hotel from '../models/Hotel.js';


// ✅ Admin: Create a new offer for a specific hotel
export const createOffer = async (req, res) => {
  try {
    const {
      hotelId,
      code,
      discountPercent,
      validFrom,
      validTo,
      minBookingAmount = 0,
      maxRedemptions = 0,
      description = ''
    } = req.body;

    // Basic input checks
    if (!hotelId || !code || !discountPercent || !validFrom || !validTo) {
      return res.status(400).json({ message: 'hotelId, code, discountPercent, validFrom, and validTo are required' });
    }

    // Ensure hotel exists
    const hotel = await Hotel.findById(hotelId).select('_id');
    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    // Normalize and validate
    const normalizedCode = String(code).trim().toUpperCase();
    const percent = Number(discountPercent);
    if (Number.isNaN(percent) || percent < 1 || percent > 100) {
      return res.status(400).json({ message: 'discountPercent must be between 1 and 100' });
    }

    const fromDate = new Date(validFrom);
    const toDate = new Date(validTo);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ message: 'validFrom and validTo must be valid dates' });
    }
    if (toDate < fromDate) {
      return res.status(400).json({ message: 'validTo cannot be before validFrom' });
    }

    // Check duplicate code for this hotel
    const existing = await Offer.findOne({ hotelId, code: normalizedCode });
    if (existing) {
      return res.status(409).json({ message: 'Offer code already exists for this hotel' });
    }

    const offer = await Offer.create({
      hotelId,
      code: normalizedCode,
      discountPercent: percent,
      validFrom: fromDate,
      validTo: toDate,
      minBookingAmount: Number(minBookingAmount) || 0,
      maxRedemptions: Number(maxRedemptions) || 0,
      description,
      isActive: true,
      createdBy: req.user?._id // optional, if you attach user in auth middleware
    });

    const populated = await offer.populate({ path: 'hotelId', select: 'name location' });
    res.status(201).json(populated);
  } catch (error) {
    // Handle unique index conflict gracefully
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Offer code must be unique per hotel' });
    }
    console.error('Offer creation failed:', {
  body: req.body,
  error: error.message,
  stack: error.stack,
});
    res.status(500).json({ message: 'Failed to create offer' });
  }
};


export const applyOffer = async (req, res) => {
  try {
    const { code, cartTotal, hotelId } = req.body;

    // Basic input validation
    if (!code || typeof cartTotal !== 'number') {
      return res.status(400).json({ message: 'code and cartTotal are required' });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    // If hotelId is passed, match it too
    const query = hotelId ? { code: normalizedCode, hotelId } : { code: normalizedCode };
    const offer = await Offer.findOne(query);

    if (!offer) return res.status(404).json({ message: 'Invalid code' });

    const now = new Date();

    if (!offer.isActive) return res.status(400).json({ message: 'Offer is inactive' });
    if (now < offer.validFrom) return res.status(400).json({ message: 'Offer not yet valid' });
    if (now > offer.validTo) {
      offer.isActive = false;
      await offer.save(); // auto-deactivate expired offer
      return res.status(400).json({ message: 'Offer expired' });
    }

    if (cartTotal < (offer.minBookingAmount || 0)) {
      return res.status(400).json({ message: 'Minimum booking amount not met' });
    }

    if (offer.maxRedemptions > 0 && offer.redemptionCount >= offer.maxRedemptions) {
      return res.status(400).json({ message: 'Offer usage limit reached' });
    }

    // ✅ Calculate discount
    let discount = 0;

    if (offer.discountPercent) {
      discount = Math.floor((offer.discountPercent / 100) * cartTotal);
    } else if (offer.discountFlat) {
      discount = Math.min(offer.discountFlat, cartTotal);
    }

    const newTotal = Math.max(0, cartTotal - discount);

    // ✅ Apply usage (increment redemption count)
    offer.redemptionCount = (offer.redemptionCount || 0) + 1;
    await offer.save();

    return res.json({
      code: offer.code,
      discount,
      newTotal,
      usage: {
        used: offer.redemptionCount,
        max: offer.maxRedemptions
      }
    });
  } catch (err) {
    console.error('applyOffer error:', err);
    return res.status(500).json({ message: 'Failed to apply offer' });
  }
};





// ✅ Admin: Get all offers (optional filter by hotel and/or status)
export const getOffers = async (req, res) => {
  try {
    const { hotelId, status } = req.query;
    const filter = {};

    if (hotelId) filter.hotelId = hotelId;

    // Filter by status
    if (status === 'active') {
      filter.isActive = true;
      filter.validTo = { $gte: new Date() };
    } else if (status === 'expired') {
      filter.validTo = { $lt: new Date() };
    }

    const offers = await Offer.find(filter)
      .populate({ path: 'hotelId', select: 'name location' })
      .sort({ validFrom: -1 });

    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ message: 'Failed to fetch offers' });
  }
};


export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    // Normalize code
    if (updates.code) {
      updates.code = String(updates.code).trim().toUpperCase();
    }

    // Validate discountPercent
    if (updates.discountPercent !== undefined) {
      const percent = Number(updates.discountPercent);
      if (Number.isNaN(percent) || percent < 1 || percent > 100) {
        return res.status(400).json({ message: 'discountPercent must be between 1 and 100' });
      }
    }

    // Validate dates
    if (updates.validFrom || updates.validTo) {
      const from = updates.validFrom ? new Date(updates.validFrom) : undefined;
      const to = updates.validTo ? new Date(updates.validTo) : undefined;
      if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
        return res.status(400).json({ message: 'validFrom and validTo must be valid dates' });
      }
      if (from && to && to < from) {
        return res.status(400).json({ message: 'validTo cannot be before validFrom' });
      }
    }

    // Ensure numbers are parsed
    if (updates.minBookingAmount !== undefined) {
      updates.minBookingAmount = Number(updates.minBookingAmount) || 0;
    }
    if (updates.maxRedemptions !== undefined) {
      updates.maxRedemptions = Number(updates.maxRedemptions) || 0;
    }

    const offer = await Offer.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).populate({ path: 'hotelId', select: 'name location' });

    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    res.json(offer);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Offer code must be unique per hotel' });
    }
    console.error('Error updating offer:', error);
    res.status(500).json({ message: 'Failed to update offer' });
  }
};


export const deactivateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).populate({ path: 'hotelId', select: 'name location' });

    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json({ message: 'Offer deactivated', offer });
  } catch (error) {
    console.error('Error deactivating offer:', error);
    res.status(500).json({ message: 'Failed to deactivate offer' });
  }
};
