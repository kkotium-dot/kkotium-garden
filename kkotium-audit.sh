#!/bin/bash

set -u

ROOT="$(pwd)"
OUT="$ROOT/kkotium-audit-report.txt"

echo "KKOTIUM GARDEN CODE AUDIT"
echo "Generated: $(date)"
echo "Project: $ROOT"
echo "========================================"
echo

section() {
  echo
  echo "========================================"
  echo "[$1]"
  echo "========================================"
}

run() {
  echo
  echo "\$ $1"
  eval "$1" 2>/dev/null || true
}

# --------------------------------------------------
# 1. Project basics
# --------------------------------------------------

section "PROJECT BASICS"

run "printf 'Node: '; node -v"
run "printf 'npm: '; npm -v"
run "printf 'Next: '; node -e \"try{console.log(require('./node_modules/next/package.json').version)}catch(e){console.log('not installed')}\""
run "printf 'React: '; node -e \"try{console.log(require('./node_modules/react/package.json').version)}catch(e){console.log('not installed')}\""
run "printf 'Prisma: '; node -e \"try{console.log(require('./node_modules/prisma/package.json').version)}catch(e){console.log('not installed')}\""

section "PACKAGE.JSON"

if [ -f package.json ]; then
  cat package.json
else
  echo "package.json not found"
fi

# --------------------------------------------------
# 2. Source tree
# --------------------------------------------------

section "SRC FILE TREE"

find src -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  | sort

# --------------------------------------------------
# 3. App routes
# --------------------------------------------------

section "APP ROUTES"

find src/app -type f \
  \( -name "route.ts" -o -name "route.js" -o -name "page.tsx" -o -name "page.ts" \) \
  -not -path "*/node_modules/*" \
  | sort

# --------------------------------------------------
# 4. API route inventory
# --------------------------------------------------

section "API ROUTES"

find src/app/api -type f \
  \( -name "route.ts" -o -name "route.js" \) \
  -not -path "*/node_modules/*" \
  | sort

# --------------------------------------------------
# 5. Authentication / authorization
# --------------------------------------------------

section "AUTHENTICATION SEARCH"

grep -RniE \
  "getServerSession|getSession|next-auth|auth\(|middleware|authorization|Bearer|session|currentUser|requireUser|isAuthenticated|userId" \
  src \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null || true

section "MIDDLEWARE FILES"

find . -type f \
  \( -name "middleware.ts" -o -name "middleware.js" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.claude/worktrees/*" \
  | sort

# --------------------------------------------------
# 6. Product system
# --------------------------------------------------

section "PRODUCT RELATED FILES"

find src -type f \
  | grep -Ei \
  "product|products|sku|catalog|inventory|stock" \
  | grep -vE \
  "node_modules|\.next|\.test\.|\.spec\." \
  | sort

# --------------------------------------------------
# 7. Asset / media system
# --------------------------------------------------

section "ASSET MEDIA FILES"

find src -type f \
  | grep -Ei \
  "asset|image|media|storage|upload|studio" \
  | grep -vE \
  "node_modules|\.next" \
  | sort

# --------------------------------------------------
# 8. Existing asset API details
# --------------------------------------------------

section "ASSET API ROUTES"

find src/app/api/products -path "*assets*" -type f | sort

# --------------------------------------------------
# 9. Storage related files
# --------------------------------------------------

section "STORAGE FILES"

find src -type f \
  | grep -Ei \
  "storage|supabase|cloudinary|upload" \
  | grep -vE \
  "node_modules|\.next" \
  | sort

# --------------------------------------------------
# 10. Studio UI
# --------------------------------------------------

section "STUDIO COMPONENTS"

find src/components -type f \
  | grep -Ei \
  "studio|asset|workbench|assembly|detail" \
  | grep -vE \
  "node_modules|\.next" \
  | sort

# --------------------------------------------------
# 11. Prisma schema
# --------------------------------------------------

section "PRISMA SCHEMA"

if [ -f prisma/schema.prisma ]; then
  cat prisma/schema.prisma
else
  echo "prisma/schema.prisma not found"
fi

# --------------------------------------------------
# 12. Prisma migrations inventory
# --------------------------------------------------

section "PRISMA MIGRATIONS"

find prisma/migrations -maxdepth 2 -type f \
  -name "migration.sql" \
  2>/dev/null \
  | sort

# --------------------------------------------------
# 13. AssetRegistry references
# --------------------------------------------------

section "ASSET REGISTRY REFERENCES"

grep -RniE \
  "AssetRegistry|assetRegistry|asset_registry" \
  src prisma \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.prisma" \
  --include="*.sql" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null || true

# --------------------------------------------------
# 14. Product image fields
# --------------------------------------------------

section "PRODUCT IMAGE FIELD REFERENCES"

grep -RniE \
  "mainImage|additionalImages|detail_images|detail_image_url|extra_images|imageCount|source_detail_url" \
  src prisma \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.prisma" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null || true

# --------------------------------------------------
# 15. Asset stages / taxonomy
# --------------------------------------------------

section "ASSET STAGE / TAXONOMY REFERENCES"

grep -RniE \
  "source|cutout|plate|reference|composite|thumbnail|detail|archive|stage|angle|mood|slot|context|variant" \
  src/lib/storage \
  src/components/studio \
  src/app/api/products \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null || true

# --------------------------------------------------
# 16. Existing tests
# --------------------------------------------------

section "TEST FILES"

find . -type f \
  \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.claude/worktrees/*" \
  | sort

# --------------------------------------------------
# 17. Next config
# --------------------------------------------------

section "NEXT CONFIG"

if [ -f next.config.js ]; then
  cat next.config.js
elif [ -f next.config.mjs ]; then
  cat next.config.mjs
elif [ -f next.config.ts ]; then
  cat next.config.ts
else
  echo "Next config not found"
fi

# --------------------------------------------------
# 18. Environment VARIABLE NAMES ONLY
# NEVER PRINT VALUES
# --------------------------------------------------

section "ENVIRONMENT VARIABLE NAMES ONLY"

for f in .env .env.local .env.production .env.development; do
  if [ -f "$f" ]; then
    echo "--- $f ---"
    grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$f" \
      | sed 's/=.*$/=<REDACTED>/'
  fi
done

# --------------------------------------------------
# 19. Git status (no file contents)
# --------------------------------------------------

section "GIT STATUS"

git status --short 2>/dev/null || true

# --------------------------------------------------
# 20. Summary statistics
# --------------------------------------------------

section "SUMMARY"

echo "Source files:"
find src -type f 2>/dev/null | wc -l

echo "API route files:"
find src/app/api -type f \
  \( -name "route.ts" -o -name "route.js" \) \
  2>/dev/null | wc -l

echo "Prisma migrations:"
find prisma/migrations -maxdepth 2 -type f \
  -name "migration.sql" \
  2>/dev/null | wc -l

echo "Test files:"
find . -type f \
  \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.claude/worktrees/*" \
  2>/dev/null | wc -l

echo
echo "AUDIT COMPLETE"
