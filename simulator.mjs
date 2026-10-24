import {WebSocket} from 'ws';import {once} from 'node:events';import assert from 'node:assert/strict';
const base=process.env.OCPP_TEST_URL,password=process.env.OCPP_TEST_PASSWORD;
if(!base||!password)throw Error('Set OCPP_TEST_URL and OCPP_TEST_PASSWORD privately');
const url=new URL('/ocppj/SIM-TESTE',base);url.protocol=url.protocol==='https:'?'wss:':url.protocol==='http:'?'ws:':url.protocol;
const socket=new WebSocket(url,'ocpp1.6',{headers:{Authorization:'Basic '+Buffer.from('SIM-TESTE:'+password).toString('base64')},handshakeTimeout:90000});
let sequence=0;
try{
 await once(socket,'open');
 const call=async(action,payload,id=String(++sequence))=>{const result=once(socket,'message',{signal:AbortSignal.timeout(15000)});socket.send(JSON.stringify([2,id,action,payload]));const frame=JSON.parse(String((await result)[0]));assert.equal(frame[0],3);assert.equal(frame[1],id);return frame[2]};
 const boot=await call('BootNotification',{chargePointVendor:'Voltare Test',chargePointModel:'Simulator'});assert.equal(boot.status,'Accepted');
 await call('Heartbeat',{});await call('StatusNotification',{connectorId:1,status:'Available',errorCode:'NoError'});
 assert.equal((await call('Authorize',{idTag:'TEST-CARD'})).idTagInfo.status,'Accepted');
 assert.equal((await call('Authorize',{idTag:'UNKNOWN'})).idTagInfo.status,'Invalid');
 const start=await call('StartTransaction',{connectorId:1,idTag:'TEST-CARD',meterStart:1000,timestamp:new Date().toISOString()});assert.equal(start.idTagInfo.status,'Accepted');
 await call('StatusNotification',{connectorId:1,status:'Charging',errorCode:'NoError'});
 await call('MeterValues',{connectorId:1,transactionId:start.transactionId,meterValue:[{timestamp:new Date().toISOString(),sampledValue:[{value:'2500',unit:'Wh'}]}]});
 await call('StopTransaction',{transactionId:start.transactionId,meterStop:2500,timestamp:new Date().toISOString()});
 const repeat=await call('Heartbeat',{},'repeat');assert.deepEqual(await call('Heartbeat',{},'repeat'),repeat);
 console.info(JSON.stringify({ok:true,mode:'simulator',boot:true,heartbeat:true,status:true,authorization:true,transaction:true,meter:true,stop:true,replay:true,energyKwh:1.5}));
}finally{socket.close();setTimeout(()=>socket.terminate(),1000).unref()}
