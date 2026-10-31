const WebSocket = require('ws');
const http = require('http');

async function main() {
  const port = process.argv[2] || '9224';
  const expr = process.argv[3] || 'document.title';
  const targetOrigin = process.argv[4]; // optional filter like '3008' or '3004'
  
  const targets = await new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/json`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const target = targets[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  const contexts = [];
  let reqId = 100;

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
  });

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.method === 'Runtime.executionContextCreated') {
      contexts.push(data.params.context);
    }
    
    if (data.id === 2) {
      setTimeout(() => {
        let iframeCtx;
        if (targetOrigin) {
          iframeCtx = contexts.find(c => c.origin && c.origin.includes(targetOrigin));
        } else {
          // If port 9224, look for non-localhost origin
          iframeCtx = contexts.find(c => c.origin && !c.origin.includes('localhost')) || contexts[contexts.length - 1];
        }
        const ctxId = iframeCtx ? iframeCtx.id : undefined;
        
        ws.send(JSON.stringify({
          id: reqId,
          method: 'Runtime.evaluate',
          params: {
            expression: expr,
            contextId: ctxId,
            returnByValue: true,
            awaitPromise: true
          }
        }));
      }, 500);
    }

    if (data.id === reqId) {
      if (data.result && data.result.exceptionDetails) {
        console.error('Error:', data.result.exceptionDetails);
      } else {
        console.log(JSON.stringify(data.result ? data.result.result : data, null, 2));
      }
      ws.close();
    }
  });
}

main().catch(console.error);
