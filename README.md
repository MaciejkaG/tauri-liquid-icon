# tauri-liquid-icon

A command-line utility to seamlessly integrate Icon Composer (.icon) assets into Tauri macOS applications. This tool automates the entire process of compiling liquid glass icons and configuring your Tauri project.

## Features

- Compiles `.icon` files using Apple's `actool` to generate `Assets.car`
- Automatically updates `Info.plist` with the correct icon reference
- Configures `tauri.conf.json` to bundle the generated assets
- Full automation - no manual configuration needed
- Supports custom output paths and icon names

## Requirements

- macOS (uses Apple's `actool`)
- Node.js 16 or higher
- Tauri project

## Installation

### Global Installation

```bash
npm install -g tauri-liquid-icon
```

### Local Installation (per project)

```bash
npm install --save-dev tauri-liquid-icon
```

Or use directly with `npx`:

```bash
npx tauri-liquid-icon --icon ./Icon.icon --name AppIcon
```

## Usage

### Basic Usage

```bash
tauri-liquid-icon --icon <path-to-icon> --name <icon-name>
```

Example:

```bash
tauri-liquid-icon --icon ./Icon.icon --name AppIcon
```

### Arguments

#### Required Arguments

- `--icon, -i <path>` - Path to your `.icon` file (Icon Composer asset)
- `--name, -n <name>` - Icon name to use (e.g., 'AppIcon', 'Icon')

#### Optional Arguments

- `--output, -o <path>` - Output directory for compiled assets (default: `./src-tauri/resources`)
- `--tauri-dir <path>` - Tauri directory path (default: `./src-tauri`)
- `--min-target <version>` - Minimum macOS deployment target (default: `14.0`)
- `--help, -h` - Show help message

### Examples

#### Standard Setup

```bash
tauri-liquid-icon --icon ./Icon.icon --name AppIcon
```

#### Custom Output Directory

```bash
tauri-liquid-icon -i ./assets/Icon.icon -n Icon -o ./src-tauri/icons
```

#### Specify Minimum macOS Version

```bash
tauri-liquid-icon -i ./Icon.icon -n AppIcon --min-target 13.0
```

#### Custom Tauri Directory Structure

```bash
tauri-liquid-icon -i ./Icon.icon -n AppIcon --tauri-dir ./tauri
```

### As an npm Script

Add to your `package.json`:

```json
{
  "scripts": {
    "setup-icon": "tauri-liquid-icon --icon ./Icon.icon --name AppIcon"
  }
}
```

Then run:

```bash
npm run setup-icon
```

## What This Tool Does

1. **Compiles your .icon file**: Uses Apple's `actool` to compile the Icon Composer asset into an `Assets.car` file
2. **Updates Info.plist**: Adds or updates the `CFBundleIconFile` entry in your `Info.plist`
3. **Updates Tauri config**: Adds the `Assets.car` to your `tauri.conf.json` bundle resources
4. **Provides feedback**: Shows clear success/error messages throughout the process

## Creating .icon Files

To create `.icon` files, use Apple's **Icon Composer** app available on macOS. Icon Composer allows you to create modern liquid glass icons with the new macOS visual style.

## Troubleshooting

### "actool: command not found"

This tool requires `actool`, which comes with Xcode Command Line Tools. Install it with:

```bash
xcode-select --install
```

### Icon not appearing in built app

1. Ensure you've run the tool before building
2. Verify `Assets.car` exists in your output directory
3. Check that your `tauri.conf.json` includes the Assets.car in `bundle.resources`
4. Rebuild your Tauri application

### Info.plist or tauri.conf.json not found

If your project structure is non-standard, use the `--tauri-dir` option to specify the correct path to your Tauri directory.

## Project Structure

After running this tool, your project should have:

```
your-tauri-project/
├── src-tauri/
│   ├── Info.plist (updated with CFBundleIconFile)
│   ├── tauri.conf.json (updated with Assets.car in resources)
│   └── resources/
│       ├── Assets.car (compiled from your .icon file)
│       └── assetcatalog_generated_info.plist
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
