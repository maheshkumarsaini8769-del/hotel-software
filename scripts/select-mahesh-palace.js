const ws = new WebSocket('ws://localhost:9223/devtools/page/97CF1F46DB092E0D09817AD1012AFA66');

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
  console.log('Finding Mahesh Palace card...');
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div, section, article')).filter(el => {
          return el.innerText && el.innerText.includes('Mahesh Palace') && el.innerText.includes('Select Hotel');
        });
        const target = cards[cards.length - 1]; // innermost or specific
        if (target) {
          target.scrollIntoView({ behavior: 'instant', block: 'center' });
          const btn = Array.from(target.querySelectorAll('button, div, span, a')).find(el => el.innerText.includes('Select Hotel') || el.innerText.includes('Open Workstations'));
          if (btn) {
            btn.click();
            return { clicked: true, text: btn.innerText };
          }
          target.click();
          return { clickedTarget: true };
        }
        return { notFound: true };
      })()`,
      returnByValue: true
    }
  });

  console.log('Click result:', JSON.stringify(res.result.value, null, 2));
  await delay(1200);

  // Check new page state
  const after = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 400),
        buttons: Array.from(document.querySelectorAll('button, [role=\"button\"]')).map(b => b.innerText.trim()).filter(Boolean)
      }))()`,
      returnByValue: true
    }
  });

  console.log('After selecting Mahesh Palace:', JSON.stringify(after.result.value, null, 2));
  process.exit(0);
};
