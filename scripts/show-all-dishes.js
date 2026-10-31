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
        // Reset category pills
        const pills = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Dishes') || b.innerText === 'All');
        const allPill = pills.find(p => p.innerText.includes('All'));
        allPill?.click();

        const search = document.querySelector('input[placeholder*="Search dishes"]');
        if (search) {
          search.value = '';
          search.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    }
  });

  await delay(500);

  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        return Array.from(document.querySelectorAll('.grid > div')).map(d => d.innerText.replace(/\\n+/g, ' | '));
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
