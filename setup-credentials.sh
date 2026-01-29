#!/bin/bash

echo "============================================="
echo "🌸 꽃틔움 가든 - 환경 변수 설정"
echo "============================================="
echo ""

if [ -f .env.local ]; then
    echo "⚠️  .env.local 파일이 이미 존재합니다."
    read -p "덮어쓰시겠습니까? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "❌ 취소되었습니다."
        exit 0
    fi
fi

echo "📝 환경 변수를 입력해주세요."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Supabase 정보"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Supabase URL: " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_KEY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  네이버 블로그 정보"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "블로그 ID (기본: kkotjye): " BLOG_ID
BLOG_ID=${BLOG_ID:-kkotjye}
read -p "네이버 이메일: " NAVER_EMAIL
read -s -p "네이버 비밀번호: " NAVER_PASSWORD
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Discord 웹훅 (선택사항)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Discord Webhook URL (Enter로 건너뛰기): " DISCORD_WEBHOOK

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Perplexity API (선택사항)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Perplexity API Key (Enter로 건너뛰기): " PERPLEXITY_KEY

echo ""
echo "📝 .env.local 파일 생성 중..."

cat > .env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Naver Blog
NAVER_BLOG_ID=$BLOG_ID
NAVER_BLOG_EMAIL=$NAVER_EMAIL
NAVER_BLOG_PASSWORD=$NAVER_PASSWORD

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK

# Perplexity API (optional)
PERPLEXITY_API_KEY=$PERPLEXITY_KEY
EOF

echo ""
echo "✅ .env.local 파일이 생성되었습니다!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 보안 설정"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! grep -q ".env.local" .gitignore 2>/dev/null; then
    echo ".env.local" >> .gitignore
    echo "✅ .gitignore에 .env.local 추가됨"
else
    echo "✅ .gitignore에 이미 .env.local이 있습니다"
fi

echo ""
echo "============================================="
echo "✅ 환경 설정 완료!"
echo "============================================="
echo ""
