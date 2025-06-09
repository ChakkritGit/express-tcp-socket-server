import { Channel } from "amqplib"
import prisma from "../configs/prisma.config"

let channel: Channel

export const statusPrescription = async (presNo: string, status: string) => {
  try {
    const response = await prisma.prescription.update({
      where: { id: presNo },
      data: { PresStatus: status }
    })
    return response
  } catch (error) {
    throw error
  }
}

export const deletePrescription = async (presNo: string) => {
  try {
    if (presNo === "0") {
      await prisma.orders.deleteMany()
      await prisma.prescription.deleteMany()
      await prisma.machines.update({
        where: { id: "DEVICE-TEST" },
        data: { MachineSlot1: false, MachineSlot2: false }
      })
    } else {
      await prisma.orders.deleteMany({
        where: { PrescriptionId: presNo },
      })
      await prisma.prescription.delete({
        where: { id: presNo }
      })
    }
  } catch (error) {
    throw error
  }
}

// export const cancelQueueAmqp = async (queue: string): Promise<void> => {
//   let channel: Channel
//   try {
//     await channel.purgeQueue(queue)
//   } catch (err) {
//     throw err
//   }
// }