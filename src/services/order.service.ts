import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import prisma from "../configs/prisma.config"
import { jwtDecodeType, OrderType, Prescription, PrescriptionList } from "../types"
import { HttpError } from "../error"
import { Orders } from "@prisma/client"
import { getDateFormat } from "../utils"
import { statusPrescription } from "./prescription.service"
import { io } from "../configs"
import { jwtDecode } from "jwt-decode"
import RabbitMQService from "./RabbitMQService"

const validStatusTransitions = {
  pending: 'ready',
  receive: 'pending',
  complete: 'receive',
  error: 'pending',
  ready: 'pending',
}

type OrderStatus = keyof typeof validStatusTransitions

export const findPrescription = async () => {
  try {
    const result = await prisma.prescription.findFirst({
      where: { PresStatus: { in: ["pending", "receive", "complete"] } },
      include: { Order: true },
      orderBy: { CreatedAt: 'asc' }
    })
    return result
  } catch (error) {
    throw error
  }
}

export const createPresService = async (pres: Prescription): Promise<Orders[]> => {
  try {
    const presList: PrescriptionList[] = pres.Prescription.filter((item) => item.Machine === "ADD")
    if (presList.length > 0) {
      const order: Orders[] = presList.map((item) => {
        // let command = item.command

        // const numberAtPosition = command.slice(4, 5)

        // if (numberAtPosition >= '1' && numberAtPosition <= '9') {
        //   command = command.slice(0, 4) + '0' + command.slice(4)
        // }

        return {
          id: `ORD-${item.RowID}`,
          PrescriptionId: item.f_prescriptionno,
          OrderItemId: item.f_orderitemcode,
          OrderItemName: item.f_orderitemname,
          OrderQty: item.f_orderqty,
          OrderUnitcode: item.f_orderunitcode,
          Machine: item.Machine,
          Command: item.command,
          OrderStatus: "ready",
          Floor: Number(item.f_binlocation.substring(0, 1)),
          Position: Number(item.f_binlocation.substring(1)),
          Slot: null,
          CreatedAt: getDateFormat(new Date()),
          UpdatedAt: getDateFormat(new Date())
        }
      })

      const warnings: string[] = await Promise.all(order.map(async (items) => {
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
      }))

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
            PresStatus: "ready",
            CreatedAt: getDateFormat(new Date()),
            UpdatedAt: getDateFormat(new Date()),
          }
        }),
        prisma.orders.createMany({ data: order })
      ])

      if (filteredWarnings.length > 0) {
        order.forEach((item, index) => {
          (item as any).warning = filteredWarnings[index] || null;
        })
      }
      return order
    } else {
      throw new HttpError(404, "Order not found on ADD")
    }
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(400, "This order has already been placed")
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

    const updatedResult = await Promise.all(result.map(async (order) => {
      const warning = await prisma.inventory.findFirst({
        where: { DrugId: order.OrderItemId }
      }).then((ins) => {
        if (!ins) return
        if (ins.InventoryQty < order.OrderQty) {
          return {
            message: `จำนวนยาในสต๊อกเหลือน้อยกว่าจำนวนที่จัด`,
            inventoryRemaining: ins.InventoryQty,
            orderQty: order.OrderQty
          }
        }
        return null
      }).catch((e) => e.message)

      return { ...order, warning }
    }))

    return updatedResult
  } catch (error) {
    throw error
  }
}

export const received = async (drugId: string): Promise<Orders> => {
  const rabbitService = RabbitMQService.getInstance();
  try {
    const result = await prisma.orders.findFirst({
      where: {
        // PrescriptionId: presId,
        OrderItemId: drugId
      },
      // include: { DrugInfo: { include: { Inventory: { include: { Machines: true } } } } }
    })
    if (result?.OrderStatus === "complete" || result?.OrderStatus === "error") {
      await updateOrder(result.id, "complete")
      // await updateOrderDevice(result.DrugInfo.Inventory?.Machines.id, result.Slot, result.id, Number(result.DrugInfo.Inventory?.InventoryQty) - result.OrderQty, String(result.DrugInfo.Inventory?.id), false)
      const value = await findOrders(['pending', 'receive', 'complete', 'error', 'ready'])
      if (value.length === 0) await statusPrescription(result.PrescriptionId, "complete")
      rabbitService.acknowledgeMessage()
      io.sockets.emit("res_message", `Receive Order : ${result.id}`)
    } else {
      throw "This item is not in a ready to receive drug"
    }
    return result
  } catch (error) {
    throw (error)
  }
}

export const updateStatusOrderServicePending = async (id: string, status: OrderStatus, presId: string) => {
  try {
    const order = await prisma.orders.findUnique({ where: { id: id, PrescriptionId: presId } })

    if (!order) throw new HttpError(404, 'ไม่พบรายการ!')

    if (order.OrderStatus !== validStatusTransitions[status]) {
      if (order.OrderStatus === 'pending') {
        throw new HttpError(400,
          'รายการอยู่ระหว่างดำเนินการและยังไม่ได้อยู่ในสถานะรับ!',
        )
      }

      throw new HttpError(400,
        `ไม่สามารถเปลี่ยนสถานะจาก ${order.OrderStatus} ไปเป็น ${status} ได้`,
      )
    }

    await prisma.orders.update({
      where: { id },
      data: { OrderStatus: status, UpdatedAt: getDateFormat(new Date()) },
    })

    if (status === 'error') return

    const relatedOrders = await prisma.orders.findMany({
      where: { PrescriptionId: presId },
      select: { OrderStatus: true },
    })

    const allCompletedOrErrored = relatedOrders.every(
      o => o.OrderStatus === 'complete' || o.OrderStatus === 'error',
    )

    if (allCompletedOrErrored) {
      await prisma.prescription.update({
        where: { id: presId },
        data: { PresStatus: 'complete', UpdatedAt: getDateFormat(new Date()) },
      })
    }

    const result = await prisma.prescription.findFirst({
      where: {
        id: presId,
        AND: { Order: { every: { OrderStatus: { contains: 'complete' } } } },
      },
      include: { Order: true },
    })

    return result as unknown as Orders
  } catch (error) {
    throw error
  }
}

export const updateOrder = async (orderId: string, orderStatus: string): Promise<Orders | undefined> => {
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

export const updateOrderDevice = async (machineId: string | undefined, machineSlot: string | null, orderId: string, orderQty: number, inventoryId: string, value: boolean) => {
  try {
    await prisma.machines.update({
      where: { id: machineId },
      data: machineSlot === "R1"
        ? {
          MachineSlot1: value,
          // Inventory: {
          //   update: {
          //     where: { id: inventoryId },
          //     data: { InventoryQty: orderQty }
          //   }
          // }
        }
        : {
          MachineSlot2: value,
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

export const updatePrescription = async (prescriptionId: string, status: string) => {
  try {
    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { PresStatus: status }
    })
  } catch (error) {
    throw error
  }
}