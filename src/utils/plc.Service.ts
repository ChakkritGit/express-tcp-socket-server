import * as net from 'net';
import { PlcSendMessage } from '../interface';
import { pad } from './helpers';

let client: net.Socket | null = null;
let running = 0;

export const PlcService = {
    setClient: (socket: net.Socket) => {
        client = socket;
    },

    buildMessage: (body: PlcSendMessage & { mode: string }) => {
        running = running >= 9 ? 1 : running + 1;
        const mValue = body.mode === 'M02' ? 2 : 1;
        const sumValue = body.container + body.floor + body.position + body.qty + 1 + mValue + 0 + running + 4500;
        const sum = pad(sumValue, 2).slice(-2);
        const message = `B${pad(body.container, 2)}R${pad(body.floor, 2)}C${pad(body.position, 2)}Q${pad(body.qty, 4)}L01${body.mode}T00N${running}D4500S${sum}`;
        return { message };
    },

    sendToPLC: (data: string) => {
        if (!client) {
            console.log('⚠️ No PLC connected');
            return null;
        }
        console.log('📤 Sending to PLC:', data);
        client.write(data);
        return client;
    }
};
