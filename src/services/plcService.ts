export class PlcService {
  sendToPLC(message: string) {
    throw new Error('Method not implemented.');
  }
  private running = 0;

  getRunning() {
    this.running = this.running >= 9 ? 1 : this.running + 1;
    return this.running;
  }

}
