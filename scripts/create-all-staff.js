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

async function addStaff(name, roleKey, pin, phone) {
  console.log(`Adding ${name} (roleKey: ${roleKey}, PIN: ${pin})...`);
  // Open modal
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create New Staff'));
        createBtn?.click();
      })()`
    }
  });

  await delay(500);

  // Fill modal
  await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const roleBtn = document.querySelector('[data-testid=\"create-staff-role-${roleKey.toLowerCase()}\"]');
        if (roleBtn) roleBtn.click();

        const nameInput = document.querySelector('input[placeholder*="Ramesh Kumar"]');
        const phoneInput = document.querySelector('input[placeholder*="98765"]');
        const pinInput = document.querySelector('input[placeholder*="1234"]');

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        if (nameInput) {
          nativeSetter.call(nameInput, '${name}');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (phoneInput) {
          nativeSetter.call(phoneInput, '${phone}');
          phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (pinInput) {
          nativeSetter.call(pinInput, '${pin}');
          pinInput.dispatchEvent(new Event('input', { bubbles: true }));
          pinInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const fileInput = document.querySelector('input[type=file]');
        if (fileInput) {
          const dt = new DataTransfer();
          const file = new File([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 255, 219, 0, 67, 0, 8, 6, 6, 7, 6, 5, 8, 7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11, 11, 12, 25, 18, 19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39, 32, 34, 44, 35, 28, 28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39, 57, 61, 56, 50, 60, 46, 51, 52, 50, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 155, 255, 217])], '${name.toLowerCase()}.jpg', { type: 'image/jpeg' });
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        setTimeout(() => {
          const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create & Issue'));
          submitBtn?.click();
        }, 300);
      })()`
    }
  });

  await delay(1200);
}

ws.onopen = async () => {
  await addStaff('Chef Suresh', 'chef', '2222', '9876500005');
  await addStaff('Cashier Vikram', 'cashier', '3333', '9876500006');
  await addStaff('Reception Priya', 'receptionist', '4444', '9876500007');

  const check = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => ({
        bodyText: document.body.innerText.slice(0, 600)
      }))()`,
      returnByValue: true
    }
  });

  console.log('Result after creating all staff:\n', check.result.value.bodyText);
  process.exit(0);
};
