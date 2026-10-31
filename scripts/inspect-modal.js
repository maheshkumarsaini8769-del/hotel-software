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

ws.onopen = async () => {
  const res = await send({
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const modal = document.querySelector('form');
        const roleButtons = Array.from(document.querySelectorAll('[data-testid^="create-staff-role"]')).map(b => ({
          testId: b.getAttribute('data-testid'),
          text: b.innerText,
          className: b.className
        }));
        const inputs = Array.from(modal ? modal.querySelectorAll('input') : []).map(i => ({ placeholder: i.placeholder, value: i.value }));
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create & Issue'));
        const toast = document.querySelector('.bg-emerald-600, .bg-rose-600, [role="alert"]')?.innerText;
        return { roleButtons, inputs, submitBtn: submitBtn ? submitBtn.innerText : null, toast };
      })()`,
      returnByValue: true
    }
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
};
