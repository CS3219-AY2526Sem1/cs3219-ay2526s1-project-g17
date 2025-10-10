import express from 'express';
import collaborationRoutes from './routes/collaboration-routes.js';

const app = express();
app.use(express.json());
app.use('/api/collaboration', collaborationRoutes);

export default app;
