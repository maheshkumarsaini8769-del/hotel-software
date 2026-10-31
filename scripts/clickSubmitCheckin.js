const WebSocket = require('ws');

async function submit() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      
      const expr = `(() => {
        const btn = document.querySelector('[data-testid="btn-submit-checkin"]');
        if (!btn) return { error: 'Button not found' };
        const info = {
          disabled: btn.disabled,
          text: btn.innerText.trim()
        };
        btn.click();
        return { clicked: true, info };
      })()`;

      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          contextId: 2,
          expression: expr,
          returnByValue: true
        }
      }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.id === 2) {
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

submit().then(res => {
  console.log('Result:', JSON.stringify(res, null, 2));
}).catch(err => {
  console.error('Error:', err);
});
