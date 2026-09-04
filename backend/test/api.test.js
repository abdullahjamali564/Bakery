import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Branch from '../src/models/Branch.js';
import Order from '../src/models/Order.js';

let mongo;
let app;
let branch;
let otherBranch;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  ({ default: app } = await import('../src/server.js'));
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const passwordHash = await bcrypt.hash('password', 4);
  branch = await Branch.create({ name: 'Test Branch', email: 'test@example.com', passwordHash, address: 'Test', location: { type: 'Point', coordinates: [-73.9, 40.7] }, operatingHours: { open: '00:00', close: '23:59' }, timeZone: 'UTC' });
  otherBranch = await Branch.create({ name: 'Other Branch', email: 'other@example.com', passwordHash, address: 'Other', location: { type: 'Point', coordinates: [-73.8, 40.7] } });
});

after(async () => { await mongoose.disconnect(); await mongo.stop(); });

test('rejects admin dashboard requests without JWT', async () => {
  const response = await request(app).get('/api/admin/dashboard');
  assert.equal(response.status, 401);
});

test('does not allow a manager to update another branch order', async () => {
  const order = await Order.create({ branch: otherBranch._id, items: [], customer: {}, subtotal: 10, total: 10 });
  const token = jwt.sign({ branchId: branch._id }, process.env.JWT_SECRET);
  const response = await request(app).patch(`/api/admin/orders/${order._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'Completed' });
  assert.equal(response.status, 404);
  assert.equal((await Order.findById(order._id)).status, 'Received');
});
