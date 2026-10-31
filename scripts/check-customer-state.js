const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://localhost:9224/json', (res) => {
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
        url: window.location.href,
        text: document.body.innerText.slice(0, 1000),
        iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({
          id: f.id,
          src: f.src,
          name: f.name
        }))
      })`,
      returnByValue: true
    });
    console.log('Customer state:', JSON.stringify(res.result.value, null, 2));
    ws.close();
  });
}

main().catch(console.error);
