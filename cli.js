#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import plist from 'plist';

// TODO: User needs to make sure the icon name matches with the legacy .icns name if they have one.

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const INFO_PLIST_DEFAULT = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`;

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

function showHelp() {
  console.log(`
${COLORS.bold}${COLORS.cyan}tauri-liquid-icon${COLORS.reset} - Integrate Icon Composer (.icon) assets into Tauri macOS apps

${COLORS.bold}Usage:${COLORS.reset}
  tauri-liquid-icon --icon <path> --name <name> [options]

${COLORS.bold}Required Arguments:${COLORS.reset}
  --icon, -i <path>      Path to the .icon file (Icon Composer asset)
  --output, -o <path>    Output directory of Assets.car (e.g., ./src-tauri/resources)

${COLORS.bold}Optional Arguments:${COLORS.reset}
  --name, -n <name>      Icon name (default: 'AppIcon')
  --tauri-dir <path>     Tauri directory (default: ./src-tauri)
  --min-target <version> Minimum deployment target (default: 14.0)
  --help, -h             Show this help message

${COLORS.bold}Examples:${COLORS.reset}
  # Basic usage
  tauri-liquid-icon --icon ./Icon.icon --output ./src-tauri/resources

  # Custom icon asset name
  tauri-liquid-icon -i ./assets/Icon.icon -n Icon -o ./src-tauri/icons

  # Specify Tauri directory
  tauri-liquid-icon -i ./Icon.icon -o ./src-tauri/resources --tauri-dir ./src-tauri

${COLORS.bold}What this tool does:${COLORS.reset}
  1. Compiles .icon file using actool to generate Assets.car
  2. Updates Info.plist with a CFBundleIconName entry
  3. Updates tauri.conf.json to bundle the Assets.car file
  `);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    icon: null,
    output: null,
    name: "AppIcon",
    tauriDir: "./src-tauri",
    minTarget: "10.13",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--icon':
      case '-i':
        parsed.icon = next;
        i++;
        break;
      case '--name':
      case '-n':
        parsed.name = next;
        i++;
        break;
      case '--output':
      case '-o':
        parsed.output = next;
        i++;
        break;
      case '--tauri-dir':
        parsed.tauriDir = next;
        i++;
        break;
      case '--min-target':
        parsed.minTarget = next;
        i++;
        break;
      default:
        if (arg.startsWith('-')) {
          error(`Unknown argument: ${arg}`);
          log('\nUse --help for usage information');
          process.exit(1);
        }
    }
  }

  return parsed;
}

function validateArgs(args) {
  const errors = [];

  if (!args.icon) {
    errors.push('--icon is required');
  } else if (!existsSync(args.icon)) {
    errors.push(`Icon file not found: ${args.icon}`);
  } else if (!args.icon.endsWith('.icon')) {
    errors.push('Icon file must have .icon extension');
  }

  if (!args.output) {
    errors.push('--output is required');
  }

  if (errors.length > 0) {
    errors.forEach(err => error(err));
    log('\nUse --help for usage information');
    process.exit(1);
  }
}

function compileIcon(iconPath, outputPath, iconName, minTarget) {
  info(`Compiling ${basename(iconPath)} using actool...`);

  // Ensure output directory exists
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
    success(`Created output directory: ${outputPath}`);
  }

  const plistPath = join(outputPath, 'assetcatalog_generated_info.plist');
  const absoluteIconPath = resolve(iconPath);
  const absoluteOutputPath = resolve(outputPath);

  const command = `actool "${absoluteIconPath}" --compile "${absoluteOutputPath}" \
  --output-format human-readable-text --notices --warnings --errors \
  --output-partial-info-plist "${plistPath}" \
  --app-icon "${iconName}" --include-all-app-icons \
  --enable-on-demand-resources NO \
  --target-device mac \
  --minimum-deployment-target ${minTarget} \
  --platform macosx`;

  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (output) {
      log(output);
    }
    success(`Icon compiled successfully to ${outputPath}/Assets.car`);
    return true;
  } catch (err) {
    error('Failed to compile icon with actool');
    console.error(err.message);
    return false;
  }
}

function updateInfoPlist(tauriDir, iconName) {
  const infoPlistPath = join(tauriDir, 'Info.plist');

  try {
    info('Updating Info.plist...');

    let plistContent;
    let plistData;

    // Check if file exists and is not empty
    if (!existsSync(infoPlistPath)) {
      warn(`Info.plist not found at ${infoPlistPath}, creating new one`);
      plistContent = INFO_PLIST_DEFAULT;
    } else {
      plistContent = readFileSync(infoPlistPath, 'utf8').trim();
      if (!plistContent) {
        warn('Info.plist is empty, using default template');
        plistContent = INFO_PLIST_DEFAULT;
      }
    }

    // Try to parse, fall back to default if parsing fails
    try {
      plistData = plist.parse(plistContent);
    } catch (parseErr) {
      warn('Failed to parse existing Info.plist, using default template');
      plistData = plist.parse(INFO_PLIST_DEFAULT);
    }

    // Update with icon information
    plistData.CFBundleIconName = iconName;

    // Ensure directory exists
    const dir = dirname(infoPlistPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const updatedPlist = plist.build(plistData);
    writeFileSync(infoPlistPath, updatedPlist, 'utf8');
    success(`Info.plist updated`);
  } catch (err) {
    error('Failed to update Info.plist');
    console.error(err.message);
  }
}

function updateTauriConfig(tauriDir, outputPath) {
  // Try to find tauri config file
  const possibleConfigs = [
    join(tauriDir, 'tauri.conf.json'),
    join(tauriDir, 'tauri.conf.json5'),
    join(tauriDir, '..', 'tauri.conf.json'),
    join(tauriDir, '..', 'tauri.conf.json5')
  ];

  let configPath = null;
  for (const path of possibleConfigs) {
    if (existsSync(path)) {
      configPath = path;
      break;
    }
  }

  if (!configPath) {
    warn('tauri.conf.json not found');
    info('Skipping Tauri configuration modification');
    info('You may need to manually add Assets.car to bundle resources');
    return;
  }

  try {
    info(`Updating ${basename(configPath)}...`);
    const configContent = readFileSync(configPath, 'utf8');

    // Remove comments for JSON parsing (basic implementation)
    let jsonContent = configContent;
    if (configPath.endsWith('.json5')) {
      // Simple comment removal - this is basic and might not handle all edge cases
      jsonContent = configContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
    }

    const config = JSON.parse(jsonContent);

    // Ensure the bundle.macOS structure exists
    if (!config.bundle) {
      config.bundle = {};
    }
    if (!config.bundle.macOS) {
      config.bundle.macOS = {};
    }
    if (!config.bundle.macOS.files) {
      config.bundle.macOS.files = {};
    }

    // Calculate relative path from src-tauri directory to assets
    const absoluteTauriDir = resolve(tauriDir);
    const absoluteOutputPath = resolve(outputPath);

    // Get path relative to src-tauri
    let relativeOutputPath;
    if (absoluteOutputPath.startsWith(absoluteTauriDir)) {
      relativeOutputPath = absoluteOutputPath.substring(absoluteTauriDir.length + 1);
    } else {
      // Fallback to just the basename if outside tauri dir
      relativeOutputPath = basename(outputPath);
    }

    const sourcePath = join(relativeOutputPath, 'Assets.car').replace(/\\/g, '/');

    // Check if Assets.car is already configured
    const alreadyExists = config.bundle.macOS.files['Resources/Assets.car'];

    if (!alreadyExists) {
      config.bundle.macOS.files['Resources/Assets.car'] = sourcePath;

      // Write back with formatting
      const updatedConfig = JSON.stringify(config, null, 2);
      writeFileSync(configPath, updatedConfig + '\n', 'utf8');
      success(`${basename(configPath)} updated with Assets.car in macOS bundle`);
    } else {
      info('Assets.car already exists in macOS bundle files');
    }
  } catch (err) {
    error(`Failed to update ${basename(configPath)}`);
    console.error(err.message);
    warn('You may need to manually add Assets.car to bundle.macOS.files in your tauri config');
  }
}

function main() {
  log(`\n${COLORS.bold}${COLORS.cyan}🎨 Tauri Liquid Icon Setup${COLORS.reset}\n`);

  if (process.platform !== 'darwin') {
    error('This tool requires Xcode to function and can only be run on macOS');
    process.exit(1);
  }

  const args = parseArgs();
  validateArgs(args);

  // Compile the icon
  const compiled = compileIcon(args.icon, args.output, args.name, args.minTarget);
  if (!compiled) {
    process.exit(1);
  }

  // Update Info.plist
  updateInfoPlist(args.tauriDir, args.name);

  // Update tauri.conf.json
  updateTauriConfig(args.tauriDir, args.output);

  log('');
  success('Icon setup complete!');
  info('\nNext steps:');
  info('  1. Build your Tauri app');
  info('  2. Verify the icon appears in your macOS application');
  log('');
}

main();
