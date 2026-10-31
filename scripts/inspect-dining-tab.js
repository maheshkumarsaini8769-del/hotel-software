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

  const contexts = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.executionContextCreated') {
      contexts.push(msg.params.context);
    }
  });

  ws.on('open', async () => {
    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 1000));

    const portalCtx = contexts.find(c => c.origin.includes('10.208.156.216') || c.origin.includes('3004'));
    const contextId = portalCtx.id;

    // Switch to DINING tab
    await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const diningBtn = document.querySelector('[data-testid="mobile-nav-dining"]');
        if (diningBtn) diningBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    // Inspect dishes
    const dishes = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        return Array.from(document.querySelectorAll('button, div')).filter(el => el.innerText && el.innerText.includes('Paneer Tikka')).map(el => ({
          tag: el.tagName,
          text: el.innerText.slice(0, 100),
          testId: el.getAttribute('data-testid')
        }));
      })()`,
      returnByValue: true
    });
    console.log('Paneer Tikka elements:', JSON.stringify(dishes.result.value, null, 2));

    ws.close();
  });
}

main().catch(console.error);
