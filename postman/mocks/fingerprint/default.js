// Local fixture control only; event fields match the Server API v4 contract used by verification.
const http = require('node:http');
http.createServer(async (req,res) => {
  res.setHeader('Content-Type','application/json');
  if (req.method === 'POST' && req.url === '/__fixtures') {
    const event=typeof req.body==='string'?JSON.parse(req.body):req.body;
    await pm.state.set(`fingerprint:${event.event_id}`,event);
    res.end('{}');return;
  }
  if (req.method === 'GET' && req.url.startsWith('/v4/events/')) {
    if (req.headers.authorization !== 'Bearer test') {res.writeHead(403);res.end('{}');return;}
    const id=decodeURIComponent(req.url.slice('/v4/events/'.length));
    if(id==='upstream-unavailable'){res.writeHead(503);res.end('{}');return;}
    const event=await pm.state.get(`fingerprint:${id}`);
    if(!event){res.writeHead(404);res.end('{}');return;}
    res.end(JSON.stringify(event));return;
  }
  res.writeHead(501);res.end(JSON.stringify({error:'Endpoint not modeled by this fixture'}));
}).listen(process.env.PORT);
