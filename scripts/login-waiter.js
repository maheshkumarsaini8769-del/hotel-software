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
    // Tap 1, 2, 3, 4
    for (const digit of ['1', '2', '3', '4']) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '${digit}');
          if (btn) btn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('Entered PIN 1234, waiting for portal launch...');
    await new Promise(r => setTimeout(r, 3000));

    const afterLaunch = await send('Runtime.evaluate', {
      expression: `({
        text: document.body.innerText.slice(0, 400),
        iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({ id: f.id, src: f.src }))
      })`,
      returnByValue: true
    });
    console.log('After Launch:', JSON.stringify(afterLaunch.result.value, null, 2));

    ws.close();
  });
}

main().catch(console.error);
