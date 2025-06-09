import { NextFunction, Request, Response } from "express"
import { BaseResponse } from "../model"
import { cancelQueue, clearAllOrder, createPresService, deletePrescription, findOrders, findPrescription, getOrderService, received, sendOrder, statusPrescription, updateOrder, updatePrescription, updateStatusOrderServicePending } from "../services"
import { HttpError } from "../error"
import { getPharmacyPres } from "../interface"
import { Orders } from "@prisma/client"
import { io } from "../configs"
import { PlcSendMessage } from "../types/inferface"
import { socketService } from "../utils"

export const dispenseOrder = async (req: Request, res: Response<BaseResponse<Orders[]>>, next: NextFunction) => {
  try {
    const { id } = req.body
    const rfid = req.params.rfid
    // const token = req.headers['authorization']
    const order = await findPrescription()
    if (!!order) {
      throw new HttpError(409, 'Order already exists')
    } else {
      const response = await getPharmacyPres(rfid)
      const value = await createPresService(response)
      const cmd: PlcSendMessage[] = value.map((item) => { return { floor: item.Floor, position: item.Position, id: id, orderId: item.id, qty: item.OrderQty, presId: item.PrescriptionId } })
      await sendOrder(cmd, 'orders')
      await statusPrescription(response.PrescriptionNo, "pending")
      // io.sockets.emit("res_message", `Create : ${response.PrescriptionNo}`)
      socketService.getIO().emit("res_message", `Create : ${response.PrescriptionNo}`)
      res.status(200).json({
        message: 'Success',
        success: true,
        data: value
      })
    }
  } catch (error) {
    next(error)
  }
}


export const getOrder = async (req: Request, res: Response<BaseResponse<Orders[]>>, next: NextFunction) => {
  try {
    // const token = req.headers['authorization']
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await getOrderService()
    })
  } catch (error) {
    next(error)
  }
}

export const receiveOrder = async (req: Request, res: Response<BaseResponse<Orders>>, next: NextFunction) => {
  try {
    const { sticker } = req.params
    // const presId = sticker.split("|")[0]
    // const drugId = sticker.split("|")[1]
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await received(sticker)
    })
  } catch (error) {
    next(error)
  }
}

export const updateStatusPending = async (req: Request, res: Response<BaseResponse<Orders>>, next: NextFunction) => {
  try {
    const { id, presId } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(id, 'pending', presId)
    })
  } catch (error) {
    next(error)
  }
}

export const updateStatusReceive = async (req: Request, res: Response<BaseResponse<Orders>>, next: NextFunction) => {
  try {
    const { id, presId } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(id, 'receive', presId)
    })
  } catch (error) {
    next(error)
  }
}

export const updateStatusComplete = async (req: Request, res: Response<BaseResponse<Orders>>, next: NextFunction) => {
  try {
    const { id, presId } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(id, 'complete', presId)
    })
  } catch (error) {
    next(error)
  }
}

export const updateStatusRrror = async (req: Request, res: Response<BaseResponse<Orders>>, next: NextFunction) => {
  try {
    const { id, presId } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(id, 'error', presId)
    })
  } catch (error) {
    next(error)
  }
}

export const updateStatusReady = async (req: Request, res: Response<BaseResponse<Orders>>, next: NextFunction) => {
  try {
    const { id, presId } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(id, 'ready', presId)
    })
  } catch (error) {
    next(error)
  }
}

export const cancelOrder = async (req: Request, res: Response<BaseResponse<string>>, next: NextFunction) => {
  try {
    const { prescriptionId } = req.params
    await deletePrescription(prescriptionId)
    await cancelQueue('orders')
    io.sockets.emit("res_message", `Delete Order Success!!`)
    res.status(200).json({
      message: 'Success',
      success: true,
      data: 'Delete Order Success'
    })
  } catch (error) {
    throw (error)
  }
}

export const updateOrderList = async (req: Request, res: Response) => {
  const { order_status } = req.body
  const { order_id } = req.params
  try {
    const response = await updateOrder(order_id, order_status)
    if (response?.OrderStatus === '1') {
      io.sockets.emit("res_message", `Dispensing : ${order_id}`)
    } else if (response?.OrderStatus === '2' || response?.OrderStatus === '3') {
      const order: Orders[] = await findOrders(['0', '1'])
      if (order.length === 0) {
        io.sockets.emit("res_message", `Complete & Done : ${response.PrescriptionId}`)
        await updatePrescription(response.PrescriptionId, '2')
      } else {
        io.sockets.emit("res_message", `Complete : ${order_id}`)
        await updatePrescription(response.PrescriptionId, '3')
      }
    }
    res.status(200).json({
      message: 'Success',
      success: true,
      data: response
    })
  } catch (error) {
    res.status(400).json({ status: 400, error: error })
  }
}

export const clearOrder = async (req: Request, res: Response) => {
  try {
    const response = await clearAllOrder()
    res.status(200).json({
      message: 'Success',
      success: true,
      data: response
    })
  } catch (error) {
    res.status(400).json({ status: 400, error: error })
  }
}