import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import routes from './routes'
import http, { createServer } from 'http'
import { morganDate, socketService, tcpService } from './utils'
import { globalErrorHanlder } from './middlewares'

dotenv.config()

const app = express()
const server: http.Server = createServer(app)
const port = process.env.PORT || 3000

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(morgan(':date, :method :url :status'))

morgan.token('date', morganDate)

// Route
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
    await tcpService.initialize(2001) // ใช้พอร์ต 2001
    console.log('✅ TCP server initialized')
  } catch (error) {
    console.error('Error initializing TCP Server:', error)
  }

  console.log(`Server is running on http://localhost:${port}`)
})
