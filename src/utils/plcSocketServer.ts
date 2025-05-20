// import * as net from 'net';
// import { getStatusT } from './constants';

// import { PlcService } from './plc.Service';
// import { socketService } from '.';

// export function startPlcServer(port: number) {
//     const server = net.createServer((socket) => {
//         console.log('📡 PLC Connected:', socket.remoteAddress, socket.remotePort);
//         PlcService.setClient(socket);

//         socket.on('data', (data) => {
//             const status = data.toString().split("T", 2)[1]?.substring(0, 2) || "00";
//             const response = getStatusT(status);

//             console.log('📥 PLC Response:', data.toString());
//             socketService.getIO().emit('device', {
//                 message: `📥 Received from PLC: ${data.toString()} - Status: ${response.message} (${response.status})`
//             });
//         });

//         socket.on('close', () => {
//             console.log('❌ PLC Disconnected');
//         });

//         socket.on('error', (err) => {
//             console.log('⚠️ PLC Socket Error:', err.message);
//         });
//     });

//     server.listen(port, () => {
//         console.log(`🚀 PLC Server running on port ${port}`);
//     });
// }
