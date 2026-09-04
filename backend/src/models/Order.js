import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, quantity: Number, price: Number }],
  customer: { name: String, phone: String, address: String, deliveryCoordinates: { type: [Number] } },
  subtotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  status: { type: String, enum: ['Received', 'Baking', 'Out for Delivery', 'Completed', 'Cancelled'], default: 'Received', index: true }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
