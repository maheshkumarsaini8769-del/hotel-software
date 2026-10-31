const WebSocket = require('ws');

async function run(fn) {
  const res = await fetch('http://127.0.0.1:9223/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  let childContextId = null;

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.method === 'Runtime.executionContextCreated') {
        const ctx = data.params.context;
        if (ctx.origin && ctx.origin.includes(':3001')) {
          childContextId = ctx.id;
          const expression = `(${fn.toString()})()`;
          ws.send(JSON.stringify({
            id: 100,
            method: 'Runtime.evaluate',
            params: {
              contextId: childContextId,
              expression: expression,
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

    ws.on('error', reject);
  });
}

module.exports = { run };
