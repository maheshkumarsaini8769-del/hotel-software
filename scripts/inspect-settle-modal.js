const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    // Inspect settlement modal content
    const expr = `
      (() => {
        const modal = document.querySelector('[data-testid="modal-settle-checkout-admin"]');
        if (!modal) return { open: false };
        const text = modal.innerText;
        const payModes = Array.from(modal.querySelectorAll('[data-testid^="paymode-btn-"]')).map(b => ({
          testId: b.getAttribute('data-testid'),
          text: b.innerText.trim(),
          className: b.className
        }));
        const confirmBtn = modal.querySelector('[data-testid="btn-confirm-settle-checkout"]');
        return {
          open: true,
          textSummary: text.slice(0, 500),
          payModes,
          confirmBtnText: confirmBtn ? confirmBtn.innerText.trim() : null
        };
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
  }, 1000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 2) {
    console.log('SETTLE MODAL STATE:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
});
