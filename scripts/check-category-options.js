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
  // Click "+ Add New Dish"
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add New Dish') || b.innerText.includes('+ New Dish'));
        btn?.click();
        return { clicked: !!btn };
      })()`,
      returnByValue: true
    }
  });

  await delay(500);

  // Check category options in the select
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const select = Array.from(document.querySelectorAll('select')).find(s => s.options && s.options.length > 0);
        return {
          categories: select ? Array.from(select.options).map(o => ({ text: o.text, value: o.value })) : []
        };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));

  // Close modal for now
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'));
        closeBtn?.click();
      })()`
    }
  });

  process.exit(0);
};
