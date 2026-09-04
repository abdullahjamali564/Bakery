import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  address: { type: String, required: true },
  phone: String,
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
  operatingHours: { open: { type: String, default: '08:00' }, close: { type: String, default: '20:00' } },
  timeZone: { type: String, default: 'UTC' },
  isOpen: { type: Boolean, default: true }
}, { timestamps: true });

branchSchema.index({ location: '2dsphere' });
export default mongoose.model('Branch', branchSchema);
