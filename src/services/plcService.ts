export class PlcService {
  private running = 0;

  getRunning() {
    this.running = this.running >= 9 ? 1 : this.running + 1;
    return this.running;
  }

}
