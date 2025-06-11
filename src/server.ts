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
import RabbitMQService from './services/RabbitMQService'
import { initRabbitMq } from './services'

dotenv.config()

const app = express()
const server: http.Server = createServer(app)
const port = process.env.PORT || 3000
const tcpPort = 2004
const rabbitService = RabbitMQService.getInstance()

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

  try {
    await initRabbitMq()
    console.log('✅ RabbitMQ initialized')
  } catch (error) {
    console.error('Error rabbitMQ initialize: ', error)
  }

  try {
    rabbitService.listenToQueue('orders')
    console.log('✅ RabbitMQ Listening queue: orders')
  } catch (error) {
    console.error('Error rabbitMQ listen queue: ', error)
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
