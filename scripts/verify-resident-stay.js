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
    // 1. Click "Already checked in at Front Desk? Verify Room Stay"
    const clickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('[data-testid="home-resident-verify-link"]');
        if (btn) {
          btn.click();
          return 'clicked verify link';
        }
        return 'verify link not found';
      })()`,
      returnByValue: true
    });
    console.log('Step 1:', clickRes.result.value);

    // Wait a brief moment for transition to resident_verify view
    await new Promise(r => setTimeout(r, 600));

    // 2. Fill room 101 and phone 9999999999 and submit
    const fillRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const roomInput = document.querySelector('[data-testid="resident-room-input"]');
        const phoneInput = document.querySelector('[data-testid="resident-phone-input"]');
        const form = document.querySelector('form');
        
        if (!roomInput || !phoneInput) return 'inputs not found';
        
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(roomInput, '101');
        roomInput.dispatchEvent(new Event('input', { bubbles: true }));
        roomInput.dispatchEvent(new Event('change', { bubbles: true }));

        nativeSetter.call(phoneInput, '9999999999');
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));

        const submitBtn = document.querySelector('[data-testid="verify-resident-stay-btn"]') || form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return 'submitted resident verification';
        }
        return 'submit button not found';
      })()`,
      returnByValue: true
    });
    console.log('Step 2:', fillRes.result.value);

    ws.close();
  });
}

main().catch(console.error);
