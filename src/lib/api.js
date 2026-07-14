import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function getPageAssetsAndHtml(slug) {
  const wpDomain = 'https://responserise.wpenginepowered.com';
  const url = `${wpDomain}/${slug}`;
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // 1. Structural Target Regex Scrapes
    const cssRegex = /<link\s+[^>]*href=['"]([^'"]*\.css[^'"]*)['"][^>]*>/g;
    const jsRegex = /<script[^>]*src=['"]([^'"]*)['"][^>]*>/g;
    
    const remoteStylesheets = [];
    const externalScripts = [];
    let match;

    while ((match = cssRegex.exec(html)) !== null) {
      let cssUrl = match[1].trim();
      if (cssUrl.includes('responserise.wpenginepowered.com') || cssUrl.startsWith('/wp-')) {
        if (cssUrl.startsWith('/')) cssUrl = `${wpDomain}${cssUrl}`;
        remoteStylesheets.push(cssUrl);
      }
    }

    while ((match = jsRegex.exec(html)) !== null) {
      let jsUrl = match[1].trim();
      if (jsUrl.includes('responserise.wpenginepowered.com') || jsUrl.startsWith('/wp-')) {
        if (jsUrl.startsWith('/')) jsUrl = `${wpDomain}${jsUrl}`;
        if (!jsUrl.includes('wp-emoji-loader')) {
          externalScripts.push(jsUrl);
        }
      }
    }

    const publicCssDir = path.join(process.cwd(), 'public', 'css');
    const publicImgDir = path.join(process.cwd(), 'public', 'images');

    if (!fs.existsSync(publicCssDir)) fs.mkdirSync(publicCssDir, { recursive: true });
    if (!fs.existsSync(publicImgDir)) fs.mkdirSync(publicImgDir, { recursive: true });

    // 2. Download and save stylesheets locally
    const localStylesheets = [];
    for (const cssUrl of remoteStylesheets) {
      try {
        const cleanUrl = cssUrl.split('?')[0];
        const urlHash = crypto.createHash('md5').update(cleanUrl).digest('hex');
        const fileName = `${urlHash}.css`;
        const localFilePath = path.join(publicCssDir, fileName);

        if (!fs.existsSync(localFilePath)) {
          const cssResponse = await fetch(cssUrl);
          let cssText = await cssResponse.text();

          cssText = cssText.replace(/url\(['"]?(\.\.\/[^'")]+)['"]?\)/g, (m, relPath) => {
            return `url("${wpDomain}/wp-content/plugins/elementor/assets/${relPath.replace(/\.\.\//g, '')}")`;
          });

          fs.writeFileSync(localFilePath, cssText, 'utf8');
        }
        
        const localPathStr = `/css/${fileName}`;
        if (!localStylesheets.includes(localPathStr)) {
          localStylesheets.push(localPathStr);
        }
      } catch (err) {
        console.warn(`⚠️ Skipped style layer download: ${cssUrl}`);
      }
    }

    // 3. Extract the primary body markup block
    const bodyStart = html.indexOf('<body');
    const bodyEnd = html.indexOf('</body>');
    let bodyHtml = html;
    if (bodyStart !== -1 && bodyEnd !== -1) {
      bodyHtml = html.substring(bodyStart, bodyEnd + 7);
    }

    // 4. Download and map images locally
    const imagesToDownload = new Set();
    const imgTagRegex = /<img([^>]*)\/?>/g;
    let imgTagMatch;
    while ((imgTagMatch = imgTagRegex.exec(bodyHtml)) !== null) {
      const attrs = imgTagMatch[1];
      const srcMatch = attrs.match(/(?:src|data-src|data-lazy-src|data-thumb)=['"]([^'"]*)['"]/);
      if (srcMatch && srcMatch[1] && (srcMatch[1].includes('wp-content') || srcMatch[1].includes('wp-includes'))) {
        imagesToDownload.add(srcMatch[1].trim());
      }
    }

    const rawUrlRegex = /(https:\/\/responserise\.wpenginepowered\.com\/wp-content\/uploads\/[^'"\s\)]+)/g;
    let urlMatch;
    while ((urlMatch = rawUrlRegex.exec(bodyHtml)) !== null) {
      imagesToDownload.add(urlMatch[1].replace(/[\\']/g, '').trim());
    }

    const escapedUrlRegex = /(https:\\\/\\\/responserise\.wpenginepowered\.com\\\/wp-content\\\/uploads\\\/[^'"\s\)]+)/g;
    let escMatch;
    while ((escMatch = escapedUrlRegex.exec(bodyHtml)) !== null) {
      const unescapedUrl = escMatch[1].replace(/\\\//g, '/');
      imagesToDownload.add(unescapedUrl.trim());
    }

    for (const remoteImgUrl of imagesToDownload) {
      try {
        const fullImgUrl = remoteImgUrl.startsWith('//') ? `https:${remoteImgUrl}` : remoteImgUrl;
        const ext = path.extname(fullImgUrl.split('?')[0]) || '.png';
        const imgHash = crypto.createHash('md5').update(fullImgUrl).digest('hex');
        const imgFileName = `${imgHash}${ext}`;
        const imgLocalPath = path.join(publicImgDir, imgFileName);

        if (!fs.existsSync(imgLocalPath)) {
          const imgRes = await fetch(fullImgUrl);
          const buffer = await imgRes.arrayBuffer();
          fs.writeFileSync(imgLocalPath, Buffer.from(buffer));
        }

        const escapedNormalUrl = remoteImgUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        bodyHtml = bodyHtml.replace(new RegExp(escapedNormalUrl, 'g'), `/images/${imgFileName}`);

        const escapedJsonUrl = remoteImgUrl.replace(/\//g, '\\/').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const localJsonUrl = `/images/${imgFileName}`.replace(/\//g, '\\/');
        bodyHtml = bodyHtml.replace(new RegExp(escapedJsonUrl, 'g'), localJsonUrl);
      } catch (imgErr) {
        console.warn(`⚠️ Download error ignored for: ${remoteImgUrl}`);
      }
    }

    // Clean up lazy load nodes
    bodyHtml = bodyHtml.replace(/srcset=['"][^'"]*['"]/g, '');
    bodyHtml = bodyHtml.replace(/sizes=['"][^'"]*['"]/g, '');
    bodyHtml = bodyHtml.replace(/data-srcset=['"][^'"]*['"]/g, '');

    // 5. Link Conversion
    const absoluteLinksRegex = /https?:\/\/responserise\.wpenginepowered\.com(\/[^'"]*)?/g;
    bodyHtml = bodyHtml.replace(absoluteLinksRegex, (match, pathname) => {
      if (pathname && (pathname.includes('/wp-content') || pathname.includes('/wp-includes') || pathname.includes('/images/'))) {
        return match;
      }
      return pathname || '/';
    });

    // 6. CRITICAL FIX FOR BLANK PAGES: Pre-strip elementor-invisible initialization flags 
    // so hidden blocks display immediately if the dynamic scripts face race conditions on load
    bodyHtml = bodyHtml.replace(/\belementor-invisible\b/g, '');

    // 7. Extract internal layout style blocks
    const inlineStyles = [];
    const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let styleMatch;
    while ((styleMatch = styleBlockRegex.exec(html)) !== null) {
      inlineStyles.push(styleMatch[1]);
    }

    // 8. Safe inline scripts filter
    const inlineScripts = [];
    const scriptBlockRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
    let scriptMatch;
    while ((scriptMatch = scriptBlockRegex.exec(html)) !== null) {
      const scriptContent = scriptMatch[1].trim();
      if (scriptContent.includes('window._wpemojiSettings')) continue; 
      if (scriptContent.includes('elementorFrontendConfig') || scriptContent.includes('wp_inline') || scriptContent.includes('var ')) {
        const cleanedScript = scriptContent.replace(/https?:\/\/responserise\.wpenginepowered\.com/g, '');
        inlineScripts.push(cleanedScript);
      }
    }

    const coreVariableFallbackKit = `
      :root {
        --e-global-color-888c2ab: #FFFFFF !important;
        --e-global-color-9a1cfd7: #FF6F00 !important; 
        --e-global-color-accent: #F4F6F8 !important; 
        --e-global-color-primary: #0F2942 !important;
        --e-global-color-secondary: #546E7A !important;
        --e-global-color-text: #4C4C4C !important;
      }
      .elementor-nav-menu--main .elementor-item.elementor-item-active {
        color: #FF6841 !important;
      }
      .elementor-widget-heading:not(.elementor-element-a87cf4f) .elementor-heading-title {
        color: #000000;
      }
      .elementor-element-a87cf4f .elementor-heading-title {
        color: #FFFFFF !important;
      }
    `;
    inlineStyles.unshift(coreVariableFallbackKit);

    return {
      html: bodyHtml,
      stylesheets: localStylesheets,
      inlineStyles,
      externalScripts,
      inlineScripts
    };
  } catch (error) {
    console.error("❌ Link rewrite parsing engine exception:", error);
    return null;
  }
}

export async function getAllPagesWithSlugs() {
  return [
    { uri: '/' }, 
    { uri: '/online-courses' }, 
    { uri: '/about-us' }, 
    { uri: '/contact' },
    { uri: '/meeting-schedule' } // Explicitly register this sub-route map key
  ];
}