#!/usr/bin/env bash
ICON_PATH="./src-tauri/resources/Icon.icon"
OUTPUT_PATH="./src-tauri/resources"
PLIST_PATH="$OUTPUT_PATH/assetcatalog_generated_info.plist"

actool $ICON_PATH --compile $OUTPUT_PATH \
  --output-format human-readable-text --notices --warnings --errors \
  --output-partial-info-plist $PLIST_PATH \
  --app-icon Icon --include-all-app-icons \
  --enable-on-demand-resources NO \
  --target-device mac \
  --minimum-deployment-target 26.0 \
  --platform macosx
