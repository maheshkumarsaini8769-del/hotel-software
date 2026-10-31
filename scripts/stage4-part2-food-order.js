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

    // 1. Click "Customize" or "Add" on Paneer Tikka card
    const clickAddRes = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const card = document.querySelector('[data-testid="dish-card-paneer-tikka"]');
        if (!card) return 'card not found';
        const btn = card.querySelector('button');
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
          return 'clicked paneer tikka button: ' + btn.innerText;
        }
        return 'no button inside card';
      })()`,
      returnByValue: true
    });
    console.log('1. Click Add/Customize:', clickAddRes.result.value);
    await new Promise(r => setTimeout(r, 800));

    // 2. In Customize Modal: Select "Spicy" and Click "Add to Cart"
    const modalRes = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const spicyBtn = buttons.find(b => b.innerText && b.innerText.trim() === 'Spicy');
        if (spicyBtn) spicyBtn.click();

        const addCartBtn = buttons.find(b => b.innerText && b.innerText.includes('Add to Cart'));
        if (addCartBtn) {
          addCartBtn.click();
          return 'added customized dish to cart';
        }
        return 'add to cart button not found';
      })()`,
      returnByValue: true
    });
    console.log('2. Modal Customization:', modalRes.result.value);
    await new Promise(r => setTimeout(r, 800));

    // 3. Open Cart: Click mobile floating cart button or cart header
    const openCartRes = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const floatingCart = document.querySelector('[data-testid="mobile-floating-cart-btn"]') ||
          document.querySelector('[data-testid="cart-header-btn"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('View Cart'));
        if (floatingCart) {
          floatingCart.click();
          return 'opened mobile cart drawer';
        }
        return 'cart button not found';
      })()`,
      returnByValue: true
    });
    console.log('3. Open Cart:', openCartRes.result.value);
    await new Promise(r => setTimeout(r, 800));

    // 4. Fill Special Instructions: "Extra spicy" and Click Confirm & Charge to Room
    const placeOrderRes = await send('Runtime.evaluate', {
      contextId,
      expression: `(() => {
        const noteInput = document.querySelector('[data-testid="input-special-instructions"]');
        if (noteInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(noteInput, 'Extra spicy');
          noteInput.dispatchEvent(new Event('input', { bubbles: true }));
          noteInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const confirmBtn = document.querySelector('[data-testid="confirm-place-order-btn"]');
        if (confirmBtn) {
          confirmBtn.click();
          return 'confirmed and placed order with note: Extra spicy';
        }
        return 'confirm button not found';
      })()`,
      returnByValue: true
    });
    console.log('4. Place Order:', placeOrderRes.result.value);
    await new Promise(r => setTimeout(r, 1500));

    // Capture screenshot: step04b_room_order_placed.png
    execSync('adb exec-out screencap -p > artifacts/mobile-e2e/step04b_room_order_placed.png');
    console.log('Captured artifacts/mobile-e2e/step04b_room_order_placed.png');

    ws.close();
  });
}

main().catch(console.error);
