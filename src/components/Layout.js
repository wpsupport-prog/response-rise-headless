import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* We completely stripped out the hardcoded Next.js <header> and <footer> tags here. 
        Your scraper already fetches the perfect live header and footer code structures 
        directly inside the 'children' payload canvas! 
      */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}