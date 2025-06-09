import { NextFunction, Request, Response } from "express"
import { BaseResponse } from "../model/responseModel"
import { Drugs } from "@prisma/client"
import { addDrug, deleteDrugService, editDrugService, findDrug, findDrugId } from "../services"

export const createDrug = async (req: Request, res: Response<BaseResponse<Drugs>>, next: NextFunction) => {
  try {
    const body = req.body
    const pic = req.file
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await addDrug(body, pic)
    })
  } catch (error) {
    next(error)
  }
}

export const getDrug = async (req: Request, res: Response<BaseResponse<Drugs[]>>, next: NextFunction) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await findDrug()
    })
  } catch (error) {
    next(error)
  }
}

export const getDrugById = async (req: Request, res: Response<BaseResponse<Drugs | null>>, next: NextFunction) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await findDrugId(id)
    })
  } catch (error) {
    next(error)
  }
}

export const editDrug = async (req: Request, res: Response<BaseResponse<Drugs>>, next: NextFunction) => {
  try {
    const { id } = req.params
    const body = req.body
    const pic = req.file
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await editDrugService(body, id, pic)
    })
  } catch (error) {
    next(error)
  }
}

export const deleteDrug = async (req: Request, res: Response<BaseResponse<Drugs>>, next: NextFunction) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await deleteDrugService(id)
    })
  } catch (error) {
    next(error)
  }
}