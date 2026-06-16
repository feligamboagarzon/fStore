/* Stratos Theme - Vanilla JS Setup */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Stratos theme loaded');
  
  // Initialize generic components
  initStickyHeader();
  initMobileMenu();
  initProductAccordions();
  initLivePurchaseToast();
  initLiveViewersCount();
  initProductGallery();
  initFrequentlyBoughtTogether();
});

function initMobileMenu() {
  const openBtn = document.getElementById('mobile-menu-open');
  const closeBtn = document.getElementById('mobile-menu-close');
  const overlay = document.getElementById('mobile-menu-overlay');
  const menu = document.getElementById('mobile-menu');
  if (!openBtn || !menu) return;

  const open = () => {
    menu.classList.add('is-open');
    overlay.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    menu.classList.remove('is-open');
    overlay.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
  // Close when a link is tapped
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
}

function initStickyHeader() {
  const header = document.querySelector('header');
  if (!header) return;
  
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll <= 0) {
      header.classList.remove('is-scrolled');
      return;
    }
    
    if (currentScroll > lastScroll && !header.classList.contains('is-scrolling-down')) {
      // scroll down
      header.classList.remove('is-scrolling-up');
      header.classList.add('is-scrolling-down');
    } else if (currentScroll < lastScroll && header.classList.contains('is-scrolling-down')) {
      // scroll up
      header.classList.remove('is-scrolling-down');
      header.classList.add('is-scrolling-up');
    }
    header.classList.add('is-scrolled');
    lastScroll = currentScroll;
  });
}

function initProductAccordions() {
  const accordions = document.querySelectorAll('.accordion-header');
  accordions.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const content = item.querySelector('.accordion-content');
      
      const isOpen = item.classList.contains('is-open');
      
      // Close all other accordions (gives a cleaner, focused look)
      document.querySelectorAll('.accordion-item').forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('is-open');
          const otherContent = otherItem.querySelector('.accordion-content');
          if (otherContent) otherContent.style.maxHeight = null;
        }
      });
      
      if (isOpen) {
        item.classList.remove('is-open');
        content.style.maxHeight = null;
      } else {
        item.classList.add('is-open');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}

function initLivePurchaseToast() {
  const toast = document.querySelector('.live-toast');
  if (!toast) return;
  
  const names = ['Alex', 'Emma', 'Jacob', 'Sophia', 'Olivia', 'Daniel', 'Michael', 'Chloe', 'Zoe', 'Mason', 'Isabella', 'Liam'];
  const locations = ['Los Angeles', 'New York', 'London', 'Miami', 'Berlin', 'Sydney', 'Toronto', 'Chicago', 'Houston', 'Paris', 'Tokyo'];
  const times = ['just now', '1 min ago', '2 mins ago', '3 mins ago', '5 mins ago'];
  
  function updateToast() {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomTime = times[Math.floor(Math.random() * times.length)];
    
    const avatar = toast.querySelector('.live-toast__avatar');
    const text = toast.querySelector('.live-toast__text');
    
    if (avatar) avatar.textContent = randomName.charAt(0);
    if (text) {
      text.innerHTML = `<strong>${randomName}</strong> from <strong>${randomLoc}</strong><br>just purchased ${randomTime}!`;
    }
  }
  
  // Initially show toast after 4 seconds
  setTimeout(() => {
    updateToast();
    toast.classList.add('is-visible');
    
    // Hide toast after 6 seconds
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 6000);
  }, 4000);
  
  // Show toast every 25 seconds
  setInterval(() => {
    updateToast();
    toast.classList.add('is-visible');
    
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 6000);
  }, 25000);
}

function initLiveViewersCount() {
  const countSpan = document.querySelector('.live-view-counter span');
  if (!countSpan) return;
  
  setInterval(() => {
    let current = parseInt(countSpan.textContent) || 120;
    // Fluctuate by +/- 1 to 4
    const diff = Math.floor(Math.random() * 9) - 4; // -4 to +4
    let next = current + diff;
    if (next < 80) next = 80;
    if (next > 220) next = 220;
    countSpan.textContent = next;
  }, 4000);
}

function initProductGallery() {
  const track = document.querySelector('.product-media-track');
  const thumbnails = document.querySelectorAll('.product-media-thumbnail');
  if (!track || thumbnails.length === 0) return;
  
  // Click on thumbnail scrolls track
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
      thumbnails.forEach(t => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
      
      const width = track.offsetWidth;
      track.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
    });
  });
  
  // Scroll on track updates active thumbnail
  track.addEventListener('scroll', () => {
    const index = Math.round(track.scrollLeft / track.offsetWidth);
    if (thumbnails[index] && !thumbnails[index].classList.contains('is-active')) {
      thumbnails.forEach(t => t.classList.remove('is-active'));
      thumbnails[index].classList.add('is-active');
    }
  });
}

function initFrequentlyBoughtTogether() {
  const fbtBox = document.querySelector('.fbt-box');
  if (!fbtBox) return;
  
  const checkboxes = fbtBox.querySelectorAll('.fbt-checkbox-input');
  const totalPriceSpan = fbtBox.querySelector('.fbt-total-price');
  const addBundleBtn = fbtBox.querySelector('.btn--fbt-add');
  
  function updateBundleTotal() {
    let totalCents = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) {
        totalCents += parseInt(cb.dataset.price);
      }
    });
    // Format money
    if (totalPriceSpan) {
      totalPriceSpan.textContent = '$' + (totalCents / 100).toFixed(2);
    }
  }
  
  checkboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      // Toggle image opacity based on checkbox
      const index = cb.dataset.index;
      const thumb = fbtBox.querySelector(`.fbt-product-thumb[data-index="${index}"]`);
      if (thumb) {
        thumb.style.opacity = cb.checked ? '1' : '0.3';
      }
      updateBundleTotal();
    });
  });
  
  if (addBundleBtn) {
    addBundleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const itemsToEnqueue = [];
      checkboxes.forEach(cb => {
        if (cb.checked) {
          itemsToEnqueue.push({
            id: parseInt(cb.value),
            quantity: 1
          });
        }
      });
      
      if (itemsToEnqueue.length === 0) return;
      
      addBundleBtn.disabled = true;
      addBundleBtn.textContent = 'Adding Bundle...';
      
      // Add multiple items to Shopify cart in one call using Shopify AJAX API
      const rootPath = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      fetch(rootPath + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: itemsToEnqueue
        })
      })
      .then(response => {
        return response.json().then(data => {
          if (!response.ok) {
            throw new Error(data.description || data.message || 'Error adding bundle');
          }
          return data;
        });
      })
      .then(data => {
        // Dispatch open cart drawer event
        document.dispatchEvent(new CustomEvent('cart:open'));
        addBundleBtn.textContent = 'Added to Cart!';
        
        // Reload after a delay to show cart item updates
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      })
      .catch(err => {
        console.error('Error adding bundle:', err);
        alert(err.message || 'Failed to add bundle to cart.');
        addBundleBtn.disabled = false;
        addBundleBtn.textContent = 'Add Bundle';
      });
    });
  }
}

