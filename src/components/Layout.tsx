import React from 'react';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">MHTCET College Predictor</h1>
          <nav>
            <a href="/" className="text-white hover:underline mx-2">
              Home
            </a>
            <a href="/predict" className="text-white hover:underline mx-2">
              Predict
            </a>
            <a href="/admin/login" className="text-white hover:underline mx-2">
              Admin
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-blue-600 text-white py-4 mt-8">
        <div className="container mx-auto text-center">
          <p>&copy; 2025 MHTCET College Predictor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}