export class PlcService {
  private running = 0;

  getRunning() {
    this.running = this.running >= 9 ? 1 : this.running + 1;
    return this.running;
  }

  sendToPLC(message: string) {
    console.log(`📤 Sending to PLC: ${message}`);
    // mock: return a fake event emitter or your real socket
    return {
      once: (event: string, callback: (data: Buffer) => void) => {
        setTimeout(() => callback(Buffer.from("OK")), 300);
      }
    };
  }
}
