import { Request, Response } from 'express';
import { PlcService } from '../services/plcService';
import { pad } from '../utils/helpers';
import { checkMachine, sendToPLC } from '../utils/constants';
import { tcpService } from '../utils/tcp';

const plcService = new PlcService();


export const sendCommand = async (req: Request, res: Response) => {
  const connectedSockets = tcpService.getConnectedSockets();
  const { floor, position, qty, container } = req.body;
  const caseCommand = ['m38', 'm39', 'm40']

  if (!container || !floor || !qty || !position) {
    return res.status(400).json({ error: 'Missing payload values' });
  }

  if (connectedSockets.length === 0) {
    return res.status(400).json({
      message: 'No connected clients',
      success: false
    });
  }

  try {
    for (const m of caseCommand) {
      const isReady = await checkMachine(m, connectedSockets);
      if (!isReady.success) {
        return
      }
    }

    const result = await sendToPLC(floor, position, qty, container)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(400).json(error)
  }
};

export const sendCommandM = (req: Request, res: Response) => {
  const { command, floor, position, qty } = req.body;
  const validCommands = ["m30", "m31", "m32", "m33", "m34", "m35", "m36", "m37", "m38", "m39", "m40"];
  if (!validCommands.includes(command)) return res.status(400).json({ error: 'Invalid command' });

  const running = plcService.getRunning();
  let sumValue = 0 + 0 + 0 + 0 + 0 + 0 + parseInt(command.slice(1)) + running + 4500;
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
  const connectedSockets = tcpService.getConnectedSockets();
  const socket = connectedSockets[0];
  socket.write(message)
  socket?.once('data', (data) => {
    res.json({
      message: `✅ Command ${command.toUpperCase()} sent successfully!`,
      plcResponse: data.toString()
    });
  });
};
