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

    // 1. Dismiss confirmation modal if present, and switch to Services tab
    const navServices = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        // Dismiss confirmation modal
        const trackBtn = document.querySelector('[data-testid="confirm-modal-track-btn"]') ||
          document.querySelector('[data-testid="confirm-modal-keep-browsing-btn"]');
        if (trackBtn) trackBtn.click();

        // Switch to services
        const servicesNav = document.querySelector('[data-testid="mobile-nav-services"]');
        if (servicesNav) {
          servicesNav.click();
          return 'switched to services';
        }
        return 'services nav not found';
      })()`,
      returnByValue: true
    });
    console.log('1. Nav Services:', navServices.result.value);
    await new Promise(r => setTimeout(r, 1000));

    // 2. Click Request on Water Bottle card
    const clickWater = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const waterBtn = document.querySelector('[data-testid="request-service-water-bottle"]') ||
          Array.from(document.querySelectorAll('button')).find(b => {
            const card = b.closest('div');
            return card && card.innerText && card.innerText.includes('Water Bottle');
          });
        if (waterBtn) {
          waterBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          waterBtn.click();
          return 'clicked request water bottle';
        }
        return 'water button not found';
      })()`,
      returnByValue: true
    });
    console.log('2. Request Water:', clickWater.result.value);
    await new Promise(r => setTimeout(r, 1200));

    // Capture screenshot: step04c_room_buzzer_water.png
    execSync('adb exec-out screencap -p > artifacts/mobile-e2e/step04c_room_buzzer_water.png');
    console.log('Captured artifacts/mobile-e2e/step04c_room_buzzer_water.png');

    ws.close();
  });
}

main().catch(console.error);
