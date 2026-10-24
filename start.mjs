import {createReceiver} from './server.mjs';
import {createTestStore} from './test-store.mjs';
const mode=process.env.OCPP_MODE||'test';
let credentials,ingest;
if(mode==='test'){
 const password=process.env.OCPP_TEST_PASSWORD;
 if(!password||password.length<24)throw Error('A private OCPP_TEST_PASSWORD with at least 24 characters is required');
 credentials={'SIM-TESTE':{password,connectors:2,idTags:['TEST-CARD']}};
 ingest=createTestStore();
}else if(mode==='supabase'){
 const {readFileSync}=await import('node:fs');credentials=JSON.parse(readFileSync(process.env.OCPP_CREDENTIALS_FILE||'/etc/secrets/chargers.json','utf8'));
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url||'')||!key)throw Error('Private Supabase configuration required');
 ingest=async(id,message)=>{const r=await fetch(`${url}/rest/v1/rpc/ocpp_ingest`,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`},body:JSON.stringify({p_charger:id,p_message:message}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Durable storage unavailable');return r.json()};
}else throw Error('OCPP_MODE must be test or supabase');
const receiver=createReceiver({credentials,ingest,host:'0.0.0.0',port:Number(process.env.PORT||8088),mode});
await receiver.start();console.info(`Voltare OCPP started; mode=${mode}; realCharger=${mode==='test'?'disabled':'configured'}`);
let stopping=false;for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{if(stopping)return;stopping=true;await receiver.close();process.exit(0)});
