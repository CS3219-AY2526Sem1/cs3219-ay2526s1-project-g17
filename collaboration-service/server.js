import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import collaborationRoutes from './routes/collaboration-routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use('/api/collaboration', collaborationRoutes);
app.use(errorHandler)

export default app;
