import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },

    discountPercent: { type: Number, min: 1, max: 100 },
    discountFlat: { type: Number, min: 1 },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },

    minBookingAmount: { type: Number, default: 0, min: 0 },
    maxRedemptions: { type: Number, default: 0, min: 0 },
    redemptionCount: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

offerSchema.index({ hotelId: 1, code: 1 }, { unique: true });

// Date range validation
offerSchema.pre('validate', function (next) {
  if (this.validFrom && this.validTo && this.validTo < this.validFrom) {
    return next(new Error('validTo cannot be before validFrom'));
  }
  if (!this.discountPercent && !this.discountFlat) {
    return next(new Error('At least one of discountPercent or discountFlat is required'));
  }
  next();
});

export default mongoose.model('Offer', offerSchema);
