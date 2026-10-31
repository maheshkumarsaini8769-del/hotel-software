const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:9223/devtools/page/BD75B04FF0E12FD10CDD9C240E3DF25A');

ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  setTimeout(() => {
    const expr = `
      (() => {
        // 1. Select CASH payment mode
        const cashBtn = document.querySelector('[data-testid="paymode-btn-CASH"]');
        if (!cashBtn) return { success: false, error: 'Cash button not found' };
        cashBtn.click();

        // 2. Set transaction reference to CASH-FRONTDESK-01
        const txnInput = document.querySelector('[data-testid="input-settle-txn-ref"]');
        if (txnInput) {
          txnInput.value = 'CASH-REC-' + Date.now().toString().slice(-4);
          txnInput.dispatchEvent(new Event('input', { bubbles: true }));
          txnInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 3. Click COMPLETE DEPARTURE & SETTLE
        const confirmBtn = document.querySelector('[data-testid="btn-confirm-settle-checkout"]');
        if (!confirmBtn) return { success: false, error: 'Confirm button not found' };
        confirmBtn.click();

        return {
          success: true,
          selectedMode: 'CASH',
          txnRef: txnInput ? txnInput.value : null,
          confirmBtnText: confirmBtn.innerText.trim()
        };
      })()
    `;
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: expr,
        contextId: 3,
        returnByValue: true
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.id === 2) {
    console.log('SETTLE EXECUTION:', JSON.stringify(msg.result, null, 2));
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
});
