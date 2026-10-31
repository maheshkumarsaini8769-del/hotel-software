const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

function send(msg) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ ...msg, id }));
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

ws.onopen = async () => {
  await send({ method: 'Runtime.enable' });

  console.log('1. Clicking Switch Station in Staff App...');
  const res1 = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = document.querySelector('[data-testid="switch-station-btn"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Switch Station'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.innerText };
        }
        return { notFound: true };
      })()`,
      returnByValue: true
    }
  });
  console.log('Switch station button clicked:', res1.result.value);

  await delay(1000);

  // Check current view: should be Portal Picker
  const state1 = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 300),
        buttons: Array.from(document.querySelectorAll('button, [role="button"]')).map(b => b.innerText.trim()).filter(Boolean)
      }))()`,
      returnByValue: true
    }
  });
  console.log('Staff app step after Switch Station:', state1.result.value);

  process.exit(0);
};
