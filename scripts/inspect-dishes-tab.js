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
  // Click All Food Items tab
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Food Items'));
        btn?.click();
        return { clicked: !!btn };
      })()`,
      returnByValue: true
    }
  });

  await delay(500);

  // List all dishes on screen
  const check = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('.grid > div')).map(d => ({
          text: d.innerText.replace(/\\n+/g, ' | ')
        }));
        return { cards };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(check.result.value, null, 2));
  process.exit(0);
};
