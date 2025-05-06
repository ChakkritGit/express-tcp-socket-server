import { Request, Response } from 'express';
import { PlcService } from '../utils/plc.Service';

export const sendToPLC = (req: Request, res: Response) => {
    const { floor, position, qty, container, mode } = req.body;

    if (!container || !floor || !qty || !position) {
        return res.status(400).json({ message: 'Payload invalid' });
    }

    const result = PlcService.buildMessage({ floor, position, qty, container, mode });
    const client = PlcService.sendToPLC(result.message);

    client?.once('data', (data) => {
        res.json({
            message: 'จัดยาเสร็จ',
            floor,
            position
        });
    });
};
