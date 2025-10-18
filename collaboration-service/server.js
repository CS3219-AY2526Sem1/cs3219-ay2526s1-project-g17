import 'dotenv/config'
import express from 'express';
import collaborationRoutes from './routes/collaboration-routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/collaboration', collaborationRoutes);
app.use(errorHandler)

export default app;
