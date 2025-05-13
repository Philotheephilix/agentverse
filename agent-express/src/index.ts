import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { agentRoutes } from './routes/agent';

// Load environment variables
dotenv.config();

const app = express();

// Add CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// CORS configuration - allow all
app.use(cors({
  origin: '*',
  methods: '*',
  allowedHeaders: '*',
  credentials: true
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api/agent', agentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// Export the Express API
export default app; 