const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9223/devtools/page/97CF1F46DB092E0D09817AD1012AFA66');

function send(msg) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ ...msg, id }));
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

ws.onopen = async () => {
  try {
    console.log('Connecting to DevTools context 3...');
    await send({ method: 'Runtime.enable' });
    await delay(200);

    // Fill form fields
    const fillResult = await send({
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

          // 1. Select Room 101
          const room101Btn = document.querySelector('[data-testid="room-select-101"]') ||
            Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Room 101'));
          if (room101Btn) {
            room101Btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            room101Btn.click();
          }

          // 2. Name
          const nameInput = document.querySelector('[data-testid="input-guest-name"]');
          if (nameInput) {
            nativeSetter.call(nameInput, 'Rahul');
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            nameInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 3. Phone
          const phoneInput = document.querySelector('[data-testid="input-guest-phone"]');
          if (phoneInput) {
            nativeSetter.call(phoneInput, '9999999999');
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
            phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 4. ID Number
          const idInput = document.querySelector('[data-testid="input-id-number"]');
          if (idInput) {
            nativeSetter.call(idInput, '5544-3322-1100');
            idInput.dispatchEvent(new Event('input', { bubbles: true }));
            idInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 5. Stay nights: 1
          const nightsInput = document.querySelector('[data-testid="input-stay-nights"]');
          if (nightsInput) {
            nativeSetter.call(nightsInput, '1');
            nightsInput.dispatchEvent(new Event('input', { bubbles: true }));
            nightsInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          return {
            room101Selected: !!room101Btn,
            name: nameInput?.value,
            phone: phoneInput?.value,
            idNumber: idInput?.value,
            nights: nightsInput?.value
          };
        })()`,
        contextId: 3,
        returnByValue: true
      }
    });

    console.log('Form filled:', JSON.stringify(fillResult.result.value, null, 2));
    await delay(800);

    // Submit Check-in
    console.log('Submitting check-in...');
    const submitResult = await send({
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const submitBtn = document.querySelector('[data-testid="btn-submit-checkin"]') ||
            Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Complete Check-In'));
          if (submitBtn) {
            submitBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
            submitBtn.click();
            return { submitted: true, text: submitBtn.innerText };
          }
          return { submitted: false };
        })()`,
        contextId: 3,
        returnByValue: true
      }
    });

    console.log('Submit button clicked:', JSON.stringify(submitResult.result.value, null, 2));

    // Wait for submission to complete
    await delay(3000);

    // Verify modal / result
    const checkStatus = await send({
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const bodyText = document.body.innerText;
          return {
            hasOccupied101: bodyText.includes('101') && (bodyText.includes('OCCUPIED') || bodyText.includes('Occupied')),
            snippet: bodyText.slice(0, 1000)
          };
        })()`,
        contextId: 3,
        returnByValue: true
      }
    });

    console.log('Post-checkin status:', JSON.stringify(checkStatus.result.value, null, 2));
    ws.close();
  } catch (err) {
    console.error('Error during checkin:', err);
    ws.close();
  }
};
