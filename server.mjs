import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {validate,measurements} from './protocol.mjs';

export function createReceiver({credentials,ingest,host='127.0.0.1',port=8088,mode='supabase'}) {
  if(!credentials||!Object.keys(credentials).length)throw new Error('Charger credentials required');
  const connections=new Map();
  const server=http.createServer((req,res)=>{
    if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voltare OCPP</title><style>body{background:#0c1921;color:#edf5f4;font:18px system-ui;max-width:700px;margin:10vh auto;padding:24px}b{color:#b8f861}code{overflow-wrap:anywhere}</style><h1>Voltare OCPP</h1><p><b>${mode==='test'?'HOMOLOGAÇÃO · SOMENTE SIMULADOR':'RECEPTOR OCPP'}</b></p><p>Servidor OCPP 1.6 JSON. Conexões exigem autenticação.</p><p>${mode==='test'?'Dados fictícios em memória; reiniciar apaga os testes. Equipamentos reais não estão habilitados.':'Mensagens são confirmadas somente após persistência no banco.'}</p><p>Diagnóstico do processo: <a style="color:#b8f861" href="/healthz">/healthz</a></p></html>`);return;}
    res.writeHead(req.url==='/healthz'?200:404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({service:'voltare-ocpp',processReady:req.url==='/healthz',mode,testOnly:mode==='test',storage:mode==='test'?'ephemeral-memory':'supabase'}));
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:131072,perMessageDeflate:false,handleProtocols:set=>set.has('ocpp1.6')?'ocpp1.6':false});
  server.on('upgrade',(req,socket,head)=>{
    let id; try {const url=new URL(req.url,'http://local'); const match=url.pathname.match(/^\/ocppj\/([A-Za-z0-9_-]{1,64})$/);if(url.search||!match)throw 0;id=match[1]} catch {socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return}
    const config=credentials[id];
    const auth=req.headers.authorization||'';
    const expected=config?.password?`Basic ${Buffer.from(`${id}:${config.password}`).toString('base64')}`:'';
    const a=Buffer.from(auth),b=Buffer.from(expected);
    const protocol=String(req.headers['sec-websocket-protocol']||'').split(',').map(s=>s.trim()).includes('ocpp1.6');
    if(!expected||a.length!==b.length||!timingSafeEqual(a,b)||!protocol){socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');return}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,id,config));
  });
  wss.on('connection',(ws,id,config)=>{
    connections.get(id)?.close(1008,'Connection replaced');connections.set(id,ws);
    let queue=Promise.resolve(),pending=0,alive=true;
    ws.on('pong',()=>{alive=true});
    const pulse=setInterval(()=>{if(!alive){ws.terminate();return}alive=false;ws.ping()},30000);pulse.unref();
    ws.on('message',(raw,binary)=>{
      if(binary||++pending>32){ws.close(1008,'Message limit');return}
      queue=queue.then(async()=>{
        if(connections.get(id)!==ws)return;
        let frame;try{frame=JSON.parse(raw.toString())}catch{ws.close(1007,'Invalid JSON');return}
        let message;try{message=validate(frame,config.connectors||2)}catch(error){const messageId=Array.isArray(frame)&&typeof frame[1]==='string'?frame[1].slice(0,36):'';ws.send(JSON.stringify([4,messageId,error.message,'Invalid or unsupported OCPP request',{}]));return}
        try {
          const response=await ingest(id,{...message,measurements:measurements(message.payload),authorized:(config.idTags||[]).includes(message.payload.idTag)});
          if(ws.readyState===1)ws.send(JSON.stringify([3,message.messageId,response]));
        }catch{if(ws.readyState===1)ws.send(JSON.stringify([4,message.messageId,'InternalError','Unable to persist message',{}]))}
      }).catch(()=>{ws.close(1011,'Receiver failure')}).finally(()=>{pending--});
    });
    ws.on('error',()=>{});
    ws.on('close',()=>{clearInterval(pulse);if(connections.get(id)===ws)connections.delete(id)});
  });
  return {
    start:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>resolve(server.address()))}),
    close:()=>new Promise(resolve=>{for(const ws of wss.clients)ws.terminate();wss.close(()=>server.close(resolve))})
  };
}

