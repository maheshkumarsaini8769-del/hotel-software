const ws = new WebSocket('ws://localhost:9222/devtools/page/10466');

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
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Categories'));
        btn?.click();
      })()`
    }
  });

  await delay(500);

  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const dishCards = Array.from(document.querySelectorAll('.grid > div'))
          .filter(d => d.innerText.includes('₹'))
          .map(d => ({
            name: d.querySelector('h3')?.innerText || d.innerText.split('\\n')[0],
            text: d.innerText.replace(/\\n+/g, ' | ')
          }));
        return { dishCards };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
