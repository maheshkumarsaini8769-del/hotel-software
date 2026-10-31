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

  const contexts = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.executionContextCreated') {
      contexts.push(msg.params.context);
    }
  });

  ws.on('open', async () => {
    await send('Runtime.enable');

    // Click Waiter Handheld Terminal
    const clickWaiter = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Waiter Handheld Terminal'));
        if (btn) {
          btn.click();
          return 'clicked waiter terminal button';
        }
        return 'waiter button not found';
      })()`,
      returnByValue: true
    });
    console.log('Click Waiter:', clickWaiter.result.value);

    // Wait for iframe to load
    await new Promise(r => setTimeout(r, 2500));

    console.log('Contexts after opening Waiter:', contexts.map(c => ({ id: c.id, origin: c.origin })));

    // Look for waiter context
    const waiterCtx = contexts.find(c => c.origin.includes('3002') || c.origin.includes('10.208.156.216'));
    if (waiterCtx) {
      const content = await send('Runtime.evaluate', {
        contextId: waiterCtx.id,
        expression: `({
          title: document.title,
          text: document.body.innerText.slice(0, 600),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().slice(0, 30))
        })`,
        returnByValue: true
      });
      console.log('Waiter App content:', JSON.stringify(content?.result?.value, null, 2));
    }

    ws.close();
  });
}

main().catch(console.error);
