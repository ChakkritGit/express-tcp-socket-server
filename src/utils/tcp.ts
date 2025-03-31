import net, { Socket } from 'net'
import os from 'os'

class TcpService {
  private static instance: TcpService
  private server: net.Server | null = null
  private connectedSockets: Socket[] = []

  private constructor () {}

  static getInstance (): TcpService {
    if (!TcpService.instance) {
      TcpService.instance = new TcpService()
    }
    return TcpService.instance
  }

  initialize (port: number) {
    if (!this.server) {
      this.server = net.createServer((socket: Socket) => {
        console.log('New TCP client connected:', socket.remoteAddress)

        this.connectedSockets.push(socket)

        socket.on('data', data => {
          console.log(`Received data from client: ${data.toString()}`)
          socket.write('Hello from TCP Server!')
        })

        socket.on('end', () => {
          console.log('Client disconnected')
          this.connectedSockets = this.connectedSockets.filter(
            s => s !== socket
          )
        })
      })

      const networkInterfaces = os.networkInterfaces()
      let ipAddress = ''

      for (const iface in networkInterfaces) {
        const ifaceDetails = networkInterfaces[iface]
        if (ifaceDetails) {
          for (const details of ifaceDetails) {
            if (details.family === 'IPv4' && !details.internal) {
              ipAddress = details.address
              break
            }
          }
        }
      }

      this.server.listen(port, () => {
        console.log(`TCP Server is running on http://${ipAddress}:${port}`)
      })
    }
  }

  getConnectedSockets (): Socket[] {
    return this.connectedSockets
  }

  getServer (): net.Server {
    if (!this.server) {
      throw new Error('TCP Server has not been initialized!')
    }
    return this.server
  }
}

export const tcpService = TcpService.getInstance()
