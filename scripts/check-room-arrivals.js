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

  console.log('1. Clicking Room Arrivals sub-tab...');
  const res1 = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Room Arrivals'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.innerText };
        }
        return { notFound: true };
      })()`,
      contextId: 3,
      returnByValue: true
    }
  });
  console.log('Room Arrivals sub-tab click:', res1.result.value);

  await delay(1200);

  const arrivalsState = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 1000),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.innerText.trim(),
          testId: b.getAttribute('data-testid')
        })).filter(b => b.text.length > 0)
      }))()`,
      contextId: 3,
      returnByValue: true
    }
  });
  console.log('Arrivals state:', JSON.stringify(arrivalsState.result.value, null, 2));

  process.exit(0);
};
