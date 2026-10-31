const WebSocket = require('ws');

async function clickNav(selector) {
  const res = await fetch('http://127.0.0.1:9223/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      const expr = `(() => {
        const btn = document.querySelector('${selector}');
        if (!btn) return { error: 'Not found: ${selector}' };
        btn.click();
        return { success: true, text: btn.innerText.trim() };
      })()`;

      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
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

const sel = process.argv[2] || '[data-testid="nav-tab-mystay"]';
clickNav(sel).then(res => {
  console.log('Nav result:', JSON.stringify(res, null, 2));
}).catch(err => {
  console.error('Error:', err);
});
