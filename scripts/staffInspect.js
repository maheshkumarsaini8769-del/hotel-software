const WebSocket = require('ws');

async function evaluate(code) {
  const res = await fetch('http://127.0.0.1:9224/json/list');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page');
  if (!page) throw new Error('No page found');

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: code,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    });

    ws.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.id === 1) {
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

async function main() {
  const res = await evaluate(`(() => {
    return {
      title: document.title,
      text: document.body.innerText.slice(0, 500),
      hasWorkstationFrame: !!document.getElementById('workstation-frame'),
      switchBtn: !!document.querySelector('[data-testid="switch-station-btn"]'),
      myPhotoBtn: !!document.querySelector('[data-testid="waiter-self-profile-btn"]')
    };
  })()`);
  console.log('DOM State:', JSON.stringify(res, null, 2));
}

main().catch(console.error);
