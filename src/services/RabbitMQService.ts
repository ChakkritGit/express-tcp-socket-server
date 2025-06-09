import amqp, { Channel, ChannelModel, Connection, ConsumeMessage } from 'amqplib';
import axios from 'axios';
import { io } from '../configs';
import { sendCommandFromQueue } from '../controllers/plcController';
import { PlcSendMessage } from '../types/inferface';
import { socketService, tcpService } from '../utils';

class RabbitMQService {
  private static instance: RabbitMQService; // 👈 static instance
  private connection!: ChannelModel;
  private channel!: Channel;
  private ackMessage = '';
  private newMessage: ConsumeMessage | null = null;

  // 👇 constructor เป็น private
  private constructor() { }

  // 👇 method สำหรับเรียก instance
  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async listenToQueue(queueName: string): Promise<void> {
    try {
      this.connection = await amqp.connect({
        hostname: process.env.RABBIT_HOST,
        port: Number(process.env.RABBIT_PORT),
        username: process.env.RABBIT_USER,
        password: process.env.RABBIT_PASS,
      });

      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.prefetch(1);

      console.log(`Listening to queue: ${queueName}`);

      this.channel.consume(queueName, async (msg) => {
        if (!msg) return;
        this.newMessage = msg;
        this.ackMessage = msg.content.toString();

        await this.handleMessage(this.ackMessage);
        // if (success) {
        //   this.channel.ack(msg);
        // } else {
        //   this.channel.nack(msg, false, true);
        // }
      }, { noAck: false });

    } catch (error) {
      console.error("Error connecting to RabbitMQ:", error);
    }
  }

  async handleMessage(message: string): Promise<boolean> {
    try {
      const connectedSockets = tcpService.getConnectedSockets();
      const socket = connectedSockets[0];
      if (socket) {
        const order: PlcSendMessage = JSON.parse(message);
        await axios.get(`http://localhost:3000/api/orders/status/pending/${order.orderId}/${order.presId}`);
        socketService.getIO().emit("res_message", `Create : 'update order'`);

        const dispensed = await sendCommandFromQueue(order.floor, order.position, order.qty, order.id);

        if (dispensed) {
          await axios.get(`http://localhost:3000/api/orders/status/receive/${order.orderId}/${order.presId}`);
        } else {
          await axios.get(`http://localhost:3000/api/orders/status/error/${order.orderId}/${order.presId}`);
          if (this.newMessage) {
            this.channel.ack(this.newMessage)
          }
        }
      }

      socketService.getIO().emit("res_message", `Successfully : 'Dispense success'`);
      return true;
    } catch (error) {
      console.error("Error processing message:", error);
      return false;
    }
  }

  // ไม่จำเป็นแล้ว ถ้า ack อยู่ภายนอก handleMessage
  acknowledgeMessage(): void {
    if (this.newMessage) {
      this.channel.ack(this.newMessage);
      console.log(`Acknowledged message: ${this.ackMessage}`);
    }
  }

  async deleteAndRecreateQueue(queueName: string): Promise<void> {
    try {
      await this.channel.deleteQueue(queueName);
      console.log(`Deleted queue: ${queueName}`);
      await this.listenToQueue(queueName);
    } catch (error) {
      console.error("Error deleting and recreating queue:", error);
    }
  }

  async closeConnection(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }
}

export default RabbitMQService;

