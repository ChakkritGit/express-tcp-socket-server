import type { Request, Response } from 'express'
import express, { Router } from 'express'
import { BaseResponse } from '../model/responseModel'
import userRouter from './user.route'
import authRouter from './auth.route'
import drugRouter from './drug.route'
import swaggerUi from 'swagger-ui-express'
import fs from 'node:fs'
import YAML from 'yaml'
import fontRouter from '../utils/font'
import inventoryRouter from './inventory.route'
// import machineRouter from './machine.route'
import deviceRouter from './device.route'
import reportRouter from './report.route'

const file = fs.readFileSync("./swagger.yml", "utf8")
const routes = Router()

routes.use('/auth', authRouter)
routes.use('/users', userRouter)
routes.use('/drugs', drugRouter)
routes.use('/inventory', inventoryRouter)
// routes.use('/machine', machineRouter)
// routes.use('/orders', orderRouter)
routes.use('/device', deviceRouter)
routes.use('/report', reportRouter)
routes.use('/font', fontRouter)
routes.use('/swagger', swaggerUi.serve, swaggerUi.setup(YAML.parse(file)))
routes.use('/img', express.static(process.env.NODE_ENV === 'development' ? 'src/public/images' : 'public/images'))
routes.use('/fonts', express.static('public/fonts'))
routes.use('/', (req: Request, res: Response<BaseResponse>) => {
  res.status(404).json({
    message: 'Not Found',  
    success: false,
    data: null
  })
})

export default routes