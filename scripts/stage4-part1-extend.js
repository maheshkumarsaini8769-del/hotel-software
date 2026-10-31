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
    if (!portalCtx) {
      console.error('Portal context not found!');
      process.exit(1);
    }
    const contextId = portalCtx.id;
    console.log('Using portal contextId:', contextId);

    // 1. Click "Extend Check-out (+ Nights)"
    const openExtend = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const btn = document.querySelector('[data-testid="hero-extend-stay-btn"]');
        if (btn) {
          btn.click();
          return 'opened extend modal';
        }
        return 'extend button not found';
      })()`,
      returnByValue: true
    });
    console.log('1. Open Extend Modal:', openExtend.result.value);
    await new Promise(r => setTimeout(r, 600));

    // 2. Click "Confirm Stay Extension"
    const confirmExtend = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const submitBtn = document.querySelector('[data-testid="submit-extend-stay-btn"]');
        if (submitBtn) {
          submitBtn.click();
          return 'submitted stay extension';
        }
        return 'submit button not found';
      })()`,
      returnByValue: true
    });
    console.log('2. Confirm Extend:', confirmExtend.result.value);
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 4a: Stay Extension
    execSync('adb exec-out screencap -p > artifacts/mobile-e2e/step04a_room_stay_extension.png');
    console.log('Captured artifacts/mobile-e2e/step04a_room_stay_extension.png');

    ws.close();
  });
}

main().catch(console.error);
