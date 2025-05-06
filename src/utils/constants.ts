function getStatusT(status: string, qty?: string): {status: string, message: string} {
  console.log("Received Status Code:", status);
  switch (status) {
    case '01': return {
      status: '01',
      message: 'ขาดการเชื่อมต่อจากเซิร์ฟเวอร์'
    };
    case '02': return {
      status: '02',
      message: 'ชุดคำสั่งไม่ถูกต้อง'
    };
    case '03': return {
      status: '03',
      message: 'Checksum ในชุดคำสั่งไม่ถูกต้อง (Sxx)'
    };
    case '04': return {
      status: '04',
      message: 'คาร์ทีเซียนแกนนอนไม่เข้าตำแหน่ง'
    };
    case '05': return {
      status: '05',
      message: 'คาร์ทีเซียนแกนตั่งไม่เข้าตำแหน่ง'
    };
    case '06': return {
      status: '06',
      message: 'กลไกหยิบขาไม่เข้าตำแหน่ง'
    };
    case '07': return {
      status: '07',
      message: 'คาร์ทีเซียนแกนนอนไม่เคลื่อนที่ไปยังโมดูล'
    };
    case '08': return {
      status: '08',
      message: 'คาร์ทีเซียนแกนตั่งไม่เคลื่อนที่ไปยังโมดูล'
    };
    case '09': return {
      status: '09',
      message: 'สายพานป้อนเข้า'
    };
    case '10': return {
      status: '10',
      message: 'กระบวนการหยิบยา'
    };
    case '11': return {
      status: '11',
      message: 'คาร์ทีเซียนแกนนอนไม่เคลื่อนที่ไปยังช่องปล่อย'
    };
    case '12': return {
      status: '12',
      message: 'คาร์ทีเซียนแกนตั่งไม่เคลื่อนที่ไปยังช่องปล่อย'
    };
    case '13': return {
      status: '13',
      message: 'สายพานป้อนเข้า'
    };
    case '14': return {
      status: '14',
      message: 'สายพานหยุด'
    };
    case '91': return {
      status: '91',
      message: 'ได้รับคำสั่งแล้ว'
    };
    case '92': return {
      status: '92',
      message: `จ่ายยาสำเร็จจำนวน ${qty}`
    };
    case '30': return {
      status: '30',
      message: 'ประตูทั่งสองฝั่งล็อก'
    };
    case '31': return {
      status: '31',
      message: 'ประตูฝั่งซ้ายล็อกเพียงบานเดียว'
    };
    case '32': return {
      status: '32',
      message: 'ประตูฝั่งขวาล็อกเพียงบานเดียว'
    };
    case '33': return {
      status: '33',
      message:'ประตูทั่งสองฝั่งไม่ได้ล็อก'
    };
    case '34': return {
      status: '34',
      message: 'ช่องจ่ายาทั􀃊งสองว่าง'
    };
    case '35': return {
      status: '35',
      message: 'ช่องจ่ายยาฝั่งซ้ายว่างเพียงช่องเดียว'
    };
    case '36': return {
      status: '36',
      message: 'ช่องจ่ายยาฝั่งขวาว่างเพียงช่องเดียว'
    };
    case '37': return {
      status: '37',
      message: 'ช่องจ่ายยาทั่งสองฝั่งเต็ม'
    };
    default: return {
      status: '00',
      message: 'T00'
    };
  }
}

export { getStatusT }



