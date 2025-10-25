import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Test the connection to the MongoDB Cloud database
const uri = process.env.DB_CLOUD_URI;
mongoose.connect(uri)
  .then(() => {
    console.log('Connection successful!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    mongoose.disconnect();
  });