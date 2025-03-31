import type { Request, Response } from 'express'
import { Router } from 'express'
import { BaseResponse } from '../model'
import testRouter from './testRoute'

const routes = Router()

routes.use('/test', testRouter)

routes.use('/', (_req: Request, res: Response<BaseResponse>) => {
  res.status(404).json({
    message: 'Not Found',
    success: false,
    data: null
  })
})

export default routes
