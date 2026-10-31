const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const modal = document.querySelector('[data-testid="front-desk-departure-modal"]');
        if (!modal) return { open: false };
        const buttons = Array.from(modal.querySelectorAll('button')).map(b => ({
          testId: b.getAttribute('data-testid'),
          text: b.innerText.trim(),
          className: b.className
        }));
        const inputs = Array.from(modal.querySelectorAll('input')).map(i => ({
          testId: i.getAttribute('data-testid'),
          type: i.type,
          value: i.value,
          checked: i.checked
        }));
        const text = modal.innerText;
        return {
          open: true,
          buttons,
          inputs,
          textSummary: text
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
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 2) {
    console.log('MODAL DETAILS:', JSON.stringify(msg.result, null, 2));
    process.exit(0);
  }
});
