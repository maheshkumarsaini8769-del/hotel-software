const http = require('http');
const WebSocket = require('ws');
const { execSync } = require('child_process');

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
    await new Promise(r => setTimeout(r, 1000));

    const waiterCtx = contexts.find(c => c.origin.includes('3002') || c.origin.includes('10.208.156.216'));
    const contextId = waiterCtx.id;
    console.log('Using waiter contextId:', contextId);

    // 1. Click "Cooking in Kitchen (Chef KOTs) (1)" tab or inspect tickets
    const clickCooking = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cooking in Kitchen'));
        if (btn) {
          btn.click();
          return 'clicked cooking tab';
        }
        return 'cooking tab not found';
      })()`,
      returnByValue: true
    });
    console.log('Click Cooking tab:', clickCooking.result.value);
    await new Promise(r => setTimeout(r, 1000));

    // 2. Inspect buttons and order details
    const orderDetails = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.innerText.trim(),
          testId: b.getAttribute('data-testid')
        }));
        const text = document.body.innerText.slice(0, 1500);
        return { text, buttons };
      })()`,
      returnByValue: true
    });
    console.log('Order Details:', JSON.stringify(orderDetails.result.value, null, 2));

    // 3. Mark Served / Delivered on the ticket or deliver request
    const markServed = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const serveBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const t = b.innerText.toLowerCase();
          return t.includes('serve') || t.includes('deliver') || t.includes('done');
        });
        if (serveBtn) {
          serveBtn.click();
          return 'clicked serve/deliver button: ' + serveBtn.innerText;
        }
        return 'no direct serve button';
      })()`,
      returnByValue: true
    });
    console.log('Mark Served:', markServed.result.value);
    await new Promise(r => setTimeout(r, 1000));

    // Capture screenshot: step04e_waiter_room_service_served.png
    execSync('adb exec-out screencap -p > artifacts/mobile-e2e/step04e_waiter_room_service_served.png');
    console.log('Captured artifacts/mobile-e2e/step04e_waiter_room_service_served.png');

    ws.close();
  });
}

main().catch(console.error);
