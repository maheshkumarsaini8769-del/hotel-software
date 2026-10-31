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

  console.log('1. Clicking Unlock on Priya card...');
  const unlockRes = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const unlockBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Unlock'));
        if (unlockBtn) {
          unlockBtn.click();
          return { clicked: true, text: unlockBtn.innerText };
        }
        return { notFound: true };
      })()`,
      returnByValue: true
    }
  });
  console.log('Unlock button clicked:', unlockRes.result.value);

  await delay(800);

  // Check modal or PIN popup
  const modalState = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        inputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, placeholder: i.placeholder, name: i.name })),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean),
        text: document.body.innerText.slice(0, 500)
      }))()`,
      returnByValue: true
    }
  });
  console.log('Modal state:', JSON.stringify(modalState.result.value, null, 2));

  // Enter PIN 4444
  const enter = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const pinInput = document.querySelector('input[type=\"password\"], input[type=\"number\"], input[name=\"pin\"], [data-testid=\"staff-pin-input\"]');
        if (pinInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(pinInput, '4444');
          pinInput.dispatchEvent(new Event('input', { bubbles: true }));
          pinInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Click numeric key '4' 4 times
        const num4 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '4');
        if (num4) {
          num4.click();
          num4.click();
          num4.click();
          num4.click();
        }

        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Verify') || b.innerText.includes('Unlock') || b.innerText.includes('Enter Workstation') || b.innerText.includes('Confirm')
        );
        if (confirmBtn) {
          confirmBtn.click();
          return { submitted: true, btnText: confirmBtn.innerText };
        }
        return { submitted: true, noBtn: true };
      })()`,
      returnByValue: true
    }
  });
  console.log('PIN entry result:', enter.result.value);

  await delay(2500);

  // Check if workstation frame opened
  const finalState = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 300),
        hasIframe: !!document.querySelector('iframe'),
        iframeSrc: document.querySelector('iframe')?.src
      }))()`,
      returnByValue: true
    }
  });
  console.log('Final state after PIN submit:', JSON.stringify(finalState.result.value, null, 2));

  process.exit(0);
};
