import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

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