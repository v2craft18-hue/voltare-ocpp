import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createReceiver} from './server.mjs';
import {validate,measurements} from './protocol.mjs';
test('validate protocol and normalize only unsigned outlet readings',()=>{
 assert.throws(()=>validate([2,'x','StartTransaction',{connectorId:3}],2));
 assert.throws(()=>validate([2,'x','RemoteStartTransaction',{}]),/NotImplemented/);
 assert.deepEqual(measurements({meterValue:[{timestamp:'2026-10-16T20:00:00Z',sampledValue:[{value:'1.5',unit:'kWh'},{value:'40',unit:'kW',measurand:'Power.Active.Import'},{value:'9',unit:'Wh',phase:'L1'},{value:'bad'}]}]}).map(x=>[x.field,x.value]),[['meterWh',1500],['powerW',40000]]);
});
test('authenticated WebSocket; duplicate reply; storage failure has no success ack',async()=>{
 const events=new Map();let writes=0;
 const receiver=createReceiver({credentials:{test:{password:'test-password-only',connectors:2}},port:0,ingest:async(id,m)=>{
  if(m.messageId==='fail')throw new Error('offline');
  const key=id+m.messageId;if(!events.has(key)){writes++;events.set(key,{currentTime:'2026-10-16T20:00:00Z'})}return events.get(key);
 }});
 const {port}=await receiver.start();let ws;
 try{
  const denied=new WebSocket(`ws://127.0.0.1:${port}/ocppj/test`,'ocpp1.6');
  await new Promise(resolve=>denied.once('error',resolve));
  ws=new WebSocket(`ws://127.0.0.1:${port}/ocppj/test`,'ocpp1.6',{headers:{Authorization:`Basic ${Buffer.from('test:test-password-only').toString('base64')}`}});
  await once(ws,'open');
  const call=async(frame)=>{const reply=once(ws,'message');ws.send(JSON.stringify(frame));return JSON.parse((await reply)[0].toString())};
  const a=await call([2,'repeat','Heartbeat',{}]);assert.equal(a[0],3);
  assert.deepEqual(await call([2,'repeat','Heartbeat',{}]),a);assert.equal(writes,1);
  assert.equal((await call([2,'fail','Heartbeat',{}]))[0],4);
  assert.equal((await call([2,'unknown','Anything',{}]))[2],'NotImplemented');
 }finally{ws?.terminate();await receiver.close()}
});
