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

ws.onopen = async () => {
  const check = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const categories = Array.from(document.querySelectorAll('.grid > div')).map(d => d.innerText.split('\\n')[0]);
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
        return { categories, buttons };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(check.result.value, null, 2));
  process.exit(0);
};
