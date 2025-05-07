import { Router } from 'express';
import { sendCommand, sendCommandM } from '../controllers/plcController';

const router = Router();

router.post('/send', sendCommand);
router.post('/send-m', sendCommandM);

export default router;
