const WebSocket = require('ws');

async function runStaff(fn) {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const page = pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      const expression = `(${fn.toString()})()`;
      ws.send(JSON.stringify({
        id: 100,
        method: 'Runtime.evaluate',
        params: {
          expression: expression,
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

module.exports = { runStaff };
