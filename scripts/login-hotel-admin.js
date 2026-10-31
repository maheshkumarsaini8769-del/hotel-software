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
  const setInput = `(() => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const emailInput = document.querySelector('input[type="email"]');
    const passInput = document.querySelector('input[type="password"]');
    
    if (emailInput && passInput) {
      nativeSetter.call(emailInput, 'admin@maheshpalace.hotel');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      nativeSetter.call(passInput, 'SpiceHub@123');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
        return { submitted: true };
      }
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
      if (btn) {
        btn.click();
        return { clicked: true };
      }
    }
    return { error: 'elements not found' };
  })()`;

  const res = await send({
    method: 'Runtime.evaluate',
    params: { expression: setInput, returnByValue: true }
  });
  console.log('Submit result:', JSON.stringify(res, null, 2));

  await delay(2000);

  const check = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        url: window.location.href,
        title: document.title,
        heading: document.querySelector('h1, h2')?.innerText,
        error: document.querySelector('[role="alert"], .text-rose-400, .text-red-500')?.innerText,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean).slice(0, 8)
      }))()`,
      returnByValue: true
    }
  });

  console.log('After submit:', JSON.stringify(check, null, 2));
  process.exit(0);
};
