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

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def hex_to_semantic(match):
    hex_code = match.group(1).lower()
    try:
        r, g, b = hex_to_rgb(hex_code)
    except Exception:
        return 'bg-slate-900'

    # Perceived brightness (ITU-R BT.709)
    brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b

    # Semantic mappings
    if brightness > 230:
        return 'bg-white'
    elif brightness > 200:
        return 'bg-slate-50'
    elif brightness < 20:
        return 'bg-slate-950'
    elif brightness < 45:
        return 'bg-slate-900'
    elif brightness < 80:
        return 'bg-slate-800'
    else:
        # Mid-tones
        if r > g + 50 and r > b + 50:
            return 'bg-red-600'
        elif g > r + 30 and g > b + 30:
            return 'bg-emerald-600'
        elif b > r + 30 and b > g + 30:
            return 'bg-blue-600'
        elif r > 180 and g > 120 and b < 50:
            return 'bg-amber-600'
        return 'bg-slate-700'

def process_file(fpath):
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    orig = content
    # Replace bg-[#...] with semantic token
    content = re.sub(r'bg-\[(#[a-fA-F0-9]{3,8})\]', hex_to_semantic, content)

    if content != orig:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
modified = 0
for d in TARGET_DIRS:
    full_dir = os.path.join(root, d)
    if not os.path.exists(full_dir):
        continue
    for dirpath, _, filenames in os.walk(full_dir):
        for fname in filenames:
            if fname.endswith(('.tsx', '.ts', '.jsx', '.js', '.html', '.css')):
                fpath = os.path.join(dirpath, fname)
                if process_file(fpath):
                    modified += 1

print(f"Processed and replaced hex bg in {modified} files.")
