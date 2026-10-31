const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    // Inspect DOM inside context 3
    const expr = `
      (() => {
        const title = document.title;
        const currentUrl = window.location.href;
        const activeTabEl = document.querySelector('[data-testid^="tab-"]');
        const inHouseGuests = Array.from(document.querySelectorAll('[data-testid^="inhouse-guest-card-"]')).map(el => el.getAttribute('data-testid'));
        const tabs = Array.from(document.querySelectorAll('[data-testid^="tab-"]')).map(el => ({ id: el.getAttribute('data-testid'), text: el.innerText.trim() }));
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
        return { title, currentUrl, tabs, inHouseGuests, buttonSample: buttons.slice(0, 15) };
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
    console.log('DOM STATE:', JSON.stringify(msg.result, null, 2));
    process.exit(0);
  }
});
