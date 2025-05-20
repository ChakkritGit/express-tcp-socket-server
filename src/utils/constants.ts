import { Socket } from "net";
import { PlcService } from "../services/plcService";
import { pad } from "./helpers";
import { socketService } from "./socket";
import { tcpService } from "./tcp";

function getStatusT(status: string, qty?: string): { status: string, message: string } {
  console.log("Received Status Code:", status);
  switch (status) {
    case '01': return {
      status: '01',
      message: 'ขาดการเชื่อมต่อจากเซิร์ฟเวอร์'
    };
    case '02': return {
      status: '02',
      message: 'ชุดคำสั่งไม่ถูกต้อง'
    };
    case '03': return {
      status: '03',
      message: 'Checksum ในชุดคำสั่งไม่ถูกต้อง (Sxx)'
    };
    case '04': return {
      status: '04',
      message: 'คาร์ทีเซียนแกนนอนไม่เข้าตำแหน่ง'
    };
    case '05': return {
      status: '05',
      message: 'คาร์ทีเซียนแกนตั่งไม่เข้าตำแหน่ง'
    };
    case '06': return {
      status: '06',
      message: 'กลไกหยิบขาไม่เข้าตำแหน่ง'
    };
    case '07': return {
      status: '07',
      message: 'คาร์ทีเซียนแกนนอนไม่เคลื่อนที่ไปยังโมดูล'
    };
    case '08': return {
      status: '08',
      message: 'คาร์ทีเซียนแกนตั่งไม่เคลื่อนที่ไปยังโมดูล'
    };
    case '09': return {
      status: '09',
      message: 'สายพานป้อนเข้า'
    };
    case '10': return {
      status: '10',
      message: 'กระบวนการหยิบยา'
    };
    case '11': return {
      status: '11',
      message: 'คาร์ทีเซียนแกนนอนไม่เคลื่อนที่ไปยังช่องปล่อย'
    };
    case '12': return {
      status: '12',
      message: 'คาร์ทีเซียนแกนตั่งไม่เคลื่อนที่ไปยังช่องปล่อย'
    };
    case '13': return {
      status: '13',
      message: 'สายพานป้อนเข้า'
    };
    case '14': return {
      status: '14',
      message: 'สายพานหยุด'
    };
    case '20': return {
      status: '20',
      message: 'ชั้นเก็บยาปิดสนิททั้งหมด '
    };
    case '21': return {
      status: '21',
      message: 'ชั้นเก็บยาที่ 1 ปิดไม่สนิท '
    };
    case '22': return {
      status: '22',
      message: 'ชั้นเก็บยาที่ 2 ปิดไม่สนิท'
    };
    case '23': return {
      status: '23',
      message: 'ชั้นเก็บยาที่ 3 ปิดไม่สนิท'
    };
    case '24': return {
      status: '24',
      message: 'ชั้นเก็บยาที่ 4 ปิดไม่สนิท'
    };
    case '25': return {
      status: '25',
      message: 'ชั้นเก็บยาที่ 5 ปิดไม่สนิท'
    };
    case '26': return {
      status: '26',
      message: 'ชั้นเก็บยาที่ 6 ปิดไม่สนิท'
    };
    case '27': return {
      status: '27',
      message: 'ชั้นเก็บยาที่ 7 ปิดไม่สนิท'
    };
    case '91': return {
      status: '91',
      message: 'ได้รับคำสั่งแล้ว'
    };
    case '92': return {
      status: '92',
      message: `จ่ายยาสำเร็จจำนวน ${qty}`
    };
    case '30': return {
      status: '30',
      message: 'ประตูทั่งสองฝั่งล็อก'
    };
    case '31': return {
      status: '31',
      message: 'ประตูฝั่งซ้ายล็อกเพียงบานเดียว'
    };
    case '32': return {
      status: '32',
      message: 'ประตูฝั่งขวาล็อกเพียงบานเดียว'
    };
    case '33': return {
      status: '33',
      message: 'ประตูทั่งสองฝั่งไม่ได้ล็อก'
    };
    case '34': return {
      status: '34',
      message: 'ช่องจ่ายาทั่งสองว่าง'
    };
    case '35': return {
      status: '35',
      message: 'ช่องจ่ายยาฝั่งซ้ายว่างเพียงช่องเดียว'
    };
    case '36': return {
      status: '36',
      message: 'ช่องจ่ายยาฝั่งขวาว่างเพียงช่องเดียว'
    };
    case '37': return {
      status: '37',
      message: 'ช่องจ่ายยาทั่งสองฝั่งเต็ม'
    };
    case '39': return {
      status: '39',
      message: 'ทำงานสำเร็จ'
    };
    default: return {
      status: '00',
      message: 'T00'
    };
  }
}

const checkMachine = (command: string, connectedSockets: Socket[], container = 0, floor = 0, position = 0, qty = 0): Promise<{ message: string, success: boolean }> => {
  return new Promise((resolve, reject) => {
    const plcService = new PlcService();
    const running = plcService.getRunning();
    const socket = connectedSockets[0];

    if (!socket) {
      return resolve({
        message: 'ไม่พบการเชื่อมต่อกับเครื่อง',
        success: false
      });
    }

    const checkMessage = `B00R00C00Q0000L00${command.toUpperCase()}T00N${running}D4500`;

    let stage = 0;
    let timeout = setTimeout(() => {
      socket.off('data', onData);
      resolve({ message: 'Timeout', success: false });
    }, 5000);

    const onData = (data: Buffer) => {
      const message = data.toString();
      const status = message.split("T", 2)[1]?.substring(0, 2) || "00";

      if (stage === 0) {
        const m = getStatusT(status, qty.toString());
        const channelM = m.status === '35' ? 'M02' : 'M01';
        const sumValue = container + floor + position + qty + 1 + (channelM === 'M02' ? 2 : 1) + 0 + running + 4500;
        const sum = pad(sumValue, 2).slice(-2);
        const messageToSend = `B${pad(container, 2)}R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L01${channelM}T00N${running}D4500S${sum}`;
        
        stage = 1;
        socket.write(messageToSend);
      } else if (stage === 1) {
        clearTimeout(timeout);
        socket.off('data', onData);

        const lastChecking = getStatusT(status, qty.toString());
        const successStatuses = ['34', '36', '35', '30', '31', '32', '20'];
        const failStatuses = ['37', '33', '21', '22', '23', '24', '25', '26', '27'];

        if (successStatuses.includes(lastChecking.status)) {
          resolve({ message: lastChecking.message, success: true });
        } else if (failStatuses.includes(lastChecking.status)) {
          resolve({ message: lastChecking.message, success: false });
        } else {
          resolve({ message: 'Unknown status: ' + status, success: false });
        }
      }
    };

    socket.on('data', onData);
    socket.write(checkMessage);
  });
};


      // Optional: timeout
      // setTimeout(() => {
      //   resolve({
      //     message: 'Timeout waiting for machine response',
      //     success: false
      //   });
      // }, 5000); // 5 seconds timeout


const sendToPLC = (floor: number, position: number, qty: number, container: number): Promise<{ message: string, success: boolean }> => {
  return new Promise((resolve, reject) => {
    const plcService = new PlcService();
    const running = plcService.getRunning();
    const connectedSockets = tcpService.getConnectedSockets();

    try {
      const socket = connectedSockets[0];

      // Step 1: ตรวจสอบสถานะเพื่อกำหนด M01 หรือ M02
      const checkMessage = `B00R00C00Q0000L00M39T00N${running}D4500`;
      socket.write(checkMessage);

      socket.once('data', (message) => {
        const status = message.toString().split("T", 2)[1]?.substring(0, 2) || "00";
        const m = getStatusT(status);
        const channelM = m.status === '35' ? 'M02' : 'M01';

        // Step 2: คำนวณค่า sum
        const sumValue = container + floor + position + qty + 1 + (channelM === 'M02' ? 2 : 1) + 0 + running + 4500;
        const sum = pad(sumValue, 2).slice(-2);

        // Step 3: สร้าง message จริงสำหรับจ่ายยา
        const messageToSend = `B${pad(container, 2)}R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L01${channelM}T00N${running}D4500S${sum}`;
        socket.write(messageToSend);

        socket.once('data', (data) => {
          console.log(`PLC Response: ${data.toString()}`);
          const status = data.toString().split("T", 2)[1]?.substring(0, 2) || "00";
          const lastChecking = getStatusT(status);

          const successStatuses = ['34', '36', '35', '30', '31', '32', '20'];
          const failStatuses = ['37', '33', '21', '22', '23', '24', '25', '26', '27'];

          if (successStatuses.includes(lastChecking.status)) {
            resolve({
              message: lastChecking.message,
              success: true
            });
          } else if (failStatuses.includes(lastChecking.status)) {
            resolve({
              message: lastChecking.message,
              success: false
            });
          } else {
            resolve({
              message: 'Unknown status',
              success: false
            });
          }
        });

        socket.once('error', (err) => {
          console.error(`Socket error: ${err.message}`);
          reject({
            message: 'Socket error: ' + err.message,
            success: false
          });
        });
      });

    } catch (error) {
      return resolve({
        message: `Error: ${error}`,
        success: false
      });
    }
  });
};



export { getStatusT, checkMachine, sendToPLC }



