import { Channel, connect } from "amqplib"
import dotenv from "dotenv"
import { PlcSendMessage } from "../types/inferface"
dotenv.config()

interface QueueList {
  cmd: string,
  orderId: string
}

let channel: Channel

const initRabbitMq = async (): Promise<void> => {
  try {
    const conn = await connect(String(process.env.RABBITMQ))
    channel = await conn.createChannel()
  } catch (err) {
    throw err
  }
}
const sendOrder = async (order: PlcSendMessage | PlcSendMessage[], queue: string): Promise<void> => {
  try {
    await channel.assertQueue(queue, { durable: true })
    if (Array.isArray(order)) {
      order.forEach((item) => {
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(item)), { persistent: true })
      })
    } else {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), { persistent: true })
    }
  } catch (err) {
    throw err
  }
}

const cancelQueue = async (queue: string): Promise<void> => {
  try {
    await channel.purgeQueue(queue)
  } catch (err) {
    throw err
  }
}

export {
  sendOrder,
  initRabbitMq,
  cancelQueue,
  QueueList
}