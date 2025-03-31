import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'

class SocketService {
  private static instance: SocketService
  private io: SocketIOServer | null = null

  private constructor () {}

  static getInstance (): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  initialize (server: HTTPServer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.io) {
        try {
          this.io = new SocketIOServer(server, {
            cors: {
              origin: '*',
              methods: ['GET', 'POST']
            }
          })

          this.io.on('connection', (socket: Socket) => {
            console.log(`User : ${socket.id} Connected!!`)

            socket.on('send_message', data => {
              console.log(`Message received:`, data)
              socket.broadcast.emit('res_message', data)
            })

            socket.on('disconnect', () => {
              console.log(`User : ${socket.id} Disconnected!!`)
            })
          })
          resolve()
        } catch (error) {
          console.error('Error initializing Socket.IO:', error)
          reject(error)
        }
      } else {
        resolve()
      }
    })
  }

  getIO (): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO has not been initialized!')
    }
    return this.io
  }
}

export const socketService = SocketService.getInstance()
