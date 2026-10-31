import mongoose from 'mongoose';

let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (cachedPromise) {
    await cachedPromise;
    return;
  }

  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      (process.env.VERCEL ? '' : 'mongodb://localhost:27017/spicehub_dev');

    if (!mongoUri) {
      console.warn('[Database] Awaiting MONGO_URI environment variable.');
      return;
    }

    cachedPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    await cachedPromise;

    // Mask credentials when logging
    const maskedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`[Database] MongoDB Connected successfully to: ${maskedUri}`);
  } catch (error) {
    cachedPromise = null;
    console.error('[Database] MongoDB Connection Error:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

