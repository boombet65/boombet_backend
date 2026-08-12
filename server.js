// server.js 

require('dotenv').config();

const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const helmet = require('helmet');
const cors = require('cors');
const { startMatchCronJob, processMatchesLifecycle } = require('./src/cronJobs/match/matchEngine.cron');

const GlobalExceptionsHandler = require('./src/middleware/globalExceptionHandler');
const { sequelize, initModels } = require('./src/models');

// Import routes
const authRoutes = require('./src/routes/auth/auth.routes');
const bookingCodeRoutes = require('./src/routes/bookingCode/bookingCode.routes');
const betRoutes = require('./src/routes/bet/bet.routes');
const moneyRoute = require('./src/routes/money/money.route');
const matchRoute = require('./src/routes/match/match.routes');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

/* =========================
   GLOBAL MIDDLEWARES
========================= */

app.set('trust proxy', 1);

// Helmet Configuration
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false
    })
);

// Dynamic CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://13.140.157.161',
    'https://boombet365.com',
    'https://www.boombet365.com',
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.boombet365.com')) {
            return callback(null, true);
        }
        console.error(`❌ CORS Blocked Origin: ${origin}`);
        return callback(new Error('CORS Not Allowed'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

/* =========================
   SOCKET.IO CONFIGURATION
========================= */

const io = new Server(server, {
    cors: corsOptions
});

// Event listener pale client (Vue/React/Mobile) anapoconnect
io.on('connection', (socket) => {
    console.log(`⚡ New WebSocket Client Connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(` Client Disconnected: ${socket.id}`);
    });
});

/* =========================
   ROUTES
========================= */

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Auth & Operational Routes
app.use('/api/auth', authRoutes);
app.use('/api/bet', betRoutes);
app.use('/api/code', bookingCodeRoutes);
app.use('/api/match', matchRoute);
app.use('/api/money', moneyRoute);

/* =========================
   GLOBAL ERROR HANDLER (MWISHO)
========================= */
app.use(GlobalExceptionsHandler);

/* =========================
   START SERVER
========================= */
const start = async () => {
    try {
        await sequelize.authenticate();
        console.log(' Database connected successfully');

        await initModels();
        console.log(' Database models synchronized');

        server.listen(PORT, () => {
            console.log(` Server running on port ${PORT}`);

            startMatchCronJob(io);
            console.log(' Match Engine Cron Job & WebSockets initialized successfully');
        });

    } catch (error) {
        console.error(' Failed to start server:', error.message);
        process.exit(1);
    }
};

start();