import { Request, Response } from 'express'
import { PlcService } from '../services/plcService'
import { pad } from '../utils/helpers'
// import { checkMachine, sendToPLC } from '../utils/constants';
import { tcpService } from '../utils/tcp'
import { PlcSendMessage } from '../types/inferface'
import prisma from '../configs/prisma.config'

const plcService = new PlcService()

const getRunning = async (id: string) => {
  let finalRunning = 1
  const machine = await prisma.machines.findUnique({
    where: { id }
  })

  if (!machine) {
    throw new Error('Machine not found')
  }

  if (machine.Running >= 9) {
    const updatedMachine = await prisma.machines.update({
      where: { id },
      data: {
        Running: 1
      }
    })

    finalRunning = updatedMachine.Running
  } else {
    const newNumber = machine.Running + 1
    await prisma.machines.update({
      where: { id },
      data: {
        Running: newNumber
      }
    })
    finalRunning = newNumber
  }

  return finalRunning
}

export const sendCommand = async (req: Request, res: Response) => {
  const { floor, position, qty, id } = req.body
  const running = await getRunning(id)
  const body: PlcSendMessage = { floor, position, qty, id }

  console.log('📥 Incoming payload:', req.body)

  if (!floor || !qty || !position || !id) {
    return res.status(400).json({ error: 'Missing payload values' })
  }

  const connectedSockets = tcpService.getConnectedSockets()
  const socket = connectedSockets[0]
  if (!socket) {
    return res.status(500).json({ error: 'ยังไม่มีการเชื่อมต่อกับ PLC' })
  }

  const checkCommands = ['M38', 'M39', 'M40']
  const successStatuses = ['34', '35', '36', '30', '20', '36', '37']
  const failStatuses = [
    '37',
    '33',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '31',
    '32'
  ]

  let mode = 'M01'
  let mValue = 1

  const checkMachineStatus = (
    cmd: string
  ): Promise<{ status: string; raw: string }> => {
    return new Promise((resolve, reject) => {
      const running = plcService.getRunning()
      const m = parseInt(cmd.slice(1))
      const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500
      const sum = pad(sumValue, 2).slice(-2)
      const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`

      console.log(`📤 Sending status check command: ${checkMsg}`)
      socket.write(checkMsg)

      const timeout = setTimeout(() => {
        socket.off('data', onData)
        reject(new Error('Timeout: PLC ไม่ตอบสนอง'))
      }, 5000)

      const onData = (data: Buffer) => {
        const message = data.toString()
        const status = message.split('T')[1]?.substring(0, 2) ?? '00'
        clearTimeout(timeout)
        socket.off('data', onData)
        console.log(
          `📥 Response from PLC (${cmd}):`,
          message,
          '| Status T:',
          status
        )
        resolve({ status, raw: message })
      }

      socket.on('data', onData)
    })
  }

  // ✅ ตรวจสอบสถานะเครื่องตามลำดับ
  for (const cmd of checkCommands) {
    try {
      const result = await checkMachineStatus(cmd)

      if (cmd === 'M39') {
        const status = result.status

        if (status === '35') {
          mode = 'M02'
          mValue = 2
        } else if (status === '34' || status === '36') {
          mode = 'M01'
          mValue = 1
        } else if (failStatuses.includes(status)) {
          return res.status(400).json({
            error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
            plcResponse: result.raw
          })
        } else {
          return res.status(400).json({
            error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${status}`,
            plcResponse: result.raw
          })
        }
      } else {
        if (failStatuses.includes(result.status)) {
          return res.status(400).json({
            error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
            plcResponse: result.raw
          })
        } else if (!successStatuses.includes(result.status)) {
          return res.status(400).json({
            error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${result.status}`,
            plcResponse: result.raw
          })
        }
      }
    } catch (err) {
      console.error(`❌ Error during status check for ${cmd}:`, err)
      return res
        .status(500)
        .json({ error: `เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`, detail: err })
    }
  }

  // ✅ ส่งคำสั่งจริงหลังจากเช็คสถานะผ่านแล้ว
  const sumValue = 0 + floor + position + qty + 1 + mValue + 0 + running + 4500
  const sum = pad(sumValue, 2).slice(-2)
  const message = `B00R${pad(floor, 2)}C${pad(position, 2)}Q${pad(
    qty,
    4
  )}L01${mode}T00N${running}D4500S${sum}`

  console.log('📤 Final command to send:', message)
  socket.write(message)
  console.log('📤 Command written to socket')

  let responded = false
  const timeout = setTimeout(() => {
    if (!responded) {
      console.warn('⌛ Timeout waiting for response from PLC')
      return res.status(504).json({ error: 'PLC ไม่ตอบสนองในเวลา 5 วินาที' })
    }
  }, 5000)

  socket.once('data', data => {
    responded = true
    clearTimeout(timeout)
    console.log('📥 Final PLC response:', data.toString())

    res.json({
      message: 'จัดยาเสร็จ',
      floor: body.floor,
      position: body.position,
      plcResponse: data.toString()
    })
  })
}
// export const sendCommand = async (req: Request, res: Response) => {
//   const { floor, position, qty, id } = req.body;
//   const running = await getRunning(id)
//   const body: PlcSendMessage = { floor, position, qty, id };

//   // console.log('📥 Incoming payload:', req.body);

//   if (!floor || !qty || !position || !id) {
//     return res.status(400).json({ error: 'Missing payload values' });
//   }

//   const connectedSockets = tcpService.getConnectedSockets();
//   const socket = connectedSockets[0];
//   if (!socket) {
//     return res.status(500).json({ error: 'ยังไม่มีการเชื่อมต่อกับ PLC' });
//   }

//   const checkCommands = ['M38', 'M39', 'M40'];
//   const successStatuses = ['34', '36', '35', '30', '31', '32', '20'];
//   const failStatuses = ['37', '33', '21', '22', '23', '24', '25', '26', '27'];

//   const checkMachineStatus = (cmd: string): Promise<{ status: string; raw: string }> => {
//     return new Promise((resolve, reject) => {
//       const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500`;
//       console.log(`📤 Sending status check command: ${checkMsg}`);
//       socket.write(checkMsg);

//       const timeout = setTimeout(() => {
//         socket.off('data', onData);
//         reject(new Error('Timeout: PLC ไม่ตอบสนอง'));
//       }, 5000);

//       const onData = (data: Buffer) => {
//         const message = data.toString();
//         const status = message.split("T")[1]?.substring(0, 2) ?? "00";
//         clearTimeout(timeout);
//         socket.off('data', onData);
//         console.log(`📥 Response from PLC (${cmd}):`, message, '| Status T:', status);
//         resolve({ status, raw: message });
//       };

//       socket.on('data', onData);
//     });
//   };

//   for (const cmd of checkCommands) {
//     try {
//       const result = await checkMachineStatus(cmd);
//       if (failStatuses.includes(result.status)) {
//         return res.status(400).json({
//           error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
//           plcResponse: result.raw,
//         });
//       } else if (!successStatuses.includes(result.status)) {
//         return res.status(400).json({
//           error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${result.status}`,
//           plcResponse: result.raw,
//         });
//       }
//     } catch (err) {
//       console.error(`❌ Error during status check for ${cmd}:`, err);
//       return res.status(500).json({ error: `เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`, detail: err });
//     }
//   }

//   const sumValue = 0 + floor + position + qty + 1 + 0 + 0 + running + 4500;
//   const sum = pad(sumValue, 2).slice(-2);
//   const message = `B00R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L01M00T00N${running}D4500S${sum}`;

//   console.log('📤 Final command to send:', message);
//   socket.write(message);

//   let responded = false;
//   const timeout = setTimeout(() => {
//     if (!responded) {
//       console.warn('⌛ Timeout waiting for response from PLC');
//       return res.status(504).json({ error: 'PLC ไม่ตอบสนองในเวลา 5 วินาที' });
//     }
//   }, 5000);

//   socket.once('data', (data) => {
//     responded = true;
//     clearTimeout(timeout);
//     console.log('📥 Final PLC response:', data.toString());
//     res.json({
//       message: 'จัดยาเสร็จ',
//       floor: body.floor,
//       position: body.position,
//       plcResponse: data.toString()
//     });
//   });
// };

export const sendCommandFromQueue = (
  floor: number,
  position: number,
  qty: number,
  id: string
): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    const running = await getRunning(id)

    const connectedSockets = tcpService.getConnectedSockets()
    const socket = connectedSockets[0]
    if (!socket) {
      console.error({ error: 'ยังไม่มีการเชื่อมต่อกับ PLC' })
      return reject(false)
    }

    const checkCommands = ['M38', 'M39', 'M40']
    const successStatuses = ['34', '35', '36', '30', '20', '36', '37']
    const failStatuses = [
      '37',
      '33',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '31',
      '32'
    ]

    let mode = 'M01'
    let mValue = 1

    const checkMachineStatus = (
      cmd: string
    ): Promise<{ status: string; raw: string }> => {
      return new Promise(resolve => {
        const running = plcService.getRunning()
        const m = parseInt(cmd.slice(1))
        const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500
        const sum = pad(sumValue, 2).slice(-2)
        const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`

        console.log(`📤 Sending status check command: ${checkMsg}`)
        socket.write(checkMsg)

        // const timeout = setTimeout(() => {
        //   socket.off('data', onData);
        //   reject(new Error('Timeout: PLC ไม่ตอบสนอง'));
        // }, 5000);

        const onData = (data: Buffer) => {
          const message = data.toString()
          const status = message.split('T')[1]?.substring(0, 2) ?? '00'
          // clearTimeout(timeout);
          socket.off('data', onData)
          console.log(
            `📥 Response from PLC (${cmd}):`,
            message,
            '| Status T:',
            status
          )
          resolve({ status, raw: message })
        }

        socket.on('data', onData)
      })
    }
    // ✅ ตรวจสอบสถานะเครื่องตามลำดับ
    for (const cmd of checkCommands) {
      try {
        const result = await checkMachineStatus(cmd)
        if (cmd === 'M39') {
          const status = result.status

          if (status === '35') {
            mode = 'M02'
            mValue = 2
          } else if (status === '34' || status === '36') {
            mode = 'M01'
            mValue = 1
          } else if (failStatuses.includes(status)) {
            console.error({
              error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
              plcResponse: result.raw
            })
            reject(false)
          } else {
            console.error({
              error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${status}`,
              plcResponse: result.raw
            })
            reject(false)
          }
        } else if (failStatuses.includes(result.status)) {
          console.error({
            error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
            plcResponse: result.raw
          })
          return reject(false)
        } else if (!successStatuses.includes(result.status)) {
          console.error({
            error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${result.status}`,
            plcResponse: result.raw
          })
          return reject(false)
        }
      } catch (err) {
        console.error(`❌ Error during status check for ${cmd}:`, err)
        return reject(false)
      }
    }

    const sumValue =
      0 + floor + position + qty + 1 + mValue + 0 + running + 4500
    const sum = pad(sumValue, 2).slice(-2)
    const message = `B00R${pad(floor, 2)}C${pad(position, 2)}Q${pad(
      qty,
      4
    )}L01${mode}T00N${running}D4500S${sum}`

    console.log('📤 Final command to send:', message)
    socket.write(message)
    // const timeout = setTimeout(() => {
    //   console.warn('⌛ Timeout waiting for response from PLC');
    //   return resolve(false);
    // }, 5000);

    socket.once('data', data => {
      console.log('📥 Final PLC response:', data.toString())
      // clearTimeout(timeout);
      console.log('📥 Final PLC response:', data.toString())
      console.log({
        message: 'จัดยาเสร็จ',
        floor: floor,
        position: position,
        plcResponse: data.toString()
      })
      return resolve(true)
    })
  })
}

// const getRunning = async (id: string) => {
//   let finalRunning = 1;
//   const machine = await prisma.machines.findUnique({
//     where: { id }
//   });

//   if (!machine) {
//     throw new Error("Machine not found");
//   }

//   if (machine.Running >= 9) {
//     const updatedMachine = await prisma.machines.update({
//       where: { id },
//       data: {
//         Running: 1
//       }
//     });

//     finalRunning = updatedMachine.Running;
//   } else {
//     finalRunning = machine.Running;
//   }

//   return finalRunning;
// };

// export const sendCommand = async (req: Request, res: Response) => {
//   const { floor, position, qty, container } = req.body;
//   const running = await getRunning()
//   const body: PlcSendMessage = { floor, position, qty, container };

//   // console.log('📥 Incoming payload:', req.body);

//   if (!container || !floor || !qty || !position) {
//     return res.status(400).json({ error: 'Missing payload values' });
//   }

//   const connectedSockets = tcpService.getConnectedSockets();
//   const socket = connectedSockets[0];
//   if (!socket) {
//     return res.status(500).json({ error: 'ยังไม่มีการเชื่อมต่อกับ PLC' });
//   }

//   const checkCommands = ['M38', 'M39', 'M40'];
//   const successStatuses = ['34', '36', '35', '30', '31', '32', '20'];
//   const failStatuses = ['37', '33', '21', '22', '23', '24', '25', '26', '27'];

//   const checkMachineStatus = (cmd: string): Promise<{ status: string; raw: string }> => {
//     return new Promise((resolve, reject) => {
//       const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500`;
//       console.log(`📤 Sending status check command: ${checkMsg}`);
//       socket.write(checkMsg);

//       const timeout = setTimeout(() => {
//         socket.off('data', onData);
//         reject(new Error('Timeout: PLC ไม่ตอบสนอง'));
//       }, 5000);

//       const onData = (data: Buffer) => {
//         const message = data.toString();
//         const status = message.split("T")[1]?.substring(0, 2) ?? "00";
//         clearTimeout(timeout);
//         socket.off('data', onData);
//         console.log(`📥 Response from PLC (${cmd}):`, message, '| Status T:', status);
//         resolve({ status, raw: message });
//       };

//       socket.on('data', onData);
//     });
//   };

//   for (const cmd of checkCommands) {
//     try {
//       const result = await checkMachineStatus(cmd);
//       if (failStatuses.includes(result.status)) {
//         return res.status(400).json({
//           error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
//           plcResponse: result.raw,
//         });
//       } else if (!successStatuses.includes(result.status)) {
//         return res.status(400).json({
//           error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${result.status}`,
//           plcResponse: result.raw,
//         });
//       }
//     } catch (err) {
//       console.error(`❌ Error during status check for ${cmd}:`, err);
//       return res.status(500).json({ error: `เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`, detail: err });
//     }
//   }

//   const sumValue = container + floor + position + qty + 1 + 0 + 0 + running + 4500;
//   const sum = pad(sumValue, 2).slice(-2);
//   const message = `B${pad(container, 2)}R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L01M00T00N${running}D4500S${sum}`;

//   console.log('📤 Final command to send:', message);
//   socket.write(message);

//   let responded = false;
//   const timeout = setTimeout(() => {
//     if (!responded) {
//       console.warn('⌛ Timeout waiting for response from PLC');
//       return res.status(504).json({ error: 'PLC ไม่ตอบสนองในเวลา 5 วินาที' });
//     }
//   }, 5000);

//   socket.once('data', (data) => {
//     responded = true;
//     clearTimeout(timeout);
//     console.log('📥 Final PLC response:', data.toString());
//     res.json({
//       message: 'จัดยาเสร็จ',
//       floor: body.floor,
//       position: body.position,
//       plcResponse: data.toString()
//     });
//   });
// };

// export const sendCommand = async (req: Request, res: Response) => {
//   const { floor, position, qty, container } = req.body;
//   const running = plcService.getRunning();
//   const body: PlcSendMessage = { floor, position, qty, container };

//   console.log('📥 Incoming payload:', req.body);

//   if (!container || !floor || !qty || !position) {
//     return res.status(400).json({ error: 'Missing payload values' });
//   }

//   const connectedSockets = tcpService.getConnectedSockets();
//   const socket = connectedSockets[0];
//   if (!socket) {
//     return res.status(500).json({ error: 'ยังไม่มีการเชื่อมต่อกับ PLC' });
//   }

//   const checkCommands = ['M38', 'M39', 'M40'];
//   const successStatuses = ['34', '35', '36', '30','20','36','37'];
//   const failStatuses = ['37', '33', '21', '22', '23', '24', '25', '26', '27' ,'31', '32',];

//   let mode = 'M01';
//   let mValue = 1;

//   const checkMachineStatus = (cmd: string): Promise<{ status: string; raw: string }> => {
//     return new Promise((resolve, reject) => {
//       const running = plcService.getRunning();
//       const m = parseInt(cmd.slice(1));
//       const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500;
//       const sum = pad(sumValue, 2).slice(-2);
//       const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`;

//       console.log(`📤 Sending status check command: ${checkMsg}`);
//       socket.write(checkMsg);

//       const timeout = setTimeout(() => {
//         socket.off('data', onData);
//         reject(new Error('Timeout: PLC ไม่ตอบสนอง'));
//       }, 5000);

//       const onData = (data: Buffer) => {
//         const message = data.toString();
//         const status = message.split("T")[1]?.substring(0, 2) ?? "00";
//         clearTimeout(timeout);
//         socket.off('data', onData);
//         console.log(`📥 Response from PLC (${cmd}):`, message, '| Status T:', status);
//         resolve({ status, raw: message });
//       };

//       socket.on('data', onData);
//     });
//   };

//   // ✅ ตรวจสอบสถานะเครื่องตามลำดับ
//   for (const cmd of checkCommands) {
//     try {
//       const result = await checkMachineStatus(cmd);

//       if (cmd === 'M39') {
//         const status = result.status;

//         if (status === '35') {
//           mode = 'M02';
//           mValue = 2;
//         } else if (status === '34' || status === '36') {
//           mode = 'M01';
//           mValue = 1;
//         } else if (failStatuses.includes(status)) {
//           return res.status(400).json({
//             error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
//             plcResponse: result.raw,
//           });
//         } else {
//           return res.status(400).json({
//             error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${status}`,
//             plcResponse: result.raw,
//           });
//         }

//       } else {
//         if (failStatuses.includes(result.status)) {
//           return res.status(400).json({
//             error: `❌ เครื่องไม่พร้อมใช้งาน (${cmd})`,
//             plcResponse: result.raw,
//           });
//         } else if (!successStatuses.includes(result.status)) {
//           return res.status(400).json({
//             error: `⚠️ เครื่องตอบกลับสถานะไม่ชัดเจน (${cmd}): ${result.status}`,
//             plcResponse: result.raw,
//           });
//         }
//       }

//     } catch (err) {
//       console.error(`❌ Error during status check for ${cmd}:`, err);
//       return res.status(500).json({ error: `เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`, detail: err });
//     }
//   }

//   // ✅ ส่งคำสั่งจริงหลังจากเช็คสถานะผ่านแล้ว
//   const sumValue = container + floor + position + qty + 1 + mValue + 0 + running + 4500 ;
//   const sum = pad(sumValue, 2).slice(-2);
//   const message = `B${pad(container, 2)}R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L01${mode}T00N${running}D4500S${sum}`;

//   console.log('📤 Final command to send:', message);
//   socket.write(message);
//   console.log('📤 Command written to socket');

//   let responded = false;
//   const timeout = setTimeout(() => {
//     if (!responded) {
//       console.warn('⌛ Timeout waiting for response from PLC');
//       return res.status(504).json({ error: 'PLC ไม่ตอบสนองในเวลา 5 วินาที' });
//     }
//   }, 5000);

//   socket.once('data', (data) => {
//     responded = true;
//     clearTimeout(timeout);
//     console.log('📥 Final PLC response:', data.toString());

//     res.json({
//       message: 'จัดยาเสร็จ',
//       floor: body.floor,
//       position: body.position,
//       plcResponse: data.toString()
//     });
//   });
// };

export const sendCommandM = (req: Request, res: Response) => {
  const { command, floor, position, qty } = req.body
  const validCommands = [
    'm30',
    'm31',
    'm32',
    'm33',
    'm34',
    'm35',
    'm36',
    'm37',
    'm38',
    'm39',
    'm40'
  ]
  if (!validCommands.includes(command))
    return res.status(400).json({ error: 'Invalid command' })

  const running = plcService.getRunning()
  let sumValue =
    0 + 0 + 0 + 0 + 0 + 0 + parseInt(command.slice(1)) + running + 4500

  let message = `B00R00C00Q0000L00${command.toUpperCase()}T00N${running}D4500S`
  console.log('📤 Sending to PLC:', message)
  if (command === 'm32') {
    if (floor === undefined || position === undefined || qty === undefined) {
      return res.status(400).json({ error: 'Missing params for m32' })
    }

    sumValue =
      floor +
      position +
      qty +
      0 +
      0 +
      parseInt(command.slice(1)) +
      running +
      4500
    const sum = pad(sumValue, 2).slice(-2)
    message = `B00R${pad(floor, 2)}C${pad(position, 2)}Q${pad(
      qty,
      4
    )}L00${command.toUpperCase()}T00N${running}D4500S`
  } else {
    sumValue =
      0 + 0 + 0 + 0 + 0 + 0 + parseInt(command.slice(1)) + running + 4500
  }

  const sum = pad(sumValue, 2).slice(-2)
  message += `S${sum}`
  const connectedSockets = tcpService.getConnectedSockets()
  const socket = connectedSockets[0]
  socket.write(message)
  socket?.once('data', data => {
    res.json({
      message: `✅ Command ${command.toUpperCase()} sent successfully!`,
      plcResponse: data.toString()
    })
  })
}
