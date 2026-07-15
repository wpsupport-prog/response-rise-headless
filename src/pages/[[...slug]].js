import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { getPageAssetsAndHtml, getAllPagesWithSlugs } from '../lib/api';
import Layout from '../components/Layout';

export default function HeadlessDynamicRender({ pageData }) {
  const router = useRouter();
  const [domReady, setDomReady] = useState(false);
  const initializedRef = useRef(false);

  // Authentication & Session States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  
  // Login Form States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Registration Form States
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // UI Status States
  const [successMessage, setSuccessMessage] = useState('');

  // Check current page path
  const currentSlug = router.query.slug ? router.query.slug.join('/') : '';
  const isMyAccountPage = currentSlug === 'my-account';

  // 1. Validate Active Sessions on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem('headless_user_token');
    const savedUser = localStorage.getItem('headless_user_data');
    if (savedToken && savedUser) {
      setIsLoggedIn(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';

  // 2. Handle Login using the Custom Bypass Route
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSuccessMessage('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${wpDomain}/wp-json/custom-auth/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('headless_user_token', data.token);
        const userData = {
          email: data.user_email,
          nicename: data.user_nicename,
          displayName: data.user_display_name,
        };
        localStorage.setItem('headless_user_data', JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
      } else {
        setLoginError(data.message || 'Invalid login details. Please verify and try again.');
      }
    } catch (err) {
      setLoginError('Unable to connect to the login portal.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 3. Handle Public Customer Registration & Auto-Login
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setSuccessMessage('');
    setIsRegistering(true);

    try {
      const res = await fetch(`${wpDomain}/wp-json/wp/v2/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Registration successful! Logging you in automatically...');
        
        setTimeout(async () => {
          try {
            const loginRes = await fetch(`${wpDomain}/wp-json/custom-auth/v1/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: regUsername, password: regPassword }),
            });

            const loginData = await loginRes.json();

            if (loginRes.ok && loginData.token) {
              localStorage.setItem('headless_user_token', loginData.token);
              const userData = {
                email: loginData.user_email,
                nicename: loginData.user_nicename,
                displayName: loginData.user_display_name,
              };
              localStorage.setItem('headless_user_data', JSON.stringify(userData));
              setUser(userData);
              setIsLoggedIn(true);
            } else {
              setRegisterError('Account created successfully, but auto-login failed. Please sign in manually.');
            }
          } catch (loginErr) {
            setRegisterError('Account created! Please use the login form to sign in.');
          } finally {
            setIsRegistering(false);
          }
        }, 200);
      } else {
        setRegisterError(data.message || 'Registration failed. This email or username may already be taken.');
        setIsRegistering(false);
      }
    } catch (err) {
      setRegisterError('Connection error during registration setup.');
      setIsRegistering(false);
    }
  };

  // 4. Handle Logout Session Termination
  const handleLogout = () => {
    localStorage.removeItem('headless_user_token');
    localStorage.removeItem('headless_user_data');
    setIsLoggedIn(false);
    setUser(null);
  };

  // Mutation Observers for Elementor DOM rendering
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

  if (!pageData) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 animate-pulse">
        Serving localized preview framework...
      </div>
    );
  }

  const { html, stylesheets, inlineStyles, externalScripts, inlineScripts, lcpImageUrl } = pageData;

  // --- HTML SPLITTING LOGIC FOR THE SCRAPED HEADER & FOOTER ---
  // This looks for the Elementor header wrapper blocks, extracts them, and isolates them
  let headerHtml = "";
  let footerHtml = "";

  if (html) {
    // 1. Identify where the active Elementor Header ends
    const headerEndIndex = html.indexOf('</header>');
    if (headerEndIndex !== -1) {
      headerHtml = html.substring(0, headerEndIndex + 9);
    } else {
      // Fallback: search for custom elementor header container tags
      const elementorHeaderEnd = html.indexOf('</div>', html.indexOf('elementor-location-header'));
      if (elementorHeaderEnd !== -1) {
        headerHtml = html.substring(0, elementorHeaderEnd + 6);
      }
    }

    // 2. Identify where the Elementor Footer begins
    const footerStartIndex = html.indexOf('<footer');
    if (footerStartIndex !== -1) {
      footerHtml = html.substring(footerStartIndex);
    } else {
      const elementorFooterStart = html.indexOf('class="elementor-location-footer"');
      if (elementorFooterStart !== -1) {
        // Trace back to opening tag
        const startOfFooterTag = html.lastIndexOf('<div', elementorFooterStart);
        if (startOfFooterTag !== -1) {
          footerHtml = html.substring(startOfFooterTag);
        }
      }
    }
  }

  return (
    <Layout>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Manrope:wght@400;600;700;800&display=swap" 
          rel="stylesheet" 
        />
        {lcpImageUrl && <link rel="preload" fetchpriority="high" as="image" href={lcpImageUrl} />}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />

        {stylesheets.map((localUrl, idx) => (
          <link key={`local-wp-css-${idx}`} rel="stylesheet" href={localUrl} />
        ))}
        {inlineStyles.map((styleContent, idx) => (
          <style key={`elementor-inline-css-${idx}`} dangerouslySetInnerHTML={{ __html: styleContent }} />
        ))}

        <style dangerouslySetInnerHTML={{ __html: `
          .elementor-rendered-html-wrapper img { max-width: 100% !important; height: auto !important; object-fit: cover !important; display: block !important; }
          .elementor-widget-image { display: flex !important; }
          .elementor-nav-menu ul.elementor-nav-menu--main { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; justify-content: flex-end !important; list-style: none !important; margin: 0 !important; padding: 0 !important; }
          .elementor-nav-menu--main > li { position: relative !important; display: inline-flex !important; align-items: center !important; white-space: nowrap !important; }
          .elementor-nav-menu--main ul.sub-menu { display: none !important; position: absolute !important; top: 100% !important; left: 0 !important; z-index: 9999 !important; flex-direction: column !important; list-style: none !important; background: #ffffff !important; box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.12) !important; border-radius: 8px !important; padding: 12px 0 !important; min-width: 260px !important; width: max-content !important; }
          .elementor-nav-menu--main ul.sub-menu::before { content: '' !important; position: absolute !important; top: -25px !important; left: 0 !important; width: 100% !important; height: 25px !important; background: transparent !important; cursor: pointer !important; }
          .elementor-nav-menu--main ul.sub-menu li { display: block !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .elementor-nav-menu--main ul.sub-menu li a { display: block !important; padding: 10px 20px !important; width: 100% !important; box-sizing: border-box !important; white-space: nowrap !important; color: #333333 !important; transition: background 0.2s ease, color 0.2s ease !important; }
          .elementor-nav-menu--main ul.sub-menu li a:hover { background-color: #f7f9fa !important; color: #FF6F00 !important; }
          .elementor-nav-menu--main li:hover > ul.sub-menu, .elementor-nav-menu--main li:focus-within > ul.sub-menu { display: flex !important; }
          .elementor-nav-menu .sub-arrow { display: inline-block !important; vertical-align: middle !important; margin-left: 5px !important; }
          
          .elementor-rendered-html-wrapper footer.elementor-location-footer,
          .elementor-rendered-html-wrapper footer.elementor-location-footer *,
          .elementor-rendered-html-wrapper [data-elementor-type="footer"],
          .elementor-rendered-html-wrapper [data-elementor-type="footer"] *,
          .elementor-rendered-html-wrapper [class*="elementor-638"],
          .elementor-rendered-html-wrapper [class*="elementor-638"] * {
            background-color: #203345 !important;
            background-image: none !important;
          }
        `}} />

        {inlineScripts.map((scriptContent, idx) => (
          <script key={`wp-inline-script-${idx}`} dangerouslySetInnerHTML={{ __html: scriptContent }} />
        ))}
      </Head>

      <Script src="https://responserise.wpenginepowered.com/wp-includes/js/jquery/jquery.min.js" strategy="beforeInteractive" />
      <Script src="https://responserise.wpenginepowered.com/wp-content/plugins/elementor/assets/lib/waypoints/waypoints.min.js" strategy="afterInteractive" />

      {isMyAccountPage ? (
        <div className="woocommerce-account woocommerce page-template-default page wp-custom-logo">
          
          {/* 1. SCRAPED HEADER CONTAINER - Renders your exact layout header first */}
          {headerHtml && (
            <div 
              className="elementor-rendered-html-header-wrapper" 
              dangerouslySetInnerHTML={{ __html: headerHtml }} 
            />
          )}

          {/* 2. NATIVE ACCOUNT CONTENT CONTAINER */}
          <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            
            {/* Global Success Feedback Header */}
            <div className="max-w-4xl mx-auto mb-6">
              {successMessage && (
                <div className="p-4 mb-4 bg-green-50 text-green-700 text-sm font-semibold rounded-md border border-green-200">
                  {successMessage}
                </div>
              )}
            </div>

            {isLoggedIn ? (
              // LOGGED IN DASHBOARD
              <div className="max-w-2xl mx-auto bg-white py-8 px-6 shadow sm:rounded-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Welcome back, {user?.displayName}!
                </h2>
                <div className="rounded-md bg-blue-50 p-4 border border-blue-200 mb-6">
                  <h3 className="text-sm font-semibold text-blue-800">Your Headless Profile Data</h3>
                  <div className="mt-2 text-xs text-blue-700 space-y-1">
                    <p><strong>Username:</strong> {user?.nicename}</p>
                    <p><strong>Email:</strong> {user?.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => router.push('/online-courses')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition"
                  >
                    Go to Training Hub
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              // SIDE-BY-SIDE LOGIN AND REGISTRATION PORTLETS
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. LOGIN PORTLET */}
                <div className="bg-white py-8 px-6 shadow sm:rounded-lg border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Login</h2>
                    
                    {loginError && (
                      <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs font-semibold rounded border border-red-200">
                        {loginError}
                      </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLoginSubmit}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Username or email address *</label>
                        <input
                          type="text"
                          required
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Password *</label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input id="remember-me" type="checkbox" className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">Remember me</label>
                        </div>
                        <div className="text-sm">
                          <a href="#" className="font-medium text-orange-600 hover:text-orange-500">Lost password?</a>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none disabled:opacity-50 font-semibold transition"
                      >
                        {isLoggingIn ? 'Verifying...' : 'Log in'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* 2. REGISTRATION PORTLET */}
                <div className="bg-white py-8 px-6 shadow sm:rounded-lg border border-gray-100 flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Register</h2>
                    
                    {registerError && (
                      <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs font-semibold rounded border border-red-200">
                        {registerError}
                      </div>
                    )}

                    <form className="space-y-6" onSubmit={handleRegisterSubmit}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Username *</label>
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email address *</label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Password *</label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Your personal data will be used to support your experience throughout this website, to manage access to your account, and for other purposes described in our privacy policy.
                      </p>
                      <button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none disabled:opacity-50 font-semibold transition"
                      >
                        {isRegistering ? 'Creating account...' : 'Register'}
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* 3. SCRAPED FOOTER CONTAINER - Renders your exact footer below the dashboard */}
          {footerHtml && (
            <div 
              className="elementor-rendered-html-footer-wrapper" 
              dangerouslySetInnerHTML={{ __html: footerHtml }} 
            />
          )}

        </div>
      ) : (
        <div 
          className="elementor-rendered-html-wrapper localized-static-viewport"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      )}
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