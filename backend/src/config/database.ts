import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/spicehub_dev';
    await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected successfully to: ${mongoUri}`);
  } catch (error) {
    console.error('[Database] MongoDB Connection Error:', error);
    process.exit(1);
  }
};
