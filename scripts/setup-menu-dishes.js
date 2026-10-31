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
  console.log('1. Adding Beverages Category...');
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add New Category'));
        btn?.click();
      })()`
    }
  });

  await delay(400);

  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const nameInput = document.querySelector('input[placeholder*="Italian Pizza"]');
        if (nameInput) {
          nativeSetter.call(nameInput, 'Beverages');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const select = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.value.includes('Beverage')));
        if (select) {
          select.value = 'Beverage & Bar Counter';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const form = document.querySelector('form');
        form?.requestSubmit();
      })()`
    }
  });

  await delay(800);

  console.log('2. Updating Paneer Tikka price to 200...');
  // Switch to All Food Items tab
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Food Items'));
        tab?.click();
      })()`
    }
  });

  await delay(500);

  // Find Paneer Tikka and click edit
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const card = Array.from(document.querySelectorAll('.grid > div')).find(d => d.innerText.includes('Paneer Tikka'));
        const editBtn = card?.querySelector('button[title*=\"Edit\"]') || Array.from(card?.querySelectorAll('button') || []).pop();
        editBtn?.click();
      })()`
    }
  });

  await delay(400);

  // Update price to 200 and submit
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const priceInput = document.querySelector('input[type=\"number\"][placeholder*=\"280\"], input[type=\"number\"]');
        if (priceInput) {
          nativeSetter.call(priceInput, '200');
          priceInput.dispatchEvent(new Event('input', { bubbles: true }));
          priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const form = document.querySelector('form');
        form?.requestSubmit();
      })()`
    }
  });

  await delay(800);

  console.log('3. Adding Dish: Beer (₹300, Beverages)...');
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add New Dish') || b.innerText.includes('+ New Dish'));
        btn?.click();
      })()`
    }
  });

  await delay(400);

  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const nameInput = document.querySelector('input[placeholder*=\"Kadai Paneer\"]');
        if (nameInput) {
          nativeSetter.call(nameInput, 'Beer');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const priceInput = document.querySelector('input[type=\"number\"][placeholder*=\"280\"], input[type=\"number\"]');
        if (priceInput) {
          nativeSetter.call(priceInput, '300');
          priceInput.dispatchEvent(new Event('input', { bubbles: true }));
          priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Category select
        const catSelect = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.text.toLowerCase().includes('beverage')));
        if (catSelect) {
          const bevOpt = Array.from(catSelect.options).find(o => o.text.toLowerCase().includes('beverage'));
          if (bevOpt) {
            catSelect.value = bevOpt.value;
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // Select Beverage preset photo
        const bevBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Beverage'));
        bevBtn?.click();

        const form = document.querySelector('form');
        form?.requestSubmit();
      })()`
    }
  });

  await delay(1200);

  // Query updated dishes
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Food Items'));
        tab?.click();
        const cards = Array.from(document.querySelectorAll('.grid > div')).map(d => ({
          text: d.innerText.replace(/\\n+/g, ' | ')
        }));
        return { cards };
      })()`,
      returnByValue: true
    }
  });

  console.log('Updated Dishes:', JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
