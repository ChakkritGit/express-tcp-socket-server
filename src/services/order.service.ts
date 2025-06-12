import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import prisma from '../configs/prisma.config'
import {
  jwtDecodeType,
  OrderType,
  Prescription,
  PrescriptionList
} from '../types'
import { HttpError } from '../error'
import { Orders } from '@prisma/client'
import { getDateFormat, socketService, tcpService } from '../utils'
import { statusPrescription } from './prescription.service'
import { io } from '../configs'
import { jwtDecode } from 'jwt-decode'
import RabbitMQService from './RabbitMQService'
import { PlcService } from './plcService'
import { pad } from '../utils/helpers'

const plcService = new PlcService()
const rabbitService = RabbitMQService.getInstance()

export const findPrescription = async () => {
  try {
    const result = await prisma.prescription.findFirst({
      where: { PresStatus: { in: ['pending', 'receive', 'complete'] } },
      include: { Order: true },
      orderBy: { CreatedAt: 'asc' }
    })
    return result
  } catch (error) {
    throw error
  }
}

export const createPresService = async (
  pres: Prescription
): Promise<Orders[]> => {
  try {
    const presList: PrescriptionList[] = pres.Prescription.filter(
      item => item.Machine === 'ADD'
    )

    if (presList.length > 0) {
      const order: Orders[] = presList
        .map(item => {
          return {
            id: `ORD-${item.RowID}`,
            PrescriptionId: item.f_prescriptionno,
            OrderItemId: item.f_orderitemcode,
            OrderItemName: item.f_orderitemname,
            OrderQty: item.f_orderqty,
            OrderUnitcode: item.f_orderunitcode,
            Machine: item.Machine,
            Command: item.command,
            OrderStatus: 'ready',
            Floor: parseInt(item.f_binlocation.substring(0, 1)),
            Position: parseInt(item.f_binlocation.substring(1)),
            Slot: null,
            CreatedAt: getDateFormat(new Date()),
            UpdatedAt: getDateFormat(new Date())
          }
        })
        .sort((a, b) => a.Floor - b.Floor)

      const warnings: string[] = await Promise.all(
        order.map(async items => {
          try {
            const ins = await prisma.inventory.findFirst({
              where: { DrugId: items.OrderItemId }
            })
            if (!ins) return
            if (ins.InventoryQty < items.OrderQty) {
              return {
                message: `จำนวนยาในสต๊อกเหลือน้อยกว่าจำนวนที่จัด`,
                inventoryRemaining: ins.InventoryQty,
                orderQty: items.OrderQty
              }
            }
          } catch (e: any) {
            return e.message
          }
          return null
        })
      )

      const filteredWarnings = warnings.filter(warning => warning !== null)

      await prisma.$transaction([
        prisma.prescription.create({
          data: {
            id: presList[0].f_prescriptionno,
            PrescriptionDate: presList[0].f_prescriptiondate,
            Hn: presList[0].f_hn,
            An: presList[0].f_an,
            PatientName: presList[0].f_patientname,
            WardCode: presList[0].f_wardcode,
            WardDesc: presList[0].f_warddesc,
            PriorityCode: presList[0].f_prioritycode,
            PriorityDesc: presList[0].f_prioritydesc,
            PresStatus: 'ready',
            CreatedAt: getDateFormat(new Date()),
            UpdatedAt: getDateFormat(new Date())
          }
        }),
        prisma.orders.createMany({ data: order })
      ])

      if (filteredWarnings.length > 0) {
        order.forEach((item, index) => {
          ;(item as any).warning = filteredWarnings[index] || null
        })
      }
      return order
    } else {
      throw new HttpError(404, 'Order not found on ADD')
    }
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new HttpError(400, 'This order has already been placed')
    } else {
      throw error
    }
  }
}

export const getOrderService = async (): Promise<Orders[]> => {
  try {
    // const splitToken = token?.split(' ')[1]
    // const decoded: jwtDecodeType = jwtDecode(String(splitToken))

    const result = await prisma.orders.findMany({
      include: { DrugInfo: { select: { DrugImage: true } } },
      // where: { Prescription: { UsedBy: { id: decoded.id } } },
      orderBy: { OrderStatus: 'desc' }
    })

    const updatedResult = await Promise.all(
      result.map(async order => {
        const warning = await prisma.inventory
          .findFirst({
            where: { DrugId: order.OrderItemId }
          })
          .then(ins => {
            if (!ins) return
            if (ins.InventoryQty < order.OrderQty) {
              return {
                message: `จำนวนยาในสต๊อกเหลือน้อยกว่าจำนวนที่จัด`,
                inventoryRemaining: ins.InventoryQty,
                orderQty: order.OrderQty
              }
            }
            return null
          })
          .catch(e => e.message)

        return { ...order, warning }
      })
    )

    return updatedResult
  } catch (error) {
    throw error
  }
}
// export const received = async (drugId: string): Promise<Orders> => {
//   try {
//     const notready = await prisma.orders.findMany({
//       where: { OrderStatus: { equals: 'receive' } }
//     });

//     if (notready.length >= 2) {
//       throw new Error(`ไม่สามารถรับยาได้กรุณานำยาออกจากช่องก่อน!`);
//     }
//     const result = await prisma.orders.findFirst({
//       where: {
//         OrderItemId: drugId,
//       },
//     });

//     if (!result) {
//       throw new Error(`Order with ID ${drugId} not found`);
//     }

//     const connectedSockets = tcpService.getConnectedSockets();
//     const socket = connectedSockets[0];

//     const checkMachineStatus = (cmd: string): Promise<{ status: string; raw: string }> => {
//       return new Promise((resolve) => {
//         const running = plcService.getRunning();
//         const m = parseInt(cmd.slice(1));
//         const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500;
//         const sum = pad(sumValue, 2).slice(-2);
//         const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`;

//         console.log(`📤 Sending status check command: ${checkMsg}`);
//         socket.write(checkMsg);

//         const onData = (data: Buffer) => {
//           const message = data.toString();
//           const status = message.split("T")[1]?.substring(0, 2) ?? "00";
//           socket.off('data', onData);
//           console.log(`📥 Response from PLC (${cmd}):`, message, '| Status T:', status);
//           resolve({ status, raw: message });
//         };

//         socket.on('data', onData);
//       });
//     };

//     // ฟังก์ชันส่งคำสั่งปลดล็อกประตูตามสถานะที่ได้รับ
//     const unlockDoorByStatus = async (status: string) => {
//       if (status === "30") {
//         throw new Error("❌ ประตูทั้งสองฝั่งล็อกอยู่ ยังไม่สามารถเปิดได้");
//       } else if (status === "31") {
//         // ฝั่งซ้ายล็อก ต้องส่งคำสั่งปลดล็อกขวา (M34)
//         await plcService.sendCommand("M34");
//         console.log("✅ ปลดล็อกและเปิดไฟช่องจ่ายยาขวา ");
//       } else if (status === "32") {
//         // ฝั่งขวาล็อก ต้องส่งคำสั่งปลดล็อกซ้าย (M35)
//         await plcService.sendCommand("M35");
//         console.log("✅ ปลดล็อกและเปิดไฟช่องจ่ายยาซ้าย ");
//       } else {
//         throw new Error(`❌ สถานะผิดพลาดหรือไม่รู้จัก: ${status}`);
//       }
//     };

//     if (result.OrderStatus === "receive" || result.OrderStatus === "error") {

//       await updateOrder(result.id, "complete");

//       if (socket) {
//         const machineStatus = await checkMachineStatus("M38");
//         await unlockDoorByStatus(machineStatus.status);
//       }

//       const value = await findOrders(["complete", "error"]);
//       if (value.length === 0) await statusPrescription(result.PrescriptionId, "complete");

//       rabbitService.acknowledgeMessage();
//       socketService.getIO().emit("res_message", `Receive Order : ${result.id}`);
//     } else {
//       throw new Error("This item is not in a ready to receive drug");
//     }

//     return result;
//   } catch (error) {
//     throw error;
//   }
// };

export const received = async (drugId: string): Promise<Orders> => {
  try {
    // const notready = await prisma.orders.findMany({
    //   where: { OrderStatus: { equals: 'receive' } }
    // })

    // if (notready.length >= 2) {
    //   throw new Error(`ไม่สามารถรับยาได้กรุณานำยาออกจากช่องก่อน!`)
    // }
    const connectedSockets = tcpService.getConnectedSockets()
    const socket = connectedSockets[0]

    const result = await prisma.orders.findFirst({
      where: {
        OrderItemId: drugId
      }
    })

    if (!result) {
      throw new Error(`Order with ID ${drugId} not found`)
    }

    if (result.OrderStatus === 'receive' || result.OrderStatus === 'error') {
      await updateOrder(result.id, 'complete')
      const value = await findOrders(['complete', 'error'])
      if (value.length === 0)
        await statusPrescription(result.PrescriptionId, 'complete')

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

      if (socket) {
        const startTime = Date.now()
        const timeout = 3 * 60 * 1000 // 3 นาที

        while (true) {
          const status = await checkMachineStatus('M39') // เช็คประตู

          if (status.status === '') {
            // ประตูปิดแล้ว
            rabbitService.acknowledgeMessage()
            socketService
              .getIO()
              .emit('res_message', `Receive Order : ${result.id}`)
            break
          }

          const elapsed = Date.now() - startTime
          if (elapsed > timeout) {
            // ครบเวลา 3 นาที แต่ประตูยังไม่ปิด
            console.error('Timeout: ประตูไม่ปิดภายใน 3 นาที')
            rabbitService.acknowledgeMessage()
            socketService
              .getIO()
              .emit(
                'res_message',
                `Timeout: ประตูไม่ปิดภายใน 3 นาที สำหรับ Order : ${result.id}`
              )
            break
          }

          await new Promise(resolve => setTimeout(resolve, 1000)) // รอ 1 วิ ก่อนเช็คใหม่
        }
      }
    } else {
      throw new Error('This item is not in a ready to receive drug')
    }

    return result
  } catch (error) {
    throw error
  }
}

export const updateStatusOrderServicePending = async (
  id: string,
  status: string,
  presId: string
) => {
  try {
    const connectedSockets = tcpService.getConnectedSockets()
    const socket = connectedSockets[0]

    const order = await prisma.orders.findUnique({
      where: { id: id, PrescriptionId: presId }
    })

    if (!order) throw new HttpError(404, 'ไม่พบรายการ!')

    const validStatusTransitions: { [key: string]: string } = {
      pending: 'ready',
      receive: 'pending',
      complete: 'receive',
      error: 'pending',
      ready: 'pending'
    }

    if (order.OrderStatus !== validStatusTransitions[status]) {
      if (status === 'error' && order.OrderStatus === 'pending') {
        throw new HttpError(
          400,
          'รายการอยู่ระหว่างดำเนินการและยังไม่ได้อยู่ในสถานะรับ!'
        )
      }

      throw new HttpError(
        400,
        `ไม่สามารถเปลี่ยนสถานะจาก ${order.OrderStatus} ไปเป็น ${status} ได้`
      )
    }

    await prisma.orders.update({
      where: { id },
      data: { OrderStatus: status, UpdatedAt: getDateFormat(new Date()) }
    })

    if (status === 'error') return

    const relatedOrders = await prisma.orders.findMany({
      where: { PrescriptionId: presId },
      select: { OrderStatus: true }
    })

    const allCompletedOrErrored = relatedOrders.every(
      o => o.OrderStatus === 'complete' || o.OrderStatus === 'error'
    )

    if (allCompletedOrErrored) {
      await prisma.prescription.update({
        where: { id: presId },
        data: { PresStatus: 'complete', UpdatedAt: getDateFormat(new Date()) }
      })
    }

    const result = await prisma.prescription.findFirst({
      where: {
        id: presId,
        AND: { Order: { every: { OrderStatus: { contains: 'complete' } } } }
      },
      include: { Order: true }
    })

    if (socket && status === 'receive') {
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

      const status = await checkMachineStatus('M39')

      if (status.status !== '37') {
        rabbitService.acknowledgeMessage()
      }
    }

    return result as unknown as Orders
  } catch (error) {
    throw error
  }
}

export const updateOrder = async (
  orderId: string,
  orderStatus: string
): Promise<Orders | undefined> => {
  try {
    const result: Orders = await prisma.orders.update({
      where: { id: orderId },
      data: { OrderStatus: orderStatus }
    })
    return result
  } catch (error) {
    throw error
  }
}

export const updateOrderDevice = async (
  machineId: string | undefined,
  machineSlot: string | null,
  orderId: string,
  orderQty: number,
  inventoryId: string,
  value: boolean
) => {
  try {
    await prisma.machines.update({
      where: { id: machineId },
      data:
        machineSlot === 'R1'
          ? {
              MachineSlot1: value
              // Inventory: {
              //   update: {
              //     where: { id: inventoryId },
              //     data: { InventoryQty: orderQty }
              //   }
              // }
            }
          : {
              MachineSlot2: value
              // Inventory: {
              //   update: {
              //     where: { id: inventoryId },
              //     data: { InventoryQty: orderQty }
              //   }
              // }
            }
    })

    if (value) {
      await prisma.orders.update({
        where: { id: orderId },
        data: { Slot: machineSlot }
      })
    }
  } catch (error) {
    throw error
  }
}

export const findOrders = async (condition: string[]): Promise<Orders[]> => {
  try {
    const result: Orders[] = await prisma.orders.findMany({
      where: { OrderStatus: { in: condition } }
    })
    return result
  } catch (error) {
    throw error
  }
}

export const clearAllOrder = async (): Promise<string> => {
  try {
    await prisma.$transaction([
      prisma.orders.deleteMany(),
      prisma.prescription.deleteMany(),
      prisma.inventory.updateMany({
        // where: {
        //   InventoryQty: {
        //     lt: 10
        //   }
        // },
        data: {
          InventoryQty: 3
        }
      }),
      prisma.machines.update({
        where: { id: 'MAC-fa5e8202-1749-4fc7-93b9-0e4b373a56e9' },
        data: { MachineSlot1: false, MachineSlot2: false }
      })
    ])
    return 'Successfully'
  } catch (error) {
    throw error
  }
}

export const updatePrescription = async (
  prescriptionId: string,
  status: string
) => {
  try {
    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { PresStatus: status }
    })
  } catch (error) {
    throw error
  }
}
