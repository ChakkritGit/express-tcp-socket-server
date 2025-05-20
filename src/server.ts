import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import routes from './routes'
import os from 'os'
import http, { createServer } from 'http'
import { morganDate, socketService, tcpService } from './utils'
import { globalErrorHanlder } from './middlewares'
import plcRoutes from './routes/plc.Routes'

dotenv.config()

const app = express()
const server: http.Server = createServer(app)
const port = process.env.PORT || 3000
const tcpPort = 2004

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(morgan(':date, :method :url :status'))

morgan.token('date', morganDate)

app.use('/api', routes)
app.use(globalErrorHanlder)

server.listen(port, async () => {
  try {
    await socketService.initialize(server)
    console.log('✅ Socket.IO initialized')
  } catch (error) {
    console.error('Error initializing Socket.IO:', error)
  }

  try {
    await tcpService.initialize(tcpPort) 
    console.log('✅ TCP server initialized')
  } catch (error) {
    console.error('Error initializing TCP Server:', error)
  }

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

  console.log(`Server is running on http://${ipAddress}:${port}`)
})
