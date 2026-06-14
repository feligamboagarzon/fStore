import React, { useState } from 'react';

const Header = ({ 
  cartCount, 
  onOpenCart, 
  onViewChange, 
  categories = [], 
  selectedCategory, 
  onSelectCategory, 
  currentView 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  const handleCategoryClick = (cat) => {
    onSelectCategory(cat);
    onViewChange('catalog');
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Left: Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1 text-foreground focus:outline-none"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => {
              onViewChange('landing');
              setIsMobileMenuOpen(false);
            }}
          >
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center rounded-sm font-bold text-lg leading-none">
              f
            </div>
            <span className="text-xl font-medium tracking-tight">Store<span className="text-muted">.</span></span>
          </div>
        </div>

        {/* Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button 
            onClick={() => {
              onSelectCategory('Todo');
              onViewChange('catalog');
            }} 
            className={`hover:text-muted transition-colors duration-300 ${
              currentView === 'catalog' && selectedCategory === 'Todo' ? 'text-foreground' : 'text-muted/80'
            }`}
          >
            Shop
          </button>
          
          {/* Dropdown for Categorías */}
          <div className="relative group py-2">
            <button 
              className={`hover:text-muted transition-colors duration-300 flex items-center gap-1.5 focus:outline-none ${
                currentView === 'catalog' && selectedCategory !== 'Todo' ? 'text-foreground' : 'text-muted/80'
              }`}
            >
              Categorías
              <svg className="w-3.5 h-3.5 text-muted transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white/95 backdrop-blur-md border border-border/80 rounded-sm shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out z-50">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`w-full text-left px-5 py-2.5 text-xs transition-colors duration-200 flex items-center justify-between ${
                    selectedCategory === cat && currentView === 'catalog'
                      ? 'bg-background text-foreground font-medium'
                      : 'text-muted hover:bg-background hover:text-foreground'
                  }`}
                >
                  <span>{cat}</span>
                  {selectedCategory === cat && currentView === 'catalog' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button className="hover:text-muted transition-colors duration-300 text-muted/80">About</button>
        </nav>

        {/* Search & Cart */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center border-b border-border pb-1">
            <svg className="w-4 h-4 text-muted mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-sm w-32 focus:w-48 transition-all duration-300 ease-out placeholder:text-muted/60"
            />
          </div>
          <button 
            onClick={onOpenCart}
            className="flex items-center gap-2 group"
          >
            <span className="text-sm font-medium group-hover:text-muted transition-colors duration-300">Cart</span>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-medium transition-transform duration-300 group-hover:scale-110">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div 
        className={`md:hidden fixed top-20 left-0 right-0 bottom-0 bg-background/97 backdrop-blur-lg z-40 transition-all duration-300 ease-in-out border-t border-border/40 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'
        }`}
      >
        <div className="flex flex-col p-8 gap-6 text-lg font-light">
          <button 
            onClick={() => {
              onSelectCategory('Todo');
              onViewChange('catalog');
              setIsMobileMenuOpen(false);
            }}
            className="text-left py-2 border-b border-border/40 flex justify-between items-center"
          >
            <span>Shop All</span>
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Collapsible Mobile Categories */}
          <div>
            <button 
              onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
              className="w-full text-left py-2 border-b border-border/40 flex justify-between items-center"
            >
              <span>Categorías</span>
              <svg className={`w-4 h-4 text-muted transition-transform duration-300 ${isMobileCategoriesOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${isMobileCategoriesOpen ? 'max-h-60 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-3 pl-4 border-l border-border/60">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`text-left py-1 text-sm flex items-center justify-between ${
                      selectedCategory === cat && currentView === 'catalog' ? 'text-foreground font-medium' : 'text-muted'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && currentView === 'catalog' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="text-left py-2 border-b border-border/40 text-muted/60">About</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
