import React, { useState } from 'react';
import Header from './components/Header';
import { mockProducts } from './mockProducts';

// Placeholder components for the views to satisfy modularity constraint
const Landing = ({ onViewChange }) => (
  <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen pb-24">
    <div className="mb-24">
      <h1 className="text-5xl md:text-7xl font-light tracking-tighter mb-6">Productos virales. <br/>Precios increíbles.</h1>
      <button 
        onClick={() => onViewChange('catalog')}
        className="px-8 py-4 bg-foreground text-background text-sm font-medium rounded-sm hover:bg-foreground/90 transition-all duration-300"
      >
        Ver Colección
      </button>
    </div>
    
    <div className="mb-8 flex justify-between items-end">
      <h2 className="text-2xl font-light">Tendencias de hoy</h2>
      <button 
        onClick={() => onViewChange('catalog')}
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        Ver todo &rarr;
      </button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
      {mockProducts.slice(0, 4).map(product => (
        <div key={product.id} className="group cursor-pointer" onClick={() => onViewChange('product', product.id)}>
          <div className="aspect-[4/5] overflow-hidden bg-white mb-4 rounded-sm">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium pr-4">{product.name}</h3>
            <span className="text-sm font-semibold">${product.price.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted mt-1">{product.category}</p>
        </div>
      ))}
    </div>
  </div>
);

const Catalog = ({ onViewChange, selectedCategory, onSelectCategory }) => {
  const categories = ['Todo', ...new Set(mockProducts.map(p => p.category))];
  const filteredProducts = selectedCategory && selectedCategory !== 'Todo'
    ? mockProducts.filter(product => product.category === selectedCategory)
    : mockProducts;

  return (
    <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-3xl font-light">Catálogo</h2>
        <div className="flex gap-4 text-sm text-muted flex-wrap">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`hover:text-foreground transition-colors duration-300 ${
                selectedCategory === cat 
                  ? 'text-foreground font-medium underline underline-offset-4' 
                  : 'text-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {filteredProducts.map(product => (
          <div key={product.id} className="group cursor-pointer" onClick={() => onViewChange('product', product.id)}>
            <div className="aspect-[4/5] overflow-hidden bg-white mb-4">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">{product.name}</h3>
              <span className="text-sm text-muted">${product.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductDetail = ({ productId, onViewChange, addToCart }) => {
  const product = mockProducts.find(p => p.id === productId);
  if (!product) return null;

  return (
    <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row gap-16">
      <div className="md:w-1/2">
        <div className="aspect-[4/5] overflow-hidden bg-white">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="md:w-1/2 flex flex-col justify-center py-12">
        <div className="flex items-center gap-2 mb-2 text-sm text-yellow-500">
          {'★'.repeat(Math.floor(product.rating || 5))}
          <span className="text-muted ml-1">({product.reviewsCount} reseñas verificadas)</span>
        </div>
        <h1 className="text-4xl font-light tracking-tight mb-4">{product.name}</h1>
        <div className="flex items-end gap-3 mb-4">
          <p className="text-3xl text-red-500 font-medium">${product.price.toFixed(2)}</p>
          {product.originalPrice && (
            <>
              <p className="text-lg text-muted line-through mb-1">${product.originalPrice.toFixed(2)}</p>
              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 font-bold rounded-sm mb-1 ml-2">Ahorras ${(product.originalPrice - product.price).toFixed(2)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mb-8 bg-red-50 text-red-600 py-2 px-3 rounded-sm text-sm font-medium w-fit border border-red-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          {product.scarcityText} - ¡{product.recentSales} vendidos hoy!
        </div>
        <p className="text-muted leading-relaxed mb-6">{product.description}</p>
        
        <ul className="mb-8 space-y-2 text-sm">
          {product.features?.map((f, i) => (
             <li key={i} className="flex items-center gap-2">
               <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               {f}
             </li>
          ))}
        </ul>
        
        <div className="mb-8">
          <span className="block text-sm font-medium mb-3">Selecciona una variante</span>
          <div className="flex gap-3">
            <button className="w-8 h-8 rounded-full bg-[#E8E6E1] ring-2 ring-border ring-offset-2 ring-offset-background transition-all"></button>
            <button className="w-8 h-8 rounded-full bg-[#3A3A3A] transition-all hover:scale-110"></button>
            <button className="w-8 h-8 rounded-full bg-[#8C7A6B] transition-all hover:scale-110"></button>
          </div>
        </div>

        <button 
          onClick={() => addToCart(product)}
          className="px-8 py-4 bg-foreground text-background text-sm font-bold rounded-sm hover:bg-foreground/90 transition-all duration-300 w-full md:w-auto shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:scale-[1.02]"
        >
          Añadir al Carrito - Envío Gratis
        </button>
        
        {/* Fake Trust Badges */}
        <div className="mt-6 flex flex-wrap gap-4 text-muted text-xs items-center justify-center md:justify-start bg-gray-50 p-3 rounded-sm border border-border">
          <div className="flex items-center gap-1">🔒 Pago Seguro</div>
          <div className="flex items-center gap-1">🚚 Envío Rápido</div>
          <div className="flex items-center gap-1">↩️ Garantía 30 días</div>
        </div>

        <button 
          onClick={() => onViewChange('catalog')}
          className="mt-8 text-sm text-muted hover:text-foreground transition-colors duration-300 text-left inline-block"
        >
          &larr; Volver al Catálogo
        </button>
      </div>
    </div>
  );
};

const Checkout = ({ cart, total }) => (
  <div className="pt-32 px-6 max-w-3xl mx-auto min-h-screen pb-20">
    <h2 className="text-3xl font-light mb-12">Pagar</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
      <div>
        <h3 className="text-lg font-medium mb-6">Detalles de envío</h3>
        <form className="flex flex-col gap-4">
          <input type="text" placeholder="Nombre completo" className="w-full border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
          <input type="email" placeholder="Correo electrónico" className="w-full border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
          <input type="text" placeholder="Dirección de envío" className="w-full border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
          <div className="flex gap-4">
            <input type="text" placeholder="Ciudad" className="w-1/2 border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
            <input type="text" placeholder="Código Postal" className="w-1/2 border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
          </div>
        </form>

        <h3 className="text-lg font-medium mt-12 mb-6">Pago</h3>
        <div className="p-4 border border-border rounded-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium">Tarjeta de Crédito</span>
            <div className="flex gap-2">
              <div className="w-8 h-5 bg-border rounded-sm"></div>
              <div className="w-8 h-5 bg-border rounded-sm"></div>
            </div>
          </div>
          <input type="text" placeholder="Número de Tarjeta" className="w-full border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors mb-4" />
          <div className="flex gap-4">
            <input type="text" placeholder="MM/AA" className="w-1/2 border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
            <input type="text" placeholder="CVC" className="w-1/2 border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 border border-border rounded-sm">
        <h3 className="text-lg font-medium mb-6">Resumen del pedido</h3>
        <div className="flex flex-col gap-4 mb-6">
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-muted">{item.name} x {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 border-t border-border pt-6 mb-6">
          <input type="text" placeholder="Código de descuento" className="flex-1 border-b border-border bg-transparent pb-2 outline-none focus:border-foreground transition-colors text-sm" />
          <button className="text-sm font-medium">Aplicar</button>
        </div>

        <div className="border-t border-border pt-6 mb-6 text-sm">
          <div className="flex justify-between mb-2"><span className="text-muted">Subtotal</span><span>${total.toFixed(2)}</span></div>
          <div className="flex justify-between mb-2"><span className="text-muted">Envío</span><span>Gratis</span></div>
        </div>

        <div className="flex justify-between items-center border-t border-border pt-6 mb-8">
          <span className="font-medium text-lg">Total</span>
          <span className="font-medium text-lg">${total.toFixed(2)}</span>
        </div>

        <button className="px-8 py-4 bg-foreground text-background text-sm font-medium rounded-sm hover:bg-foreground/90 transition-all duration-300 w-full">
          Pagar ${total.toFixed(2)}
        </button>
      </div>
    </div>
  </div>
);

// Simple Cart Drawer placeholder
const CartDrawer = ({ isOpen, onClose, cart, total, onViewChange }) => {
  if (!isOpen) return null;
  
  const progressToFreeShipping = Math.min((total / 50) * 100, 100);
  const amountToFreeShipping = Math.max(50 - total, 0);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background h-full shadow-2xl flex flex-col transform transition-transform duration-500 ease-out">
        <div className="p-6 border-b border-border flex justify-between items-center bg-white/50 backdrop-blur-md">
          <h2 className="text-lg font-medium">Tu Carrito</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            Cerrar
          </button>
        </div>
        
        {cart.length > 0 && (
          <div className="p-6 border-b border-border bg-background">
            <div className="flex justify-center text-sm font-medium mb-3">
              {amountToFreeShipping === 0 
                ? <span className="text-green-600 flex items-center gap-1">✨ ¡Tienes ENVÍO GRATIS! ✨</span> 
                : <span>Te faltan <strong className="text-red-500">${amountToFreeShipping.toFixed(2)}</strong> para ENVÍO GRATIS</span>}
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out ${amountToFreeShipping === 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-foreground'}`} 
                style={{ width: `${progressToFreeShipping}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <p className="text-muted text-sm text-center mt-12">Tu carrito está vacío.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {cart.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-24 h-32 bg-white overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-sm font-medium">{item.name}</h3>
                    <p className="text-sm text-muted mt-1">${item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-xs text-muted">Cant: {item.quantity}</span>
                      <button className="text-xs text-muted hover:text-foreground underline transition-colors">Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-border bg-white">
          <div className="flex justify-between mb-6">
            <span className="font-medium">Subtotal</span>
            <span className="font-medium">${total.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => {
              onClose();
              onViewChange('checkout');
            }}
            disabled={cart.length === 0}
            className="w-full px-8 py-4 bg-foreground text-background text-sm font-medium rounded-sm hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-[1.02]"
          >
            Pagar
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('landing'); // landing, catalog, product, checkout
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todo');

  const categories = ['Todo', ...new Set(mockProducts.map(p => p.category))];

  const handleViewChange = (view, productId = null) => {
    setCurrentView(view);
    if (productId) setSelectedProductId(productId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen relative selection:bg-muted/20 selection:text-foreground overflow-x-hidden">
      <Header 
        cartCount={cartCount} 
        onOpenCart={() => setIsCartOpen(true)} 
        onViewChange={handleViewChange}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        currentView={currentView}
      />
      
      <main>
        {currentView === 'landing' && <Landing onViewChange={handleViewChange} />}
        {currentView === 'catalog' && (
          <Catalog 
            onViewChange={handleViewChange} 
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}
        {currentView === 'product' && <ProductDetail productId={selectedProductId} onViewChange={handleViewChange} addToCart={addToCart} />}
        {currentView === 'checkout' && <Checkout cart={cart} total={cartTotal} />}
      </main>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart} 
        total={cartTotal}
        onViewChange={handleViewChange}
      />
    </div>
  );
}

export default App;
