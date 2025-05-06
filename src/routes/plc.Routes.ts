import { Router } from 'express';
import { sendToPLC } from '../controllers/plc.Controller';

const router = Router();

router.post('/api/send', sendToPLC);

export default router;
