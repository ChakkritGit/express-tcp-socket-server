import { Request, Response, NextFunction } from "express"
import { BaseResponse } from "../model"
import { Inventory } from "@prisma/client"
import { Createinventory, CreateStock, inventoryList, inventoryModify, inventorySearach, Removeinventory } from "../services"

export const addInventory = async (req: Request, res: Response<BaseResponse<Inventory>>, next: NextFunction) => {
  try {
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await Createinventory(body)
    })
  } catch (error) {
    next(error)
  }
}

export const addStock = async (req: Request, res: Response<BaseResponse<Inventory>>, next: NextFunction) => {
  try {
    const body = req.body
    const { id } = req.params
    res.status(200).json({
      message: 'Success',      success: true,
      data: await CreateStock(body, id)
    })
  } catch (error) {
    next(error)
  }
}

export const getInventoryList = async (req: Request, res: Response<BaseResponse<Inventory[]>>, next: NextFunction) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await inventoryList()
    })
  } catch (error) {
    next(error)
  }
}

export const findInventory = async (req: Request, res: Response<BaseResponse<Inventory | null>>, next: NextFunction) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await inventorySearach(id)
    })
  } catch (error) {
    next(error)
  }
}

export const editInventory = async (req: Request, res: Response<BaseResponse<Inventory | null>>, next: NextFunction) => {
  try {
    const { id } = req.params
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await inventoryModify(id, body)
    })
  } catch (error) {
    next(error)
  }
}

export const deleteInventory = async (req: Request, res: Response<BaseResponse<Inventory>>, next: NextFunction) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await Removeinventory(id)
    })
  } catch (error) {
    next(error)
  }
}