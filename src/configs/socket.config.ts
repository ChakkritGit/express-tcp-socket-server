import http from 'http'
import { Server } from 'socket.io'

let io: Server

const initSocket = (server: http.Server) => {
  try {
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    io.on('connection', socket => {
      try {
        console.log(`User : ${socket.id} Connected!!`)

        socket.on('send_message', data => {
          try {
            console.log(`Message received:`, data)
            socket.broadcast.emit('res_message', data)
          } catch (error) {
            console.error("Error handling 'send_message' event:", error)
          }
        })

        socket.on('disconnect', () => {
          try {
            console.log(`User : ${socket.id} Disconnected!!`)
          } catch (error) {
            console.error("Error handling 'disconnect' event:", error)
          }
        })
      } catch (error) {
        console.error("Error handling 'connection' event:", error)
      }
    })
  } catch (error) {
    console.error('Error initializing socket server:', error)
  }
}

export { initSocket, io }
