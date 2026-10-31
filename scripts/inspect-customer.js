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
  console.log('Connecting to:', tab.title, tab.webSocketDebuggerUrl);

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
    console.log('WS connected');
    const res = await send('Runtime.evaluate', {
      expression: `({
        title: document.title,
        text: document.body.innerText.slice(0, 1000),
        url: window.location.href,
        inputs: Array.from(document.querySelectorAll('input, select, button')).map(el => ({
          tag: el.tagName,
          id: el.id,
          placeholder: el.placeholder,
          text: (el.innerText || el.value || '').trim().slice(0, 50),
          testId: el.getAttribute('data-testid')
        }))
      })`,
      returnByValue: true
    });
    console.log('DOM Info:', JSON.stringify(res.result.value, null, 2));
    ws.close();
  });
}

main().catch(console.error);
