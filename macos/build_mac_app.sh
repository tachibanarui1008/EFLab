#!/usr/bin/env bash
set -e

# 确保在项目根目录下执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

APP_NAME="EFLab"
BUNDLE_DIR="${PROJECT_ROOT}/dist-mac/${APP_NAME}.app"
MACOS_DIR="${BUNDLE_DIR}/Contents/MacOS"
RESOURCES_DIR="${BUNDLE_DIR}/Contents/Resources"
APP_PAYLOAD_DIR="${RESOURCES_DIR}/app"

echo "=== 开始构建 macOS 原生应用: ${BUNDLE_DIR} ==="

# 清理旧构建
rm -rf "${PROJECT_ROOT}/dist-mac"
mkdir -p "${MACOS_DIR}"
mkdir -p "${APP_PAYLOAD_DIR}"

# 1. 编译原生 Swift 宿主程序
echo "-> 正在编译原生 Swift 宿主..."
swiftc \
  -framework Cocoa \
  -framework WebKit \
  -O \
  "${PROJECT_ROOT}/macos/main.swift" \
  -o "${MACOS_DIR}/${APP_NAME}"

# 2. 生成 Info.plist
echo "-> 正在生成 Info.plist..."
cat << 'EOF' > "${BUNDLE_DIR}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>EFLab</string>
    <key>CFBundleIdentifier</key>
    <string>com.eflab.simulator</string>
    <key>CFBundleName</key>
    <string>EFLab</string>
    <key>CFBundleDisplayName</key>
    <string>EFLab 宏观经济模拟器</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# 3. 复制前端离线资源
echo "-> 正在复制前端应用资源至 App Bundle..."
cp -R "${PROJECT_ROOT}/index.html" "${APP_PAYLOAD_DIR}/"
cp -R "${PROJECT_ROOT}/src" "${APP_PAYLOAD_DIR}/"

echo "=== 构建完成！==="
echo "macOS 桌面应用程序已生成于: ${BUNDLE_DIR}"
echo "可以在 Finder 中直接双击运行 EFLab.app！"
