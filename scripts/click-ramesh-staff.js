const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://localhost:9223/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const tab = tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const msgId = id++;
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === msgId) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  ws.on('open', async () => {
    // 1. Click Ramesh card
    const clickRamesh = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Ramesh'));
        if (btn) {
          btn.click();
          return 'clicked ramesh';
        }
        return 'ramesh button not found';
      })()`,
      returnByValue: true
    });
    console.log('1. Click Ramesh:', clickRamesh.result.value);

    await new Promise(r => setTimeout(r, 600));

    // 2. Check modal / PIN keypad
    const modalState = await send('Runtime.evaluate', {
      expression: `({
        text: document.body.innerText.slice(0, 600),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().slice(0, 20))
      })`,
      returnByValue: true
    });
    console.log('2. PIN Keypad State:', JSON.stringify(modalState.result.value, null, 2));

    ws.close();
  });
}

main().catch(console.error);
