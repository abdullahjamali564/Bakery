import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Product from './models/Product.js';
import Branch from './models/Branch.js';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portos_bakery');
await Product.deleteMany({});
await Branch.deleteMany({});
await Product.insertMany([
  { name: 'Butter Croissant', description: 'Laminated, golden and impossibly light.', category: 'Morning', price: 950, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800' },
  { name: 'Cinnamon Knot', description: 'Brown sugar, cinnamon and a soft pull-apart crumb.', category: 'Morning', price: 1150, image: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800' },
  { name: 'Sourdough Loaf', description: 'Naturally leavened over 36 hours.', category: 'Breads', price: 2200, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800' },
  { name: 'Chocolate Tart', description: 'Dark chocolate ganache in a crisp pastry shell.', category: 'Sweet', price: 2100, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800' },
  { name: 'Berry Pavlova', description: 'Cloud-soft meringue, cream and seasonal berries.', category: 'Sweet', price: 2500, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800' },
  { name: 'Cardamom Bun', description: 'Fragrant cardamom, pearl sugar and cultured butter.', category: 'Sweet', price: 1300, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800' }
]);
await Branch.create({ name: 'Downtown Bakehouse', email: 'manager@portosbakery.com', passwordHash: await bcrypt.hash('portos-demo', 12), address: '18 Market Street', phone: '+1 555 0100', location: { type: 'Point', coordinates: [-73.9857, 40.7484] }, operatingHours: { open: '06:00', close: '22:00' }, timeZone: 'America/New_York' });
console.log('Seed complete. Manager: manager@portosbakery.com / portos-demo');
await mongoose.disconnect();
