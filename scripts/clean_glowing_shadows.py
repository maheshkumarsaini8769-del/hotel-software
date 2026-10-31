import os
import re

TARGET_DIRS = [
    'apps/superadmin-saas-app/src',
    'apps/hotel-admin-erp-app/src',
    'apps/cashier-pos-app/src',
    'apps/reception-frontdesk-app/src',
    'apps/waiter-mobile-app/src',
    'apps/kitchen-kds-app/src',
    'apps/guest-room-portal-app/src',
    'apps/customer-table-app/src',
    'apps/spicehub-customer-android/src',
    'apps/spicehub-staff-android/src',
    'packages/ui/src',
]

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
count = 0

for d in TARGET_DIRS:
    full_dir = os.path.join(root, d)
    if not os.path.exists(full_dir):
        continue
    for dirpath, _, filenames in os.walk(full_dir):
        for fname in filenames:
            if fname.endswith(('.tsx', '.ts', '.jsx', '.js', '.html', '.css')):
                fpath = os.path.join(dirpath, fname)
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                orig = content
                # Replace custom glowing shadow boxes
                content = re.sub(r'shadow-\[0_0_[^\]]+\]', 'shadow-sm dark:shadow-none', content)
                content = re.sub(r'shadow-\[0_10px_[^\]]+\]', 'shadow-sm dark:shadow-none', content)
                content = re.sub(r'shadow-\[0_20px_[^\]]+\]', 'shadow-sm dark:shadow-none', content)
                if content != orig:
                    with open(fpath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    count += 1

print(f"Cleaned custom glowing shadows in {count} files.")
