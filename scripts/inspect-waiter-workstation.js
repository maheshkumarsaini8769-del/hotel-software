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
    await new Promise(r => setTimeout(r, 1200));

    console.log('Contexts in Staff App:', contexts.map(c => ({ id: c.id, origin: c.origin })));

    for (const ctx of contexts) {
      if (ctx.origin.includes('3002') || ctx.origin.includes('10.208.156.216')) {
        console.log('Inspecting context:', ctx.id, ctx.origin);
        const evalRes = await send('Runtime.evaluate', {
          contextId: ctx.id,
          expression: `({
            title: document.title,
            text: document.body.innerText.slice(0, 1000),
            buttons: Array.from(document.querySelectorAll('button')).map(b => ({
              text: b.innerText.trim().slice(0, 30),
              testId: b.getAttribute('data-testid')
            }))
          })`,
          returnByValue: true
        });
        console.log('Waiter Workstation content:', JSON.stringify(evalRes?.result?.value, null, 2));
      }
    }

    ws.close();
  });
}

main().catch(console.error);
