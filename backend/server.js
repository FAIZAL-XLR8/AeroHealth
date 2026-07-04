require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const initializeSocket = require('./config/socket');
const redisClient = require('./config/redisClient');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.FRONTEND_URL,
      ].filter(Boolean).map(url => url.replace(/\/$/, ''));
      if (!origin || allowed.includes(origin.replace(/\/$/, ''))) {
        callback(null, true);
      } else {
        callback(new Error(`Socket CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
});

Promise.all([
  connectDB(),
  redisClient.connect()
    .then(() => {})
    .catch(err => {
      if (err.code !== 'ECONNREFUSED') {
        console.error('Failed to connect to Redis server:', err);
      }
    })
]);

initializeSocket(io);

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL,
    ].filter(Boolean).map(url => url.replace(/\/$/, ''));
    if (!origin || allowed.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true
}));
app.use(cookieParser());

const paymentController = require('./controllers/paymentController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);



app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
});
