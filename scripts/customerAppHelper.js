const WebSocket = require('ws');

async function evaluateInCustomer(fn) {
  const res = await fetch('http://127.0.0.1:9223/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      const expr = `(${fn.toString()})()`;
      ws.send(JSON.stringify({
        id: 100,
        method: 'Runtime.evaluate',
        params: {
          expression: expr,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
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

module.exports = { evaluateInCustomer };
