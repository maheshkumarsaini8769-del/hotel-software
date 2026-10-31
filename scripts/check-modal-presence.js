const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const modal = document.querySelector('[data-testid="modal-settle-checkout-admin"]');
        const anyModal = document.querySelector('.fixed.inset-0');
        return {
          modalSettleAdmin: !!modal,
          anyFixedModal: !!anyModal,
          modalHtml: anyModal ? anyModal.outerHTML.slice(0, 300) : null
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
    console.log('MODAL CHECK:', JSON.stringify(msg.result, null, 2));
    process.exit(0);
  }
});
