import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  image: String,
  available: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
