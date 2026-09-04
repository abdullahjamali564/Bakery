import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Clock3, MapPin, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './checkout.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const formatCurrency = (value) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);
const fallback = [
  { _id: '1', name: 'Butter Croissant', description: 'Laminated, golden and impossibly light.', category: 'Morning', price: 950, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800' },
  { _id: '2', name: 'Cinnamon Knot', description: 'Brown sugar, cinnamon and a soft pull-apart crumb.', category: 'Morning', price: 1150, image: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800' },
  { _id: '3', name: 'Sourdough Loaf', description: 'Naturally leavened over 36 hours.', category: 'Breads', price: 2200, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800' },
  { _id: '4', name: 'Chocolate Tart', description: 'Dark chocolate ganache in a crisp pastry shell.', category: 'Sweet', price: 2100, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800' }
];

function App() {
  const [products, setProducts] = useState(fallback);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('All');
  const [openCart, setOpenCart] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    fetch(`${API}/products`).then((response) => response.ok ? response.json() : fallback).then((data) => data.length && setProducts(data)).catch(() => {});
  }, []);

  const showMessage = (message) => {
    setConfirmation(message);
    window.setTimeout(() => setConfirmation(''), 2600);
  };
  const add = (product) => {
    setCart((items) => {
      const existing = items.find((item) => item._id === product._id);
      return existing ? items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }];
    });
    showMessage(`${product.name} added to your bag.`);
  };
  const changeQuantity = (id, delta) => setCart((items) => items.map((item) => item._id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  const removeItem = (id) => setCart((items) => items.filter((item) => item._id !== id));
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 5000 ? 0 : 450;
  const total = subtotal + deliveryFee;

  const locate = (event) => {
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!navigator.geolocation) return showMessage('Location is not available in this browser.');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      form.longitude.value = coords.longitude.toFixed(6);
      form.latitude.value = coords.latitude.toFixed(6);
      showMessage('Location added.');
    }, () => showMessage('Location permission was not granted.'));
  };

  const submitCheckout = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { items: cart.map((item) => ({ product: item._id, quantity: item.quantity })), paymentMethod, customer: { name: form.get('name'), phone: form.get('phone'), address: form.get('address'), deliveryCoordinates: [Number(form.get('longitude')), Number(form.get('latitude'))] } };
    try {
      const response = await fetch(`${API}/orders/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw Error(result.message);
      setCart([]); setCheckout(false); setOpenCart(false); showMessage(`Order ${result.orderId.slice(-6)} confirmed.`);
    } catch (error) { showMessage(error.message); }
  };

  const categories = ['All', ...new Set(products.map((item) => item.category))];
  return <main>
    <nav><div className="brand">PORTO'S<span>BAKERY</span></div><div className="navlinks"><a href="#menu">Menu</a><a href="#story">Our story</a><a href="#visit">Visit us</a></div><button className="cart-button" onClick={() => setOpenCart(true)}><ShoppingBag size={17} /> Bag <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b></button></nav>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">Baked daily in small batches</p><h1>Good bread.<br /><i>Better mornings.</i></h1><p className="hero-text">Hand-shaped sourdough, flaky pastries and sweet things worth slowing down for.</p><a className="primary" href="#menu">Order for delivery <ArrowRight size={17} /></a></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1400" /><div className="open-note"><Clock3 size={16} /><span><strong>Open today</strong><br />Until 10:00 pm</span></div></div></section>
    <section id="menu" className="menu"><div className="section-heading"><div><p className="eyebrow">From our ovens</p><h2>The daily menu</h2></div><p>Everything is made with patience,<br />then delivered with care.</p></div><div className="category-row">{categories.map((item) => <button className={category === item ? 'selected' : ''} onClick={() => setCategory(item)} key={item}>{item}<ChevronDown size={14} /></button>)}</div><div className="product-grid">{products.filter((item) => category === 'All' || item.category === category).map((product, index) => <article className="product" style={{ '--delay': `${index * 70}ms` }} key={product._id}><div className="product-image"><img src={product.image} /><button aria-label={`Add ${product.name}`} onClick={() => add(product)}><Plus size={19} /></button></div><div className="product-info"><div><h3>{product.name}</h3><p>{product.description}</p></div><strong>{formatCurrency(product.price)}</strong></div></article>)}</div></section>
    <section id="story" className="story"><div><p className="eyebrow">A little about us</p><h2>Made for the<br /><i>long way round.</i></h2></div><p>Porto's began with a simple belief: the best food takes its time. We still mix, fold, shape and bake by hand every morning, using ingredients we know by name.</p><a href="#visit">Meet the bakers <ArrowRight size={17} /></a></section>
    <section id="visit" className="visit"><MapPin size={20} /><div><strong>Come say hello</strong><p>18 Market Street · Mon–Sun, 6am–10pm</p></div></section>
    {confirmation && <div className="toast" role="status">{confirmation}</div>}
    {openCart && <div className="drawer-backdrop" onClick={() => setOpenCart(false)}><aside className="drawer" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-head"><div><p className="eyebrow">Porto's bakery</p><h2>{checkout ? 'Delivery details' : 'Your bag'}</h2></div><button className="close-button" aria-label="Close" onClick={() => setOpenCart(false)}><X /></button></div>
      {checkout ? <form className="checkout-form" onSubmit={submitCheckout}>
        <div className="form-grid"><label><span>Name</span><input name="name" placeholder="Your full name" required /></label><label><span>Phone</span><input name="phone" placeholder="03XX XXXXXXX" required /></label></div>
        <label><span>Delivery address</span><input name="address" placeholder="House, street, area" required /></label>
        <button className="location-button" onClick={locate} type="button"><MapPin size={16} /> Use my location</button>
        <div className="coords"><label><span>Longitude</span><input name="longitude" type="number" step="any" placeholder="-73.9857" required /></label><label><span>Latitude</span><input name="latitude" type="number" step="any" placeholder="40.7484" required /></label></div>
        <label><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cash">Cash on delivery</option><option value="card">Card at delivery</option></select></label>
        <div className="checkout-summary"><span>Estimated total</span><strong>{formatCurrency(total)}</strong></div><button className="primary full">Place order <ArrowRight size={17} /></button>
      </form> : cart.length ? <><div className="bag-list">{cart.map((item) => <div className="bag-item" key={item._id}><div className="bag-item-copy"><strong>{item.name}</strong><small>{formatCurrency(item.price)} each</small><div className="quantity"><button onClick={() => changeQuantity(item._id, -1)}>-</button><b>{item.quantity}</b><button onClick={() => changeQuantity(item._id, 1)}>+</button></div></div><div className="bag-item-side"><strong>{formatCurrency(item.price * item.quantity)}</strong><button className="delete-button" onClick={() => removeItem(item._id)}><Trash2 size={14} /> Remove</button></div></div>)}</div><div className="bag-total"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div><div className="bag-total"><span>Delivery</span><strong>{deliveryFee ? formatCurrency(deliveryFee) : 'Free'}</strong></div><button className="primary full" onClick={() => setCheckout(true)}>Continue to checkout <ArrowRight size={17} /></button><small className="bag-note">Free delivery on orders over PKR 5,000</small></> : <div className="empty-bag"><ShoppingBag size={30} /><p>Your bag is waiting for something warm.</p></div>}
    </aside></div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
