const [name, role, pin, phone] = process.argv.slice(2);

const ws = new WebSocket('ws://localhost:9222/devtools/page/10464');
ws.onopen = () => {
  const code = `(() => {
    // Open modal if closed
    let modal = document.querySelector('[role=dialog], .modal, .fixed form');
    if (!modal) {
      const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create New Staff'));
      createBtn?.click();
    }

    // Wait a tick or execute directly
    setTimeout(() => {
      // Role button
      const roleBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('${role.toLowerCase()}'));
      roleBtn?.click();

      // Inputs
      const nameInput = document.querySelector('input[placeholder*="Ramesh Kumar"]');
      const phoneInput = document.querySelector('input[placeholder*="98765"]');
      const pinInput = document.querySelector('input[placeholder*="1234"]');

      if (nameInput) {
        nameInput.value = '${name}';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (phoneInput) {
        phoneInput.value = '${phone}';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (pinInput) {
        pinInput.value = '${pin}';
        pinInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Photo
      const fileInput = document.querySelector('input[type=file]');
      if (fileInput) {
        const dt = new DataTransfer();
        const file = new File([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 255, 219, 0, 67, 0, 8, 6, 6, 7, 6, 5, 8, 7, 7, 7, 9, 9, 8, 10, 12, 20, 13, 12, 11, 11, 12, 25, 18, 19, 15, 20, 29, 26, 31, 30, 29, 26, 28, 28, 32, 36, 46, 39, 32, 34, 44, 35, 28, 28, 40, 55, 41, 44, 48, 49, 52, 52, 52, 31, 39, 57, 61, 56, 50, 60, 46, 51, 52, 50, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 155, 255, 217])], '${name.toLowerCase()}.jpg', { type: 'image/jpeg' });
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Submit
      setTimeout(() => {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create & Issue'));
        submitBtn?.click();
      }, 300);
    }, 200);

    return { scheduled: true, name: '${name}', role: '${role}' };
  })()`;

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: code, returnByValue: true }
  }));
};

ws.onmessage = (event) => {
  const res = JSON.parse(event.data);
  console.log(JSON.stringify(res.result.result.value, null, 2));
  setTimeout(() => ws.close(), 1000);
};
