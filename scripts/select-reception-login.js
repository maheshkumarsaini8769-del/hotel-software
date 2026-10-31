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

  console.log('1. Clicking Reception Front Desk portal...');
  const res1 = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button, div, [role="button"]')).find(b => 
          b.innerText && b.innerText.includes('Reception Front Desk')
        );
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.innerText.slice(0, 50) };
        }
        return { notFound: true };
      })()`,
      returnByValue: true
    }
  });
  console.log('Reception portal card click:', res1.result.value);

  await delay(1200);

  // Check Staff selection page or PIN prompt
  const state2 = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 400),
        buttons: Array.from(document.querySelectorAll('button, [role="button"]')).map(b => b.innerText.trim()).filter(Boolean)
      }))()`,
      returnByValue: true
    }
  });
  console.log('Staff list / auth state:', state2.result.value);

  // Look for Reception staff member card
  const selectReception = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div, button, [role="button"]')).filter(el => {
          return el.innerText && (el.innerText.includes('Reception') || el.innerText.includes('FRONT_DESK'));
        });
        const target = cards[cards.length - 1];
        if (target) {
          target.click();
          return { clicked: true, text: target.innerText.slice(0, 60) };
        }
        return { notFound: true };
      })()`,
      returnByValue: true
    }
  });
  console.log('Selected Reception staff member:', selectReception.result.value);

  await delay(800);

  // Now enter PIN 4444
  const enterPin = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        // Find digit buttons 4 or PIN input
        const pinInput = document.querySelector('input[type="password"], input[type="text"], input[name="pin"], [data-testid="staff-pin-input"]');
        if (pinInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(pinInput, '4444');
          pinInput.dispatchEvent(new Event('input', { bubbles: true }));
          pinInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Also try clicking key '4' four times if on-screen numpad exists
        const btn4 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '4');
        if (btn4) {
          btn4.click();
          btn4.click();
          btn4.click();
          btn4.click();
        }

        // Click Submit / Unlock / Verify button
        const submit = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText.includes('Unlock') || b.innerText.includes('Verify') || b.innerText.includes('Login') || b.innerText.includes('Enter')
        );
        if (submit) {
          submit.click();
          return { enteredPin: true, submitClicked: submit.innerText };
        }
        return { enteredPin: true, noSubmitBtn: true };
      })()`,
      returnByValue: true
    }
  });
  console.log('Enter PIN result:', enterPin.result.value);

  await delay(2000);

  // Check state after PIN
  const afterPin = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        text: document.body.innerText.slice(0, 400),
        hasIframe: !!document.querySelector('iframe'),
        iframeSrc: document.querySelector('iframe')?.src
      }))()`,
      returnByValue: true
    }
  });
  console.log('State after PIN:', afterPin.result.value);

  process.exit(0);
};
