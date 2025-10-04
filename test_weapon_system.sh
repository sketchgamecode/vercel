#!/bin/bash

echo "=== 武器系统测试 ==="

# 1. 注册玩家
echo "1. 注册玩家..."
curl.exe -s -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{"playerId":"weaponTestPlayer"}' | head -c 100
echo

# 2. 生成武器
echo "2. 生成武器..."
WEAPON_JSON=$(curl.exe -s -X POST http://localhost:3001/api/weapon/generate \
  -H "Content-Type: application/json" \
  -d '{"playerLevel":30}')
echo $WEAPON_JSON | head -c 150
echo

# 3. 提取武器数据并添加到背包
echo "3. 添加武器到背包..."
curl.exe -s -X POST http://localhost:3001/api/weapon/add \
  -H "Content-Type: application/json" \
  -d "{\"playerId\":\"weaponTestPlayer\",\"weapon\":{\"id\":\"weapon_test_full\",\"name\":\"完整测试剑\",\"quality\":\"精制\",\"finalStats\":{\"damage\":8,\"attributes\":{\"strength\":2,\"agility\":1}}}}"
echo

# 4. 查看背包
echo "4. 查看玩家背包..."
curl.exe -s -X POST http://localhost:3001/api/weapon/inventory \
  -H "Content-Type: application/json" \
  -d '{"playerId":"weaponTestPlayer"}'
echo

echo "=== 测试完成 ==="
