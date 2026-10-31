const WebSocket = require('ws');

async function evaluateInKDS(fn) {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    let targetContextId = null;
    let evalSent = false;

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.method === 'Runtime.executionContextCreated') {
        const ctx = data.params.context;
        if (ctx.origin && (ctx.origin.includes(':3003') || ctx.origin.includes('3003'))) {
          targetContextId = ctx.id;
          evalSent = true;
          const expr = `(${fn.toString()})()`;
          ws.send(JSON.stringify({
            id: 100,
            method: 'Runtime.evaluate',
            params: {
              contextId: targetContextId,
              expression: expr,
              returnByValue: true,
              awaitPromise: true
            }
          }));
        }
      }
      if (data.id === 100) {
        ws.close();
        if (data.result?.exceptionDetails) {
          reject(data.result.exceptionDetails);
        } else {
          resolve(data.result?.result?.value);
        }
      }
    });

    setTimeout(() => {
      if (!evalSent) {
        ws.close();
        reject(new Error('KDS context not found within timeout'));
      }
    }, 4000);

    ws.on('error', reject);
  });
}

module.exports = { evaluateInKDS };
