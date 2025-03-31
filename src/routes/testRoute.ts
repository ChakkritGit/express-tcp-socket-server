import type { Request, Response } from 'express'
import { Router } from 'express'
import { socketService, tcpService } from '../utils'

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

testRouter.post('/tcp', (req: Request, res: Response) => {
  const body = req.body
  const message = body.message || 'Hello, TCP Client!'
  const server = tcpService.getServer()

  try {
    const server = tcpService.getServer()

    const connectedSockets = tcpService.getConnectedSockets()

    if (connectedSockets.length === 0) {
      return res.status(404).json({
        message: 'No connected clients',
        success: false
      })
    }

    const socket = connectedSockets[0]
    socket.write(message)

    res.status(200).json({
      message: 'Message sent successfully to TCP client',
      success: true,
      data: {
        sentMessage: message
      }
    })
  } catch (error) {
    console.error('Error sending message to TCP client:', error)
    res.status(500).json({
      message: 'Error sending message to TCP client',
      success: false
    })
  }
})

export default testRouter
