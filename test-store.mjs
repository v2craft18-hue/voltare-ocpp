// Isolated simulator storage. Never connect a real charger to this adapter.
import {createHash} from 'node:crypto';
export function createTestStore(){
 const replies=new Map(),transactions=new Map();let nextTransaction=1;
 return async(charger,message)=>{
  if(charger!=='SIM-TESTE')throw Error('Test identity required');
  const key=charger+':'+message.messageId,hash=createHash('sha256').update(JSON.stringify({action:message.action,payload:message.payload})).digest('hex');
  const previous=replies.get(key);if(previous){if(previous.hash!==hash)throw Error('Message ID reused with different payload');return previous.reply}
  if(replies.size>=10000)throw Error('Test storage capacity reached; restart test');
  const {action,payload:p,authorized}=message;let reply;
  switch(action){
   case 'BootNotification':reply={status:'Accepted',currentTime:new Date().toISOString(),interval:30};break;
   case 'Heartbeat':reply={currentTime:new Date().toISOString()};break;
   case 'StatusNotification':case 'MeterValues':reply={};break;
   case 'Authorize':reply={idTagInfo:{status:authorized?'Accepted':'Invalid'}};break;
   case 'StartTransaction':{const id=nextTransaction++;transactions.set(id,{charger,active:authorized});reply={transactionId:id,idTagInfo:{status:authorized?'Accepted':'Invalid'}};break}
   case 'StopTransaction':{const tx=transactions.get(p.transactionId);if(!tx||tx.charger!==charger||!tx.active)throw Error('Unknown transaction');tx.active=false;reply={idTagInfo:{status:'Accepted'}};break}
   case 'DataTransfer':reply={status:'UnknownVendorId'};break;
   default:throw Error('Unsupported request');
  }
  replies.set(key,{hash,reply});return reply;
 }
}
