const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const btn = document.querySelector('[data-testid="btn-settle-checkout-101"]');
        if (!btn) return { btnFound: false };
        btn.scrollIntoView();
        // Dispatch mouse events
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        btn.click();
        return { btnFound: true, btnText: btn.innerText.trim() };
      })()
    `;
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: expr,
        contextId: 3,
        returnByValue: true
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 2) {
    console.log('CLICK DISPATCHED:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 1500);
  }
});
