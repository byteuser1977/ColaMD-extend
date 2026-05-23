const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const svgPath = path.join(rootDir, 'resources', 'icon.svg');
const androidResPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const iosAssetsPath = path.join(rootDir, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

const androidIcons = [
  { name: 'mipmap-mdpi/ic_launcher.png', size: 48 },
  { name: 'mipmap-mdpi/ic_launcher_round.png', size: 48 },
  { name: 'mipmap-hdpi/ic_launcher.png', size: 72 },
  { name: 'mipmap-hdpi/ic_launcher_round.png', size: 72 },
  { name: 'mipmap-xhdpi/ic_launcher.png', size: 96 },
  { name: 'mipmap-xhdpi/ic_launcher_round.png', size: 96 },
  { name: 'mipmap-xxhdpi/ic_launcher.png', size: 144 },
  { name: 'mipmap-xxhdpi/ic_launcher_round.png', size: 144 },
  { name: 'mipmap-xxxhdpi/ic_launcher.png', size: 192 },
  { name: 'mipmap-xxxhdpi/ic_launcher_round.png', size: 192 },
];

const androidForegroundIcons = [
  { name: 'mipmap-mdpi/ic_launcher_foreground.png', size: 108 },
  { name: 'mipmap-hdpi/ic_launcher_foreground.png', size: 162 },
  { name: 'mipmap-xhdpi/ic_launcher_foreground.png', size: 216 },
  { name: 'mipmap-xxhdpi/ic_launcher_foreground.png', size: 324 },
  { name: 'mipmap-xxxhdpi/ic_launcher_foreground.png', size: 432 },
];

const iosIcons = [
  { name: 'AppIcon-512@2x.png', size: 1024 },
];

async function generateIcons() {
  console.log('Generating icons from SVG...');
  
  for (const icon of androidIcons) {
    const outputPath = path.join(androidResPath, icon.name);
    const dir = path.dirname(outputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await sharp(svgPath)
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }
  
  console.log('\nGenerating adaptive icon foreground layers...');
  
  for (const icon of androidForegroundIcons) {
    const outputPath = path.join(androidResPath, icon.name);
    const dir = path.dirname(outputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const iconSize = Math.round(icon.size * 0.67);
    const padding = Math.round((icon.size - iconSize) / 2);
    
    await sharp(svgPath)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size}, icon: ${iconSize}x${iconSize})`);
  }
  
  console.log('\nGenerating iOS icons...');
  
  for (const icon of iosIcons) {
    const outputPath = path.join(iosAssetsPath, icon.name);
    
    if (!fs.existsSync(iosAssetsPath)) {
      fs.mkdirSync(iosAssetsPath, { recursive: true });
    }
    
    await sharp(svgPath)
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }
  
  console.log('\nDone!');
}

generateIcons().catch(console.error);
