// import * as net from 'net';
// import { resolve } from 'path';
// import { getStatusT } from './constants'


// function plcServer() {
//     let server: net.Server | null = null;
//     let client: net.Socket | null = null;

//     function startPlcServer({ port }: { port: number }) {
//         server = net.createServer((socket) => {
//             client = socket;
//             const io = SocketIoService.getInstance().getIO()

//             console.log('📡 PLC Connected:', socket.remoteAddress, socket.remotePort);

//             socket.on('data', (data) => {
//                 console.log('📥 Received from PLC:', data.toString());
//                 const status = data.toString().split("T", 2)[1]?.substring(0, 2) || "00";
//                 const response = getStatusT(status); 
//                 console.log('Status:', response);
//                 io.emit('device', {
//                     message: `📥 Received from PLC: ${data.toString()} - Status: ${response.message} - ${response.status}`
//                 });
                
//                 // io.emit('device', {
//                 //     message: `📥 Received from PLC: ${data.toString()}`
//                 // })
//                 // io.emit('device', {
//                 //     message: `'Status: ${response.message} - ${response.status}`
//                 // })
//                 // socket.write(response);
//             });

//             socket.on('close', () => {
//                 console.log('❌ PLC Disconnected');
//                 client = null;
//             });

//             socket.on('error', (err) => {
//                 console.log('⚠️ Socket Error:', err.message);
//             });
//         });

//         server.listen(port, () => {
//             console.log(`🚀 PLC Server started on port : ${port}`);
//         });

//         server.on('error', (err) => {
//             console.log('⚠️ Server Error:', err.message);
//         });
//     }

//     function sendToPLC(data: string) {
//         if (!client) {
//             console.log('⚠️ No PLC Connected');
//             return;
//         }
//         console.log('📤 Sending to PLC:', data);
//         client.write(data);

//         return client;
//     }

//     return {
//         startPlcServer,
//         sendToPLC
//     };
// }

// export type PlcServer = ReturnType<typeof plcServer>;
// export { plcServer };

