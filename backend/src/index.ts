import app from './app';
import { env } from './config/env';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 MindForge API Server successfully started on port ${PORT}`);
  console.log(`Server Mode: ${env.NODE_ENV}`);
  console.log(`Press Ctrl+C to terminate process`);
});

// Implement graceful shutdown hooks
const shutdown = () => {
  console.log('\nReceived kill signal, shutting down gracefully...');
  server.close(() => {
    console.log('Closed remaining active server connections');
    process.exit(0);
  });

  // Force close after 10s if connections persist
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
