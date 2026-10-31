const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        const roomButtons = Array.from(document.querySelectorAll('[data-testid^="room-select-"]')).map(b => ({
          testId: b.getAttribute('data-testid'),
          text: b.innerText.trim(),
          className: b.className
        }));
        return {
          roomButtons
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
    console.log('ROOM SELECT BUTTONS:', JSON.stringify(msg.result, null, 2));
    process.exit(0);
  }
});
