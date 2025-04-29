export type ResponsePres = {
  status: string,
  data: Prescription
}

export type Prescription = {
  RFID: string,
  PrescriptionNo: string,
  HN: string,
  PatientName: string,
  Prescription: PrescriptionList[]
}

export type PrescriptionList = {
  f_prescriptionno: string,
  f_prescriptiondate: string,
  f_hn: string,
  f_an: string,
  f_patientname: string,
  f_wardcode: string,
  f_warddesc: string,
  f_prioritycode: string,
  f_prioritydesc: string,
  f_orderitemcode: string,
  f_orderitemname: string,
  f_orderqty: number,
  f_orderunitcode: string,
  Machine: string,
  command: string,
  f_binlocation: string,
  RowID: string
}

export type QueueList = {
  cmd: string,
  orderId: string
}

export type OrderType = {
  id: string,
  PrescriptionId: string,
  OrderItemId: string,
  OrderItemName: string,
  OrderQty: number,
  OrderUnitcode: string,
  Machine: string,
  Command: string,
  OrderStatus: string,
  Slot?: string,
  CreatedAt: Date,
  UpdatedAt: Date
}