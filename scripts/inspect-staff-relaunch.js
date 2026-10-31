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
    await send('Runtime.enable');
    const res = await send('Runtime.evaluate', {
      expression: `({
        text: document.body.innerText.slice(0, 800),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.innerText.trim().slice(0, 40),
          testId: b.getAttribute('data-testid')
        }))
      })`,
      returnByValue: true
    });
    console.log('Staff App State:', JSON.stringify(res.result.value, null, 2));
    ws.close();
  });
}

main().catch(console.error);
