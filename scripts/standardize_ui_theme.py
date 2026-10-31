#!/usr/bin/env python3
import os
import re
import sys

# Targets: all .tsx, .ts, .jsx, .js, .html, .css in apps/*/src and packages/ui/src
TARGET_DIRS = [
    'apps/superadmin-saas-app/src',
    'apps/hotel-admin-erp-app/src',
    'apps/cashier-pos-app/src',
    'apps/reception-frontdesk-app/src',
    'apps/waiter-mobile-app/src',
    'apps/kitchen-kds-app/src',
    'apps/guest-room-portal-app/src',
    'apps/customer-table-app/src',
    'packages/ui/src',
]

# Hex background replacements
HEX_CANVAS_DARK = [
    '#080b11', '#0d0f14', '#0f1118', '#080a0f', '#07090e',
    '#06080d', '#0b0e14', '#090b10', '#07090f', '#0a0c12',
    '#0f1015', '#080a10', '#05070a'
]

HEX_CANVAS_LIGHT = [
    '#f1f5f9', '#f4f5f8', '#f6f8fb', '#f4f6fa', '#f8fafc'
]

HEX_SURFACE_DARK = [
    '#0f131d', '#12141c', '#141620', '#10131d', '#0e121b',
    '#0c0e15', '#0f131a', '#14151b', '#141722', '#151926',
    '#181b26', '#181c2b', '#10141e', '#121620', '#121721',
    '#0e121a', '#0e111a', '#0e1322', '#0f1420', '#0b0f17'
]

HEX_SURFACE_ELEVATED = [
    '#1b1e2b', '#1c1f2e', '#121622', '#1a1f30', '#181b28', '#202434'
]

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    original = content

    # 1. Canvas Hex backgrounds
    for h in HEX_CANVAS_DARK:
        content = content.replace(f'bg-[{h}]', 'bg-slate-950')
    for h in HEX_CANVAS_LIGHT:
        content = content.replace(f'bg-[{h}]', 'bg-slate-50')

    # 2. Surface Hex backgrounds
    for h in HEX_SURFACE_DARK:
        content = content.replace(f'bg-[{h}]', 'bg-slate-900')
    for h in HEX_SURFACE_ELEVATED:
        content = content.replace(f'bg-[{h}]', 'bg-slate-800')

    # Specific common hex buttons
    content = content.replace('bg-[#8b5cf6]', 'bg-slate-900 dark:bg-white text-white dark:text-slate-900')
    content = content.replace('bg-[#7f1d1d]', 'bg-red-700')
    content = content.replace('bg-[#881337]', 'bg-red-700')
    content = content.replace('bg-[#10b981]', 'bg-emerald-600')
    content = content.replace('bg-[#3b82f6]', 'bg-blue-600')

    # 3. Replace rose- with red- for standardized enterprise danger/alert
    content = re.sub(r'\bbg-rose-([0-9]+)', r'bg-red-\1', content)
    content = re.sub(r'\btext-rose-([0-9]+)', r'text-red-\1', content)
    content = re.sub(r'\bborder-rose-([0-9]+)', r'border-red-\1', content)
    content = re.sub(r'\bring-rose-([0-9]+)', r'ring-red-\1', content)
    content = re.sub(r'\bshadow-rose-([0-9]+)(/[0-9]+)?', r'shadow-sm', content)

    # 4. Standardize Primary Buttons (indigo/purple/cyan/pink CTA buttons)
    # E.g. bg-indigo-600 hover:bg-indigo-500 text-white
    content = re.sub(
        r'bg-indigo-600 hover:bg-indigo-500 text-white',
        'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        content
    )
    content = re.sub(
        r'bg-indigo-600 hover:bg-indigo-700 text-white',
        'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        content
    )
    content = re.sub(
        r'bg-purple-600 hover:bg-purple-500 text-white',
        'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        content
    )
    content = re.sub(
        r'bg-cyan-600 hover:bg-cyan-500 text-white',
        'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        content
    )
    content = re.sub(
        r'bg-pink-600 hover:bg-pink-500 text-white',
        'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        content
    )
    content = re.sub(
        r'bg-teal-600 hover:bg-teal-500 text-white',
        'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
        content
    )

    # 5. Tinted backgrounds: purple/indigo/pink/teal/cyan/violet/fuchsia -> slate
    content = re.sub(r'\bbg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-([0-9]+)/([0-9]+)', r'bg-slate-100 dark:bg-slate-800', content)
    content = re.sub(r'\bbg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-950(/\d+)?', r'bg-slate-900', content)
    content = re.sub(r'\bbg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-900(/\d+)?', r'bg-slate-800', content)

    # 6. Tinted borders
    content = re.sub(r'\bborder-(indigo|purple|cyan|teal|pink|violet|fuchsia)-([0-9]+)(/[0-9]+)?', r'border-slate-200 dark:border-slate-800', content)

    # 7. Tinted text
    content = re.sub(r'\btext-(indigo|purple|cyan|teal|pink|violet|fuchsia)-([0-9]+)', r'text-slate-700 dark:text-slate-300', content)

    # 8. Remaining standalone bg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-[0-9]+
    content = re.sub(r'\bbg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-600', r'bg-slate-900 dark:bg-white text-white dark:text-slate-900', content)
    content = re.sub(r'\bbg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-500', r'bg-slate-800 dark:bg-slate-200', content)
    content = re.sub(r'\bbg-(indigo|purple|cyan|teal|pink|violet|fuchsia)-[0-9]+', r'bg-slate-800', content)

    # 9. Clean up crazy shadows
    content = re.sub(r'\bshadow-(indigo|purple|cyan|teal|pink|violet|fuchsia)-[0-9]+(/[0-9]+)?', r'shadow-sm', content)
    content = re.sub(r'\bshadow-2xl\b', r'shadow-sm dark:shadow-none', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    modified_count = 0
    total_files = 0

    for d in TARGET_DIRS:
        full_dir = os.path.join(root, d)
        if not os.path.exists(full_dir):
            continue
        for dirpath, _, filenames in os.walk(full_dir):
            for fname in filenames:
                if fname.endswith(('.tsx', '.ts', '.jsx', '.js', '.html', '.css')):
                    total_files += 1
                    fpath = os.path.join(dirpath, fname)
                    if clean_file(fpath):
                        modified_count += 1
                        print(f"Refactored: {os.path.relpath(fpath, root)}")

    print(f"\nDone! Modified {modified_count} out of {total_files} files.")

if __name__ == '__main__':
    main()
