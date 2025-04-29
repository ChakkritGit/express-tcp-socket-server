import { Router, NextFunction, Request, Response } from "express"
import multer from "multer"
import fs from "fs"
import { BaseResponse } from "../model"

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'public/fonts'

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }

    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname
    cb(null, originalName)
  }
})

const upload = multer({ storage })

const fontRouter: Router = Router()

fontRouter.post('/', upload.single('uploadFont'), (req: Request, res: Response<BaseResponse<string>>, next: NextFunction) => {
  try {
    const filePath = `/fonts/${req.file?.filename}`
    res.status(200).json({
      message: 'Success',
      success: true,
      data: filePath
    })
  } catch (error) {
    next(error)
  }
})

export default fontRouter
