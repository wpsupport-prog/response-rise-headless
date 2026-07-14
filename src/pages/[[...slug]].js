import Head from 'next/head';
import Script from 'next/script';
import { useEffect, useState, useRef } from 'react';
import { getPageAssetsAndHtml, getAllPagesWithSlugs } from '../lib/api';
import Layout from '../components/Layout';

export default function HeadlessDynamicRender({ pageData }) {
  const [domReady, setDomReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!pageData) return;

    const wrapper = document.querySelector('.elementor-rendered-html-wrapper');
    if (!wrapper) return;

    const observer = new MutationObserver(() => {
      setDomReady(true);
      observer.disconnect();
    });

    observer.observe(wrapper, { childList: true, subtree: true });
    const timeout = setTimeout(() => setDomReady(true), 800);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pageData]);

  useEffect(() => {
    if (domReady && window.elementorFrontend && typeof window.elementorFrontend.init === 'function') {
      if (!initializedRef.current) {
        try {
          console.log("🎬 Safely initializing live Elementor modules once...");
          window.elementorFrontend.init();
          initializedRef.current = true;
        } catch (err) {
          console.warn("Elementor init loop pass:", err.message);
        }
      }
    }
  }, [domReady]);

  if (!pageData) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 animate-pulse">
        Serving localized preview framework...
      </div>
    );
  }

  // Destructure lcpImageUrl from the newly updated api query payload
  const { html, stylesheets, inlineStyles, externalScripts, inlineScripts, lcpImageUrl } = pageData;

  return (
    <Layout>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Manrope:wght@400;600;700;800&display=swap" 
          rel="stylesheet" 
        />

        {/* PERFORMANCE OPTIMIZATION: High-priority link preloader for the main viewport hero element */}
        {lcpImageUrl && (
          <link 
            rel="preload" 
            fetchpriority="high" 
            as="image" 
            href={lcpImageUrl} 
          />
        )}

        {/* Load FontAwesome asset package vector rules directly to render header dropdown carets */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" 
        />

        {/* Localized Stylesheet Links */}
        {stylesheets.map((localUrl, idx) => (
          <link key={`local-wp-css-${idx}`} rel="stylesheet" href={localUrl} />
        ))}

        {/* Dynamic Elementor Styles */}
        {inlineStyles.map((styleContent, idx) => (
          <style 
            key={`elementor-inline-css-${idx}`} 
            dangerouslySetInnerHTML={{ __html: styleContent }} 
          />
        ))}

        {/* HEADER MENU CONSTRAINT, ALIGNMENT, & PERFORMANCE SHIELDS */}
        <style dangerouslySetInnerHTML={{ __html: `
          .elementor-rendered-html-wrapper img {
            max-width: 100% !important;
            height: auto !important;
            object-fit: cover !important;
            display: block !important;
          }
          .elementor-widget-image {
            display: flex !important;
          }

          /* FORCE LCP Image asset column to render instantly without visual layout delays */
          .elementor-top-section:first-of-type img {
            content-visibility: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          /* Main Horizontal Menu Alignment Layout rules */
          .elementor-nav-menu ul.elementor-nav-menu--main {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: flex-end !important;
            list-style: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .elementor-nav-menu--main > li {
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            white-space: nowrap !important;
          }

          /* DROPDOWN SUBMENU BOX OVERLAY CONTAINER WITH HOVER BRIDGE */
          .elementor-nav-menu--main ul.sub-menu {
            display: none !important;
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            z-index: 9999 !important;
            flex-direction: column !important;
            list-style: none !important;
            background: #ffffff !important;
            box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.12) !important;
            border-radius: 8px !important;
            padding: 12px 0 !important;
            min-width: 260px !important; 
            width: max-content !important; 
          }

          .elementor-nav-menu--main ul.sub-menu::before {
            content: '' !important;
            position: absolute !important;
            top: -25px !important;
            left: 0 !important;
            width: 100% !important;
            height: 25px !important;
            background: transparent !important;
            cursor: pointer !important;
          }

          .elementor-nav-menu--main ul.sub-menu li {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .elementor-nav-menu--main ul.sub-menu li a {
            display: block !important;
            padding: 10px 20px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            white-space: nowrap !important; 
            color: #333333 !important;
            transition: background 0.2s ease, color 0.2s ease !important;
          }

          .elementor-nav-menu--main ul.sub-menu li a:hover {
            background-color: #f7f9fa !important;
            color: #FF6F00 !important; 
          }

          .elementor-nav-menu--main li:hover > ul.sub-menu,
          .elementor-nav-menu--main li:focus-within > ul.sub-menu {
            display: flex !important;
          }
          
          .elementor-nav-menu .sub-arrow {
            display: inline-block !important;
            vertical-align: middle !important;
            margin-left: 5px !important;
          }
          
          .sub-arrow + .sub-arrow,
          .sub-arrow i + i,
          .sub-arrow svg + svg {
            display: none !important;
          }

          .elementor-rendered-html-wrapper .elementor-button:hover,
          .elementor-rendered-html-wrapper .elementor-button:focus {
            background-color: rgb(176, 205, 248) !important;
            color: #FFFFFF !important;
            transition: background-color 0.25s ease-in-out !important;
          }

          /* DEFAULT UNIVERSAL DYNAMIC FOOTER SHIELD (For standard pages) */
          .elementor-rendered-html-wrapper footer.elementor-location-footer,
          .elementor-rendered-html-wrapper footer.elementor-location-footer *,
          .elementor-rendered-html-wrapper [data-elementor-type="footer"],
          .elementor-rendered-html-wrapper [data-elementor-type="footer"] *,
          .elementor-rendered-html-wrapper [class*="elementor-638"],
          .elementor-rendered-html-wrapper [class*="elementor-638"] * {
            background-color: #203345 !important;
            background-image: none !important;
          }

          /* ABSOLUTE WHITE SPECIFIC ROUTE SHIELD (For meeting schedule layout) */
          .elementor-rendered-html-wrapper [class*="elementor-1035"],
          .elementor-rendered-html-wrapper [class*="elementor-1035"] *,
          .elementor-rendered-html-wrapper footer[data-elementor-id="1035"],
          .elementor-rendered-html-wrapper footer[data-elementor-id="1035"] * {
            background-color: #FFFFFF !important;
            background-image: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Hide all text inside this specific white footer */
          .elementor-rendered-html-wrapper [class*="elementor-1035"] h1,
          .elementor-rendered-html-wrapper [class*="elementor-1035"] h2,
          .elementor-rendered-html-wrapper [class*="elementor-1035"] h3,
          .elementor-rendered-html-wrapper [class*="elementor-1035"] p,
          .elementor-rendered-html-wrapper [class*="elementor-1035"] a,
          .elementor-rendered-html-wrapper [class*="elementor-1035"] span,
          .elementor-rendered-html-wrapper [class*="elementor-1035"] div {
            color: transparent !important;
            font-size: 0 !important;
            line-height: 0 !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        `}} />

        {/* Inject Elementor configuration script blocks before engine libraries load */}
        {inlineScripts.map((scriptContent, idx) => (
          <script 
            key={`wp-inline-script-${idx}`}
            dangerouslySetInnerHTML={{ __html: scriptContent }}
          />
        ))}
      </Head>

      {/* Primary jQuery Dependency Layer */}
      <Script 
        src="https://responserise.wpenginepowered.com/wp-includes/js/jquery/jquery.min.js"
        strategy="beforeInteractive"
      />
      
      {/* Elementor Core Waypoints Dependency */}
      <Script 
        src="https://responserise.wpenginepowered.com/wp-content/plugins/elementor/assets/lib/waypoints/waypoints.min.js"
        strategy="afterInteractive"
      />

      {/* Mount remaining external production engine scripts with optimized load strategies */}
      {externalScripts.map((url, idx) => {
        if (url.includes('jquery.min.js') || url.includes('waypoints.min.js')) return null;
        
        // Critical interface dependencies execute via standard parameters asynchronously
        if (url.includes('elementor-frontend') || url.includes('core')) {
          return <Script key={`wp-ext-js-${idx}`} src={url} strategy="afterInteractive" />;
        }
        
        // Non-critical background layers get deferred entirely until the primary window thread goes idle
        return (
          <Script 
            key={`wp-ext-js-${idx}`} 
            src={url} 
            strategy="lazyOnload" 
          />
        );
      })}

      <div 
        className="elementor-rendered-html-wrapper localized-static-viewport"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </Layout>
  );
}

export async function getStaticProps({ params }) {
  const slugArray = params?.slug || [];
  const slug = slugArray.join('/');
  
  try {
    const pageData = await getPageAssetsAndHtml(slug);
    if (!pageData) return { notFound: true };
    return { props: { pageData }, revalidate: 10 };
  } catch (err) {
    return { notFound: true };
  }
}

export async function getStaticPaths() {
  const pages = await getAllPagesWithSlugs();
  const paths = pages.map(page => {
    if (page.uri === '/' || page.uri === '') {
      return { params: { slug: [] } };
    }
    const cleanSlug = page.uri.split('/').filter(Boolean);
    return { params: { slug: cleanSlug } };
  });

  return { paths, fallback: 'blocking' };
}