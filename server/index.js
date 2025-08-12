import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Optional Twilio for real OTP SMS/WhatsApp
let twilioClient = null;
try {
  const twilioPkg = await import('twilio');
  twilioClient = twilioPkg.default;
} catch (e) {
  // ignore
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// In-memory store for OTP codes: { phone: { code, expiresAt } }
const phoneToOtp = new Map();

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], orders: [] }, null, 2));
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing auth header' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { phone, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function sendOtpViaTwilio(phone, code) {
  const channel = (process.env.OTP_CHANNEL || 'sms').toLowerCase();
  const fromNumber = process.env.TWILIO_FROM;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !fromNumber || !twilioClient) {
    console.log(`[OTP:DEV] ${phone} -> ${code}`);
    return { dev: true };
  }
  const client = twilioClient(sid, token);
  const body = `Your QuickIron OTP is ${code}. It expires in 5 minutes.`;
  if (channel === 'whatsapp') {
    await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${phone}`,
      body
    });
  } else {
    await client.messages.create({
      from: fromNumber,
      to: phone,
      body
    });
  }
  return { sent: true };
}

// Socket connections
io.on('connection', socket => {
  // Clients can join rooms like: customer:<phone>, vendor, partner:<phone>
  socket.on('join', room => {
    if (typeof room === 'string') {
      socket.join(room);
    }
  });

  socket.on('disconnect', () => {});
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Root info page to avoid 404 on server root
app.get('/', (req, res) => {
  const client = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  res.type('html').send(`<!doctype html>
  <html><head><meta charset="utf-8"><title>QuickIron API</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;padding:24px;line-height:1.5}</style>
  </head><body>
  <h1>QuickIron API</h1>
  <p>Backend is running. Open the frontend at <a href="${client}">${client}</a>.</p>
  <p>Health: <a href="/api/health">/api/health</a></p>
  </body></html>`);
});

// Auth: request OTP
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    phoneToOtp.set(phone, { code, expiresAt });
    await sendOtpViaTwilio(phone, code);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Auth: verify OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, code, role } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });
  const entry = phoneToOtp.get(phone);
  if (!entry || entry.code !== code || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  phoneToOtp.delete(phone);
  const normalizedRole = ['customer', 'vendor', 'partner'].includes(role) ? role : 'customer';

  const data = readData();
  const existingUser = data.users.find(u => u.phone === phone);
  if (!existingUser) {
    data.users.push({ id: uuidv4(), phone, role: normalizedRole, createdAt: Date.now() });
  }
  writeData(data);

  const token = jwt.sign({ phone, role: normalizedRole }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, role: normalizedRole });
});

// Place order
app.post('/api/orders', authMiddleware, (req, res) => {
  const { pickupAddress, pickupTime, quantity, notes } = req.body;
  if (!pickupAddress || !pickupTime || !quantity) {
    return res.status(400).json({ error: 'pickupAddress, pickupTime, quantity are required' });
  }
  const data = readData();
  const order = {
    id: uuidv4(),
    createdAt: Date.now(),
    customerPhone: req.user.phone,
    status: 'placed', // placed -> picked_up -> ironing -> out_for_delivery -> delivered
    pickupAddress,
    pickupTime,
    quantity,
    notes: notes || '',
    partnerPhone: null,
    currentLocation: null,
    timeline: [
      { status: 'placed', at: Date.now() }
    ]
  };
  data.orders.push(order);
  writeData(data);

  io.to('vendor').emit('order:new', order);
  io.to(`customer:${req.user.phone}`).emit('order:created', order);
  res.json(order);
});

// Get orders by role
app.get('/api/orders', authMiddleware, (req, res) => {
  const data = readData();
  const role = req.user.role;
  let orders = [];
  if (role === 'customer') {
    orders = data.orders.filter(o => o.customerPhone === req.user.phone);
  } else if (role === 'vendor') {
    orders = data.orders;
  } else if (role === 'partner') {
    orders = data.orders.filter(o => o.partnerPhone === req.user.phone);
  }
  res.json(orders.sort((a, b) => b.createdAt - a.createdAt));
});

// Assign order to partner (vendor only)
app.post('/api/orders/:id/assign', authMiddleware, (req, res) => {
  if (req.user.role !== 'vendor') return res.status(403).json({ error: 'Forbidden' });
  const { partnerPhone } = req.body;
  const { id } = req.params;
  const data = readData();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.partnerPhone = partnerPhone;
  writeData(data);
  io.to(`partner:${partnerPhone}`).emit('order:assigned', order);
  res.json(order);
});

// Update order status (vendor or partner)
app.post('/api/orders/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;
  const valid = ['placed', 'picked_up', 'ironing', 'out_for_delivery', 'delivered'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const { id } = req.params;
  const data = readData();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!['vendor', 'partner'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  order.status = status;
  order.timeline.push({ status, at: Date.now() });
  writeData(data);

  io.to(`customer:${order.customerPhone}`).emit('order:updated', order);
  io.to('vendor').emit('order:updated', order);
  if (order.partnerPhone) io.to(`partner:${order.partnerPhone}`).emit('order:updated', order);
  res.json(order);
});

// Update partner live location (partner only)
app.post('/api/orders/:id/location', authMiddleware, (req, res) => {
  if (req.user.role !== 'partner') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  const { lat, lng } = req.body;
  const data = readData();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.currentLocation = { lat, lng, at: Date.now() };
  writeData(data);
  io.to(`customer:${order.customerPhone}`).emit('order:location', {
    orderId: order.id,
    location: order.currentLocation
  });
  res.json(order);
});

// Contact endpoint (optional: persist inquiries)
app.post('/api/contact', (req, res) => {
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;

// Serve built client if available (production)
const CLIENT_DIST = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});