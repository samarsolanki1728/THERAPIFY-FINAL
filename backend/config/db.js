const mongoose = require("mongoose");

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connectionPromise) {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured.");
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });
  }
  try {
    return await connectionPromise;
  } finally {
    // Allow a later invocation to retry after failure or disconnection.
    connectionPromise = undefined;
  }
};

module.exports = connectDB;
