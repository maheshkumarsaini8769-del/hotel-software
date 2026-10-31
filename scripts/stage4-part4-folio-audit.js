const http = require('http');
const WebSocket = require('ws');
const { execSync } = require('child_process');

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
    console.log('Using portal contextId:', contextId);

    // 1. Switch to Folio tab
    const navFolio = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const folioNav = document.querySelector('[data-testid="mobile-nav-bill"]');
        if (folioNav) {
          folioNav.click();
          return 'switched to folio';
        }
        return 'folio nav not found';
      })()`,
      returnByValue: true
    });
    console.log('1. Nav Folio:', navFolio.result.value);
    await new Promise(r => setTimeout(r, 1200));

    // 2. Read folio text details
    const folioDetails = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const main = document.querySelector('main');
        return {
          text: main ? main.innerText.slice(0, 1500) : 'no main'
        };
      })()`,
      returnByValue: true
    });
    console.log('Folio Text:', folioDetails.result.value.text);

    // Capture screenshot: step04d_room_folio_audit.png
    execSync('adb exec-out screencap -p > artifacts/mobile-e2e/step04d_room_folio_audit.png');
    console.log('Captured artifacts/mobile-e2e/step04d_room_folio_audit.png');

    ws.close();
  });
}

main().catch(console.error);
