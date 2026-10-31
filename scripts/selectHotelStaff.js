const WebSocket = require('ws');

async function selectHotel() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await res.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      const expr = `(() => {
        const cards = Array.from(document.querySelectorAll('[data-testid^="hotel-card-"]'));
        const target = cards.find(c => c.innerText.includes('Mahesh Palace'));
        if (target) {
          target.click();
          return { success: true, text: target.innerText.trim().slice(0, 50) };
        }
        return { error: 'Card not found', count: cards.length };
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

selectHotel().then(console.log).catch(console.error);
