import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=================================================================")
print("🔍 SPICEHUB 360-DEGREE ABSOLUTE REPOSITORY AUDIT SCAN")
print("=================================================================")

base_dir = r"c:\Users\dell\Desktop\hotel  softwear"

# 1. Broken Relative Imports Scan
print("\n--- [1] SCANNING BROKEN IMPORTS ACROSS ALL TS/TSX FILES ---")
broken_imports = []
total_files = 0

for root, dirs, files in os.walk(base_dir):
    if any(ignore in root for ignore in ['node_modules', '.git', 'dist', '.gemini']):
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            total_files += 1
            fpath = os.path.join(root, f)
            with open(fpath, encoding='utf-8', errors='ignore') as fp:
                for line_no, line in enumerate(fp, 1):
                    match = re.search(r"from\s+['\"](\.[^'\"]+)['\"]", line)
                    if match:
                        rel = match.group(1)
                        target = os.path.normpath(os.path.join(os.path.dirname(fpath), rel))
                        candidates = [
                            target,
                            target + ".ts",
                            target + ".tsx",
                            target + ".d.ts",
                            os.path.join(target, "index.ts"),
                            os.path.join(target, "index.tsx")
                        ]
                        if not any(os.path.exists(c) for c in candidates):
                            broken_imports.append((fpath, line_no, rel))

print(f"Total TS/TSX files scanned: {total_files}")
print(f"Total broken imports found: {len(broken_imports)}")
for b in broken_imports[:20]:
    rel_file = os.path.relpath(b[0], base_dir)
    print(f"  ❌ {rel_file}:{b[1]} -> cannot resolve '{b[2]}'")

# 2. Check Test Files in backend/__tests__
print("\n--- [2] CHECKING ALL TEST SUITES IN BACKEND ---")
test_dir = os.path.join(base_dir, "backend", "src", "__tests__")
if os.path.exists(test_dir):
    test_files = sorted([f for f in os.listdir(test_dir) if f.endswith(".test.ts")])
    print(f"Total test files in backend: {len(test_files)}")
    tier1_tests = [f for f in test_files if "drill" not in f and "benchmark" not in f]
    tier2_tests = [f for f in test_files if "drill" in f or "benchmark" in f]
    print(f"  Tier 1 Standard Gates: {len(tier1_tests)}")
    print(f"  Tier 2 Concurrency Drills: {len(tier2_tests)}")
else:
    print("❌ __tests__ directory not found!")

# 3. Check Routes vs Controllers vs Index.ts
print("\n--- [3] CHECKING BACKEND ROUTES MOUNTING COMPLETENESS ---")
routes_dir = os.path.join(base_dir, "backend", "src", "routes")
index_file = os.path.join(base_dir, "backend", "src", "index.ts")
with open(index_file, encoding='utf-8') as f:
    index_text = f.read()

unmounted_routes = []
for r in os.listdir(routes_dir):
    if r.endswith(".ts"):
        r_name = r[:-3]
        if r_name not in index_text:
            unmounted_routes.append(r)

print(f"Total route files: {len(os.listdir(routes_dir))}")
print(f"Unmounted route files: {unmounted_routes}")

# 4. Check Environment Variables
print("\n--- [4] CHECKING ENVIRONMENT CONFIG (.env) ---")
env_file = os.path.join(base_dir, "backend", ".env")
if os.path.exists(env_file):
    print("✅ backend/.env exists")
    with open(env_file, encoding='utf-8') as f:
        keys = [line.split("=")[0].strip() for line in f if "=" in line and not line.startswith("#")]
        print(f"  Configured keys: {keys}")
else:
    print("⚠️ backend/.env does NOT exist!")

# 5. Check 6 Frontend Apps Configuration
print("\n--- [5] CHECKING 6 FRONTEND APPS RUNNABILITY ---")
apps = [
    "customer-table-app",
    "waiter-mobile-app",
    "kitchen-kds-app",
    "guest-room-portal-app",
    "hotel-admin-erp-app",
    "superadmin-saas-app"
]
apps_dir = os.path.join(base_dir, "apps")
for app in apps:
    app_path = os.path.join(apps_dir, app)
    has_pkg = os.path.exists(os.path.join(app_path, "package.json"))
    has_vite = os.path.exists(os.path.join(app_path, "vite.config.ts")) or os.path.exists(os.path.join(app_path, "vite.config.js"))
    has_html = os.path.exists(os.path.join(app_path, "index.html"))
    has_index = os.path.exists(os.path.join(app_path, "src", "index.ts"))
    print(f"  App: {app:25} | pkg.json: {'✅' if has_pkg else '❌'} | vite: {'✅' if has_vite else '❌'} | index.html: {'✅' if has_html else '❌'} | src/index.ts: {'✅' if has_index else '❌'}")

print("\n=================================================================")
print("🏁 AUDIT SCAN FINISHED")
print("=================================================================")
