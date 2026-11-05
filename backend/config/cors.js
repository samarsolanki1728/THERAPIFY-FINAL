const allowedOrigins = new Set([
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? [new URL(process.env.FRONTEND_URL.trim()).origin] : [])
]);

const isAllowedOrigin = origin => !origin || allowedOrigins.has(origin);

module.exports = {
  isAllowedOrigin,
  corsOptions: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};
