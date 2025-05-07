import { Request, Response } from 'express';
import { PlcService } from '../services/plcService';
import { PlcSendMessage } from '../interface/plc';
import { pad } from '../utils/helpers';

const plcService = new PlcService();

export const sendCommand = (req: Request, res: Response) => {
  const { floor, position, qty, container, mode } = req.body;
  const body: PlcSendMessage = { floor, position, qty, container };

  if (!container || !floor || !qty || !position) {
    return res.status(400).json({ error: 'Missing payload values' });
  }

  const running = plcService.getRunning();
  const mValue = mode === 'M02' ? 2 : 1;
  const sumValue = container + floor + position + qty + 1 + mValue + 0 + running + 4500;
  const sum = pad(sumValue, 2).slice(-2);

  const message = `B${pad(container, 2)}R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L01${mode}T00N${running}D4500S${sum}`;

  const c = plcService.sendToPLC(message);
  c?.once('data', (data) => {
    res.json({ message: 'จัดยาเสร็จ', floor, position });
  });
};

export const sendCommandM = (req: Request, res: Response) => {
  const { command, floor, position, qty } = req.body;
  const validCommands = ["m30", "m31", "m32", "m33", "m34", "m35", "m36", "m37", "m38", "m39", "m40"];
  if (!validCommands.includes(command)) return res.status(400).json({ error: 'Invalid command' });

  const running = plcService.getRunning();
  let sumValue = 0;
  let message = `B00R00C00Q0000L00${command.toUpperCase()}T00N${running}D4500`;

  if (command === "m32") {
    if (floor === undefined || position === undefined || qty === undefined) {
      return res.status(400).json({ error: 'Missing params for m32' });
    }
    sumValue = floor + position + qty + 0 + 0 + parseInt(command.slice(1)) + running + 4500;
    message = `B00R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L00${command.toUpperCase()}T00N${running}D4500`;
  } else {
    sumValue = 0 + 0 + 0 + 0 + 0 + 0 + parseInt(command.slice(1)) + running + 4500;
  }

  const sum = pad(sumValue, 2).slice(-2);
  message += `S${sum}`;

  const c = plcService.sendToPLC(message);
  c?.once('data', (data) => {
    res.json({
      message: `✅ Command ${command.toUpperCase()} sent successfully!`,
      plcResponse: data.toString()
    });
  });
};
