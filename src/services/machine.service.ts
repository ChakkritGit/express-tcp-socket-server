import { Machines } from "@prisma/client"
import prisma from "../configs/prisma.config"
import { HttpError } from "../error"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { v4 as uuidv4 } from 'uuid'

export const createMachine = async (body: Machines): Promise<Machines> => {
  try {
    const UUID = `MAC-${uuidv4()}`
    const result = await prisma.machines.create({
      select: { id: true, MachineName: true, MachineStatus: true, IP: true, Running:true, CreatedAt: true, UpdatedAt: true },
      data: {
        id: UUID,
        MachineName: body.MachineName,
        MachineStatus: "1",
        IP:body.IP,
        Running:  1
      }
    })
    return result as Machines
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new HttpError(400, 'Username already exists')
      }
    }
    throw error
  }
}

export const machineList = async (): Promise<Machines[]> => {
  try {
    const result = await prisma.machines.findMany({
      select: { id: true, MachineName: true, MachineStatus: true, CreatedAt: true, UpdatedAt: true },
      orderBy: {
        CreatedAt: 'desc'
      }
    })
    return result as Machines[]
  } catch (error) {
    throw error
  }
}

export const searchMachine = async (id: string): Promise<Machines | null> => {
  try {
    const result = await prisma.machines.findFirst({
      select: { id: true, MachineName: true, MachineStatus: true, CreatedAt: true, UpdatedAt: true },
      where: { id }
    })
    if (!result) throw new HttpError(404, "Machine not found")
    return result as Machines
  } catch (error) {
    throw error
  }
}

export const updateMachine = async (id: string, body: Machines): Promise<Machines | null> => {
  try {
    const result = await prisma.machines.update({
      data: { MachineName: body.MachineName, MachineStatus: body.MachineStatus },
      select: { id: true, MachineName: true, MachineStatus: true, CreatedAt: true, UpdatedAt: true },
      where: { id }
    })
    return result as Machines
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new HttpError(404, 'Machine not found')
      }
    }
    throw error
  }
}

export const removeMachine = async (id: string): Promise<Machines | null> => {
  try {
    const result = await prisma.machines.delete({
      where: { id }
    })
    return result as Machines
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new HttpError(404, 'Machine not found')
      } else if (error.code === "P2003") {
        throw new HttpError(400, 'The machine can\'t be removed because there is inventory registered on it. Please remove the inventory first!')
      }
    }
    throw error
  }
}

export const updateOrderDeviceSlot = async (machine_id: string, machine_slot: string | null, order_id: string, value: boolean) => {
  try {
    await prisma.machines.update({
      where: { id: machine_id },
      data: machine_slot === "R1" ? { MachineSlot1: value } : { MachineSlot2: value }
    });
    if (value) {
      await prisma.orders.update({
        where: { id: order_id },
        data: { Slot: machine_slot }
      });
    }
  } catch (error) {
    throw error;
  }
}

export const findSlotDevice = async (): Promise<string> => {
  try {
    const response: Machines | null = await prisma.machines.findUnique({
      where: { id: "DEVICE-TEST" }
    });
    if (!response?.MachineSlot1) {
      return "R1";
    } else if (!response?.MachineSlot2) {
      return "R2";
    } else {
      return "R0";
    }
  } catch (error) {
    throw error;
  }
}