const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const roomChips = Array.from(document.querySelectorAll('[data-testid^="room-chip-"]')).map(c => ({
          testId: c.getAttribute('data-testid'),
          text: c.innerText.trim(),
          className: c.className
        }));
        const selectEl = document.querySelector('select');
        const options = selectEl ? Array.from(selectEl.options).map(o => o.text) : [];
        return {
          roomChips,
          options
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
    console.log('CHECKIN ROOMS:', JSON.stringify(msg.result, null, 2));
    process.exit(0);
  }
});
