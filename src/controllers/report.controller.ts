import { NextFunction, Request, Response } from 'express'
import { Drugs } from '@prisma/client'
import { BaseResponse } from '../model'
import { getDailyInventoryReport, reportDrugService } from '../services'

export const reportDrug = async (
  req: Request,
  res: Response<BaseResponse<Drugs>>,
  next: NextFunction
) => {
  try {
    const queryParams = req.query
    const { startDate, endDate } = queryParams as {
      startDate: string
      endDate: string
    }
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await reportDrugService(new Date(startDate), new Date(endDate))
    })
  } catch (error) {
    next(error)
  }
}

export const reportInventory = async (
  req: Request,
  res: Response<BaseResponse<Drugs>>,
  next: NextFunction
) => {
  try {
    const { date } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await getDailyInventoryReport(new Date(date))
    })
  } catch (error) {
    next(error)
  }
}
