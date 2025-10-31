#!/usr/bin/env bash
# Integration test for fare lookup workflow

set -e

echo "🧪 Testing Fare Lookup Workflow"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check fare cache status
echo "📋 Test 1: Check fare cache status"
bun run fare:status
echo ""

# Test 2: Exact station name match
echo "📋 Test 2: Exact station name lookup"
echo "${YELLOW}Command:${NC} bun run fare:lookup -- --origin \"台北車站\" --destination \"市政府\""
result=$(bun run fare:lookup -- --origin "台北車站" --destination "市政府" 2>&1)
if echo "$result" | grep -q "✓ Fare found"; then
    echo "${GREEN}✅ PASS${NC} - Exact match working"
    echo "$result" | grep -A 5 "✓ Fare found"
else
    echo "${RED}❌ FAIL${NC} - Exact match failed"
    echo "$result"
    exit 1
fi
echo ""

# Test 3: Fuzzy matching
echo "📋 Test 3: Fuzzy matching with suggestions"
echo "${YELLOW}Command:${NC} bun run fare:lookup -- --origin \"台北\" --destination \"市府\""
result=$(bun run fare:lookup -- --origin "台北" --destination "市府" 2>&1 || true)
if echo "$result" | grep -q "Did you mean"; then
    echo "${GREEN}✅ PASS${NC} - Fuzzy matching working"
    echo "$result" | grep -A 10 "Did you mean"
else
    echo "${RED}❌ FAIL${NC} - Fuzzy matching failed"
    echo "$result"
    exit 1
fi
echo ""

# Test 4: Discounted fare
echo "📋 Test 4: Discounted fare lookup"
echo "${YELLOW}Command:${NC} bun run fare:lookup -- --origin \"台北車站\" --destination \"淡水\" --fareType discounted"
result=$(bun run fare:lookup -- --origin "台北車站" --destination "淡水" --fareType discounted 2>&1)
if echo "$result" | grep -q "Type: discounted"; then
    echo "${GREEN}✅ PASS${NC} - Discounted fare working"
    echo "$result" | grep -A 5 "✓ Fare found"
else
    echo "${RED}❌ FAIL${NC} - Discounted fare failed"
    echo "$result"
    exit 1
fi
echo ""

# Test 5: Integration with calculate
echo "📋 Test 5: Integration with TPASS calculator"
echo "${YELLOW}Step 1:${NC} Get fare for 亞東醫院 → 科技大樓"
fare_result=$(bun run fare:lookup -- --origin "亞東醫院" --destination "科技大樓" 2>&1)
echo "$fare_result" | grep "Fare:"

# Extract fare amount (simplified - assumes format "Fare: NT$XX")
fare=$(echo "$fare_result" | grep "Fare:" | sed 's/.*NT\$\([0-9]*\).*/\1/')
echo "Extracted fare: NT\$$fare"

echo ""
echo "${YELLOW}Step 2:${NC} Calculate TPASS comparison with fare NT\$$fare"
calc_result=$(bun run calculate --fare "$fare" --trips 2 2>&1)
if echo "$calc_result" | grep -q "TPASS"; then
    echo "${GREEN}✅ PASS${NC} - Integration working"
    echo "$calc_result" | head -20
else
    echo "${RED}❌ FAIL${NC} - Integration failed"
    echo "$calc_result"
    exit 1
fi
echo ""

echo "================================"
echo "${GREEN}✅ All tests passed!${NC}"
echo "================================"
