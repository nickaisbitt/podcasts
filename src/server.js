const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'CPTSD Podcast Script Generator is running'
  });
});

// Alternative health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'CPTSD Podcast Script Generator is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CPTSD Podcast Script Generator API',
    status: 'healthy',
    endpoints: {
      health: '/health',
      healthz: '/healthz'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CPTSD Podcast Script Generator server running on port ${PORT}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 Server bound to all interfaces (0.0.0.0)`);
  console.log(`✅ Application is ready and responding to health checks`);
});

module.exports = app;
