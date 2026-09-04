import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import Branch from './models/Branch.js';
import Order from './models/Order.js';
import { requireManager } from './middleware/auth.js';
import { errorHandler, rateLimit, requestLogger, validateCheckout } from './middleware/security.js';
import { isBranchOpen } from './utils/hours.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimit({ max: 120 }));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.get('/api/products', async (_, res) => res.json(await Product.find({ available: true }).sort({ category: 1, name: 1 })));
app.get('/api/branches', async (_, res) => res.json(await Branch.find({}, 'name address phone location operatingHours')));

app.post('/api/orders/checkout', rateLimit({ max: 20 }), validateCheckout, async (req, res) => {
  try {
    const { items, customer } = req.body;
    if (!items?.length || !customer?.deliveryCoordinates) return res.status(400).json({ message: 'Cart and delivery coordinates are required' });
    const branches = customer.deliveryCoordinates
      ? await Branch.find({ location: { $near: { $geometry: { type: 'Point', coordinates: customer.deliveryCoordinates } } } })
      : await Branch.find({});
    const branch = branches.find((candidate) => candidate.isOpen !== false && isBranchOpen(candidate.operatingHours, candidate.timeZone));
    if (!branch) return res.status(409).json({ message: 'No nearby branch is open for delivery right now' });
    const productIds = items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds }, available: true });
    const lineItems = items.map((item) => { const product = products.find((entry) => String(entry._id) === String(item.product)); return product && { product: product._id, name: product.name, quantity: Math.max(1, item.quantity), price: product.price }; }).filter(Boolean);
    if (lineItems.length !== items.length) return res.status(400).json({ message: 'One or more products are unavailable' });
    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal >= 5000 ? 0 : 450;
    const paymentMethod = ['cash', 'card'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash';
    const total = subtotal + deliveryFee;
    const order = await Order.create({ branch: branch._id, items: lineItems, customer, subtotal, deliveryFee, paymentMethod, total });
    res.status(201).json({ orderId: order._id, branch: branch.name, total, status: order.status });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).select('_id status total branch createdAt updatedAt').populate('branch', 'name');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ orderId: order._id, status: order.status, total: order.total, branch: order.branch?.name, createdAt: order.createdAt, updatedAt: order.updatedAt });
});

app.post('/api/admin/login', async (req, res) => {
  const branch = await Branch.findOne({ email: req.body.email?.toLowerCase() });
  if (!branch || !(await bcrypt.compare(req.body.password || '', branch.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password' });
  res.json({ token: jwt.sign({ branchId: branch._id, name: branch.name, email: branch.email }, process.env.JWT_SECRET, { expiresIn: '8h' }), branch: { id: branch._id, name: branch.name, address: branch.address } });
});

app.get('/api/admin/dashboard', requireManager, async (req, res) => {
  const branchId = req.manager.branchId;
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [orders, completed] = await Promise.all([Order.find({ branch: branchId }).sort({ createdAt: -1 }).limit(100), Order.aggregate([{ $match: { branch: new mongoose.Types.ObjectId(branchId), status: 'Completed', createdAt: { $gte: monthStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }])]);
  const branch = await Branch.findById(branchId).select('isOpen');
  res.json({ orders, isOpen: branch?.isOpen ?? true, stats: { totalOrders: completed[0]?.count || 0, revenue: completed[0]?.revenue || 0, active: orders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length } });
});
app.patch('/api/admin/branch/status', requireManager, async (req, res) => {
  if (typeof req.body.isOpen !== 'boolean') return res.status(400).json({ message: 'isOpen must be a boolean' });
  const branch = await Branch.findByIdAndUpdate(req.manager.branchId, { isOpen: req.body.isOpen }, { new: true }).select('isOpen');
  res.json({ isOpen: branch.isOpen });
});
app.patch('/api/admin/orders/:id/status', requireManager, async (req, res) => {
  const allowed = ['Received', 'Baking', 'Out for Delivery', 'Completed', 'Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findOneAndUpdate({ _id: req.params.id, branch: req.manager.branchId }, { status: req.body.status }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});
app.use(errorHandler);

const port = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portos_bakery').then(() => app.listen(port, () => console.log(`Porto's API listening on ${port}`))).catch((error) => { console.error(error.message); process.exit(1); });
export default app;
