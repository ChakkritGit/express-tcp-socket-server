import type { Request, Response } from 'express'
import { socketService, tcpService } from "../utils"

const dispense = (req: Request, res: Response) => {
  const body = req.body
  const message = body.message || 'Hello, TCP Client!'
  const connectedSockets = tcpService.getConnectedSockets()
  const client = socketService.getClientConnect() 

  const clientConeected = client.find((f) => f.id === '123')

  const command = 'Z21'

  try {
    if (connectedSockets.length === 0) {
      return res.status(404).json({
        message: 'No connected clients',
        success: false
      })
    }

    const socket = connectedSockets.find((f) => f.remoteAddress === 'from front-end')
    if (socket && clientConeected) {
      socket.write(message)

      socket.on('data', (data) => {
        // if (getStatus() === '91') {
        //   clientConeected.emit('device1', new Date())
        // } else if (getStatus() === '92') {
        //   clientConeected.emit('device1', 'Test')
        // }
      })
    }

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
}

export { dispense }