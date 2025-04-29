import type { Request, Response } from 'express'
import { Router } from 'express'
import { socketService, tcpService } from '../utils'
import { dispense } from '../controllers/dispense'

const testRouter: Router = Router()

testRouter.get('/', (req: Request, res: Response) =>
  res.status(200).json({
    message: 'Success',
    success: true,
    data: {
      message: 'Hello from test route!'
    }
  })
)

testRouter.post('/socket', (req: Request, res: Response) => {
  const body = req.body
  const io = socketService.getIO()
  io.emit('test', {
    message: `Sent from socket server!`,
    data: body
  })

  res.status(200).json({
    message: 'Success',
    success: true,
    data: {
      message: 'Sent message successfuly'
    }
  })
})

testRouter.post('/dispense', dispense)

export default testRouter
