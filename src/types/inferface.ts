export interface PlcSendMessage {
    floor: number;
    position: number;
    qty: number;
    // container: number;
    id: string;
    orderId?: string
    presId?: string
}
