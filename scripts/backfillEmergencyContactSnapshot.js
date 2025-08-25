import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Hotel from '../models/Hotel.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);

  const cursor = Booking.find({
    $or: [
      { emergencyContactSnapshot: { $exists: false } },
      { 'emergencyContactSnapshot.phone': { $in: [null, ''] } }
    ]
  }).cursor();

  let updated = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const hotel = await Hotel.findById(doc.hotelId).select('name emergencyContact');
    const ec = hotel?.emergencyContact || {};
    doc.emergencyContactSnapshot = {
      hotelName: hotel?.name || '',
      name: ec.name || '',
      phone: ec.phone || '',
      role: ec.role || '',
      availableHours: ec.availableHours || ''
    };
    await doc.save({ validateBeforeSave: false });
    updated++;
    if (updated % 100 === 0) console.log(`Updated ${updated} bookings...`);
  }

  console.log(`Done. Updated ${updated} bookings.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
