import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function getPageAssetsAndHtml(slug) {
  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';
  const cleanWpDomain = wpDomain.replace(/^https?:\/\//, '');
  const url = `https://${cleanWpDomain}/${slug}`;
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // 1. EXTRACT ALL ORIGINAL WP STYLESHEETS (Without downloading them)
    const cssRegex = /<link\s+[^>]*href=['"]([^'"]*)['"][^>]*>/g;
    const jsRegex = /<script[^>]*src=['"]([^'"]*)['"][^>]*>/g;
    
    const remoteStylesheets = [];
    const externalScripts = [];
    let match;

    while ((match = cssRegex.exec(html)) !== null) {
      let cssUrl = match[1].trim();
      
      // We only care about active stylesheets
      if (match[0].includes('rel=') && !match[0].includes('stylesheet')) continue;

      if (cssUrl.startsWith('//')) {
        cssUrl = `https:${cssUrl}`;
      } else if (cssUrl.startsWith('/')) {
        cssUrl = `https://${cleanWpDomain}${cssUrl}`;
      }

      if (
        cssUrl.includes(cleanWpDomain) || 
        cssUrl.includes('/wp-content/') ||
        cssUrl.includes('/wp-includes/')
      ) {
        if (!remoteStylesheets.includes(cssUrl)) {
          remoteStylesheets.push(cssUrl);
        }
      }
    }

    // 2. Map scripts safely
    while ((match = jsRegex.exec(html)) !== null) {
      let jsUrl = match[1].trim();
      
      if (jsUrl.startsWith('//')) {
        jsUrl = `https:${jsUrl}`;
      } else if (jsUrl.startsWith('/')) {
        jsUrl = `https://${cleanWpDomain}${jsUrl}`;
      }

      if (
        jsUrl.includes(cleanWpDomain) || 
        jsUrl.includes('/wp-content/') ||
        jsUrl.includes('/wp-includes/')
      ) {
        if (!jsUrl.includes('wp-emoji-loader') && !externalScripts.includes(jsUrl)) {
          externalScripts.push(jsUrl);
        }
      }
    }

    // 3. Keep image downloading active (for fast local image optimization)
    const publicImgDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(publicImgDir)) fs.mkdirSync(publicImgDir, { recursive: true });

    const bodyStart = html.indexOf('<body');
    const bodyEnd = html.indexOf('</body>');
    let bodyHtml = html;
    if (bodyStart !== -1 && bodyEnd !== -1) {
      bodyHtml = html.substring(bodyStart, bodyEnd + 7);
    }

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

    const rawUrlRegex = new RegExp(`(https?:\\/\\/[^/]*${cleanWpDomain}\\/wp-content\\/uploads\\/[^'"\\s\\)]+)`, 'g');
    let urlMatch;
    while ((urlMatch = rawUrlRegex.exec(bodyHtml)) !== null) {
      imagesToDownload.add(urlMatch[1].replace(/[\\']/g, '').trim());
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
      } catch (imgErr) {
        // Fallback silently
      }
    }

    bodyHtml = bodyHtml.replace(/srcset=['"][^'"]*['"]/g, '');
    bodyHtml = bodyHtml.replace(/sizes=['"][^'"]*['"]/g, '');
    bodyHtml = bodyHtml.replace(/data-srcset=['"][^'"]*['"]/g, '');

    // 4. Link Conversion
    const absoluteLinksRegex = new RegExp(`https?:\\/\\/[^/]*${cleanWpDomain}(\\/[^'"]*)?`, 'g');
    bodyHtml = bodyHtml.replace(absoluteLinksRegex, (match, pathname) => {
      if (pathname && (pathname.includes('/wp-content') || pathname.includes('/wp-includes') || pathname.includes('/images/'))) {
        return match;
      }
      return pathname || '/';
    });

    bodyHtml = bodyHtml.replace(/\belementor-invisible\b/g, '');

    // 5. Extract internal layout style blocks (includes WooCommerce dynamic configurations)
    const inlineStyles = [];
    const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let styleMatch;
    while ((styleMatch = styleBlockRegex.exec(html)) !== null) {
      inlineStyles.push(styleMatch[1]);
    }

    // 6. Safe inline scripts filter
    const inlineScripts = [];
    const scriptBlockRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
    let scriptMatch;
    while ((scriptMatch = scriptBlockRegex.exec(html)) !== null) {
      const scriptContent = scriptMatch[1].trim();
      if (scriptContent.includes('window._wpemojiSettings')) continue; 
      if (scriptContent.includes('elementorFrontendConfig') || scriptContent.includes('wp_inline') || scriptContent.includes('var ')) {
        const cleanedScript = scriptContent.replace(new RegExp(`https?:\\/\\/[^/]*${cleanWpDomain}`, 'g'), '');
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

    let lcpImageUrl = '';
    const firstImgMatch = bodyHtml.match(/<img[^>]+src=['"]([^'"]+)['"]/);
    if (firstImgMatch && firstImgMatch[1]) {
      lcpImageUrl = firstImgMatch[1];
    }

    return {
      html: bodyHtml,
      stylesheets: remoteStylesheets, // Serves original live URLs directly
      inlineStyles,
      externalScripts,
      inlineScripts,
      lcpImageUrl
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
    { uri: '/meeting-schedule' },
    { uri: '/my-account' }
  ];
}