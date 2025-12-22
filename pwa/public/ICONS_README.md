# PWA Icons

## Current Status

This directory contains a placeholder SVG icon for development purposes.

## Required Icons for Production

PWA requires the following icon sizes:
- `icon-192.png` (192x192) - Minimum required
- `icon-512.png` (512x512) - Minimum required

## Generating Icons

Use the provided `icon.svg` as a base and generate PNGs:

### Option 1: Using ImageMagick
```bash
# Install ImageMagick first
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
```

### Option 2: Using Online Tool
1. Visit https://realfavicongenerator.net/
2. Upload `icon.svg`
3. Generate all required sizes
4. Download and place in this directory

### Option 3: Using NPM Package
```bash
npm install -g pwa-asset-generator
pwa-asset-generator icon.svg . --icon-only
```

## Icon Design Guidelines

The current placeholder icon represents:
- **Document** (white page) - Word document input
- **Graph nodes** (colored circles) - Knowledge graph output
- **Connections** (white lines) - Relationships in the graph

For production, consider:
- Using organization branding colors
- Ensuring icon is recognizable at 16x16 (favicon size)
- Testing on both light and dark backgrounds
- Following PWA maskable icon guidelines

## Maskable Icons

Modern PWAs support "maskable" icons that adapt to different device shapes.
See: https://web.dev/maskable-icon/

Test your icons at: https://maskable.app/

## Notes

- Icons are referenced in `manifest.json` and `vite.config.ts`
- SVG is provided for easy editing
- Once proper PNG icons are generated, commit them to git
- Current development uses SVG as fallback
