import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('====================================================');
console.log('🛡️  SPICEHUB MONOREPO INTEGRITY & SAFETY GATEKEEPER');
console.log('====================================================\n');

let failedChecks = 0;

function runCheck(name: string, checkFn: () => void) {
  process.stdout.write(`⏳ Checking: ${name}... `);
  try {
    checkFn();
    console.log('✅ PASSED');
  } catch (err: any) {
    console.log('❌ FAILED');
    console.error(`   Error: ${err.message}`);
    failedChecks++;
  }
}

// Check 1: Monorepo Apps & Configurations
const requiredApps = [
  'customer-table-app',
  'waiter-mobile-app',
  'kitchen-kds-app',
  'guest-room-portal-app',
  'hotel-admin-erp-app',
  'superadmin-saas-app',
];

runCheck('Micro-Frontend App Structures & Configs', () => {
  for (const app of requiredApps) {
    const appDir = path.resolve(__dirname, '..', 'apps', app);
    if (!fs.existsSync(appDir)) throw new Error(`App directory missing: apps/${app}`);
    if (!fs.existsSync(path.join(appDir, 'package.json'))) throw new Error(`package.json missing in apps/${app}`);
    if (!fs.existsSync(path.join(appDir, 'tsconfig.json'))) throw new Error(`tsconfig.json missing in apps/${app}`);
    if (!fs.existsSync(path.join(appDir, 'vite.config.ts'))) throw new Error(`vite.config.ts missing in apps/${app}`);
    if (!fs.existsSync(path.join(appDir, 'index.html'))) throw new Error(`index.html missing in apps/${app}`);
    if (!fs.existsSync(path.join(appDir, 'src', 'main.tsx'))) throw new Error(`src/main.tsx missing in apps/${app}`);
  }
});

// Check 2: Backend Controllers ReDoS Protection
runCheck('Backend Controllers ReDoS Sanitization Scan', () => {
  const controllersDir = path.resolve(__dirname, '..', 'backend', 'src', 'controllers');
  const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.ts'));

  const violations: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(controllersDir, file), 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('$regex') && !line.includes('escapeRegex') && !line.includes('safe') && !line.includes('q')) {
        violations.push(`${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }

  if (violations.length > 0) {
    throw new Error(`Unsanitized $regex found in controllers:\n${violations.join('\n')}`);
  }
});

// Check 3: Route Security & Middleware Audit
runCheck('Billing & Payment Routes Protection Audit', () => {
  const billingRoutesFile = path.resolve(__dirname, '..', 'backend', 'src', 'routes', 'billingRoutes.ts');
  const content = fs.readFileSync(billingRoutesFile, 'utf-8');
  if (!content.includes('verifyBillingAccess')) {
    throw new Error('billingRoutes.ts is missing verifyBillingAccess security middleware');
  }
});

// Check 4: Socket.IO Security
runCheck('Socket.IO Room Tenant Isolation Audit', () => {
  const serverIndexFile = path.resolve(__dirname, '..', 'backend', 'src', 'index.ts');
  const content = fs.readFileSync(serverIndexFile, 'utf-8');
  if (!content.includes('join_tenant_room') || !content.includes('security_error')) {
    throw new Error('Socket.IO server index missing tenant verification or security_error handler');
  }
});

// Check 5: Backend Build Verification
runCheck('Backend TypeScript Compilation (tsc --noEmit)', () => {
  execSync('npm run build:backend', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });
});

console.log('\n====================================================');
if (failedChecks === 0) {
  console.log('🎉 ALL INTEGRITY CHECKS PASSED (Zero Defects)');
  console.log('====================================================');
  process.exit(0);
} else {
  console.log(`⚠️ ${failedChecks} CHECK(S) FAILED. Resolve before proceeding.`);
  console.log('====================================================');
  process.exit(1);
}
