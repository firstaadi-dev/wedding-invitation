// Local-only fixture; never delivers mail and never logs message bodies.
const http = require('node:http');
const {randomUUID} = require('node:crypto');
http.createServer(async (req,res) => {
  res.setHeader('Content-Type','application/json');
  if(req.method==='GET' && req.url==='/__messages') { res.end(JSON.stringify(await pm.state.get('resend:messages') || []));return; }
  if(req.method==='POST' && req.url==='/__failure') {
    const v=typeof req.body==='string'?JSON.parse(req.body):req.body;
    await pm.state.set('resend:failure',v.enabled===true);res.end('{}');return;
  }
  if(req.method==='POST' && req.url==='/emails') {
    if(req.headers.authorization!=='Bearer test-email-key'){res.writeHead(401);res.end('{}');return;}
    if(await pm.state.get('resend:failure')){res.writeHead(503);res.end('{}');return;}
    const payload=typeof req.body==='string'?JSON.parse(req.body):req.body;
    const key=req.headers['idempotency-key'];
    if(!key){res.writeHead(400);res.end('{}');return;}
    const previous=await pm.state.get('resend:key:'+key);
    if(previous){res.end(JSON.stringify({id:previous}));return;}
    const id=randomUUID(),messages=await pm.state.get('resend:messages') || [];
    messages.push({id,key,payload});await pm.state.set('resend:messages',messages);await pm.state.set('resend:key:'+key,id);
    res.end(JSON.stringify({id}));return;
  }
  res.writeHead(501);res.end(JSON.stringify({error:'Endpoint not modeled'}));
}).listen(process.env.PORT);
