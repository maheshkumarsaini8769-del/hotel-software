const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');

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
  console.log('Connected to Mobile Chrome');

  // Step 1: Open Add Category Modal
  console.log('Opening Add Category Modal...');
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add New Category'));
        btn?.click();
        return { clicked: !!btn };
      })()`,
      returnByValue: true
    }
  });

  await delay(400);

  // Step 2: Fill Category "Starters" and submit
  console.log('Submitting Category "Starters"...');
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Italian Pizza"]');
        if (input) {
          input.value = 'Starters';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submit = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.innerText.includes('Category'));
        submit?.click();
        return { submitted: !!submit };
      })()`,
      returnByValue: true
    }
  });

  await delay(800);

  // Step 3: Open Add Category Modal again for "Beverages"
  console.log('Opening Add Category Modal for Beverages...');
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add New Category'));
        btn?.click();
        return { clicked: !!btn };
      })()`,
      returnByValue: true
    }
  });

  await delay(400);

  // Step 4: Fill Category "Beverages" and submit
  console.log('Submitting Category "Beverages"...');
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const input = document.querySelector('input[placeholder*="Italian Pizza"]');
        if (input) {
          input.value = 'Beverages';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const select = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.value.includes('Beverage')));
        if (select) {
          select.value = 'Beverage & Bar Counter';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const submit = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.innerText.includes('Category'));
        submit?.click();
        return { submitted: !!submit };
      })()`,
      returnByValue: true
    }
  });

  console.log('Result:', JSON.stringify(res, null, 2));
  await delay(800);
  process.exit(0);
};
