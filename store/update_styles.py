import re

with open('/Users/feli/Desktop/AntiGrav/FunStore/stratos/assets/application.css', 'r') as f:
    css = f.read()

# Palette
css = re.sub(
    r'  --color-base: #0A0A0C; /\* Deep Dark Background \*/\n  --color-text: #FFFFFF; /\* White Text \*/\n  --color-accent-1: #FE2C55; /\* TikTok Viral Pink \*/\n  --color-accent-2: #25F4EE; /\* TikTok Neon Cyan \*/\n  --color-accent-3: #FFDE00; /\* Urgency Yellow \*/\n  --color-white: #FFFFFF;\n  --color-black: #000000;\n  --color-card-bg: #1C1C1E; /\* Dark Card Background \*/',
    '  --color-base: #FAFAFC; /* Premium Light Background */\n  --color-text: #14141B; /* Graphite Text */\n  --color-accent-1: #FF0054; /* Vibrant Rose / Red */\n  --color-accent-2: #4361EE; /* Electric Blue */\n  --color-accent-3: #FFDE00; /* Urgency Yellow */\n  --color-white: #FFFFFF;\n  --color-black: #000000;\n  --color-card-bg: #FFFFFF; /* Pure White Card */',
    css
)

# .product-media-container
css = re.sub(
    r'\.product-media-container \{\n  position: relative;\n  overflow: hidden;\n  border-radius: var\(--radius-lg\);\n  background: var\(--color-card-bg\);\n  box-shadow: 0 4px 30px rgba\(0, 0, 0, 0\.5\);\n\}',
    '.product-media-container {\n  position: relative;\n  overflow: hidden;\n  border-radius: var(--radius-lg);\n  background: var(--color-card-bg);\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);\n}',
    css
)

# .product-media-thumbnail
css = re.sub(
    r'\.product-media-thumbnail \{\n  width: 100%;\n  aspect-ratio: 1 / 1;\n  border-radius: var\(--radius-md\);\n  overflow: hidden;\n  border: 2px solid transparent;\n  cursor: pointer;\n  background: var\(--color-card-bg\);\n  transition: border-color var\(--transition-fast\), opacity var\(--transition-fast\);\n  opacity: 0\.6;\n\}',
    '.product-media-thumbnail {\n  width: 100%;\n  aspect-ratio: 1 / 1;\n  border-radius: var(--radius-md);\n  overflow: hidden;\n  border: 2px solid transparent;\n  cursor: pointer;\n  background: var(--color-card-bg);\n  transition: border-color var(--transition-fast), opacity var(--transition-fast);\n  opacity: 0.6;\n}',
    css
)

# .live-toast
css = re.sub(
    r'\.live-toast \{\n  position: absolute;\n  bottom: 115%;\n  left: 0;\n  width: 260px;\n  background: rgba\(28, 28, 30, 0\.85\);\n  backdrop-filter: blur\(10px\);\n  border: 1px solid rgba\(255,255,255,0\.1\);\n  border-radius: var\(--radius-md\);\n  padding: var\(--spacing-sm\) var\(--spacing-md\);\n  box-shadow: 0 8px 32px rgba\(0,0,0,0\.5\);\n  display: flex;\n  align-items: center;\n  gap: var\(--spacing-sm\);\n  z-index: 20;\n  opacity: 0;\n  transform: translateY\(10px\);\n  transition: opacity var\(--transition-smooth\), transform var\(--transition-smooth\);\n  pointer-events: none;\n\}',
    '.live-toast {\n  position: absolute;\n  bottom: 115%;\n  left: 0;\n  width: 260px;\n  background: rgba(255, 255, 255, 0.85);\n  backdrop-filter: blur(10px);\n  border: 1px solid rgba(0,0,0,0.06);\n  border-radius: var(--radius-md);\n  padding: var(--spacing-sm) var(--spacing-md);\n  box-shadow: 0 10px 30px rgba(0,0,0,0.08);\n  display: flex;\n  align-items: center;\n  gap: var(--spacing-sm);\n  z-index: 20;\n  opacity: 0;\n  transform: translateY(10px);\n  transition: opacity var(--transition-smooth), transform var(--transition-smooth);\n  pointer-events: none;\n}',
    css
)

# .live-toast::after
css = re.sub(
    r'\.live-toast::after \{\n  content: \x27\x27;\n  position: absolute;\n  top: 100%;\n  left: var\(--spacing-lg\);\n  border-width: 6px;\n  border-style: solid;\n  border-color: rgba\(28, 28, 30, 0\.85\) transparent transparent transparent;\n\}',
    '.live-toast::after {\n  content: \'\';\n  position: absolute;\n  top: 100%;\n  left: var(--spacing-lg);\n  border-width: 6px;\n  border-style: solid;\n  border-color: rgba(255, 255, 255, 0.85) transparent transparent transparent;\n}',
    css
)

# .live-view-counter
css = re.sub(
    r'\.live-view-counter \{\n  display: inline-flex;\n  align-items: center;\n  gap: var\(--spacing-sm\);\n  padding: var\(--spacing-sm\) var\(--spacing-md\);\n  background: var\(--color-card-bg\);\n  border: 1px solid rgba\(255, 255, 255, 0\.1\);\n  border-radius: var\(--radius-md\);\n  font-size: 0\.825rem;\n  font-weight: 600;\n  margin: var\(--spacing-sm\) 0;\n  box-shadow: 0 4px 12px rgba\(0, 0, 0, 0\.3\);\n  align-self: flex-start;\n\}',
    '.live-view-counter {\n  display: inline-flex;\n  align-items: center;\n  gap: var(--spacing-sm);\n  padding: var(--spacing-sm) var(--spacing-md);\n  background: var(--color-card-bg);\n  border: 1px solid rgba(0, 0, 0, 0.06);\n  border-radius: var(--radius-md);\n  font-size: 0.825rem;\n  font-weight: 600;\n  margin: var(--spacing-sm) 0;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);\n  align-self: flex-start;\n}',
    css
)

# .swatch-label
css = re.sub(
    r'\.swatch-label \{\n  width: 32px;\n  height: 32px;\n  border-radius: var\(--radius-full\);\n  border: 2px solid var\(--color-white\);\n  outline: 2px solid transparent;\n  cursor: pointer;\n  transition: outline-color var\(--transition-fast\), transform var\(--transition-fast\);\n  box-shadow: inset 0 2px 4px rgba\(0,0,0,0\.15\);\n  display: inline-block;\n\}',
    '.swatch-label {\n  width: 32px;\n  height: 32px;\n  border-radius: var(--radius-full);\n  border: 2px solid var(--color-card-bg);\n  outline: 2px solid transparent;\n  cursor: pointer;\n  transition: outline-color var(--transition-fast), transform var(--transition-fast);\n  box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n  display: inline-block;\n}',
    css
)

# .chip-label
css = re.sub(
    r'\.chip-label \{\n  padding: var\(--spacing-sm\) var\(--spacing-md\);\n  border: 2px solid rgba\(255, 255, 255, 0\.1\);\n  border-radius: var\(--radius-md\);\n  font-size: 0\.825rem;\n  font-weight: 700;\n  cursor: pointer;\n  transition: all var\(--transition-fast\);\n  background: var\(--color-card-bg\);\n  min-width: 50px;\n  text-align: center;\n\}',
    '.chip-label {\n  padding: var(--spacing-sm) var(--spacing-md);\n  border: 1px solid rgba(0, 0, 0, 0.1);\n  border-radius: var(--radius-md);\n  font-size: 0.825rem;\n  font-weight: 700;\n  cursor: pointer;\n  transition: all var(--transition-fast);\n  background: var(--color-card-bg);\n  min-width: 50px;\n  text-align: center;\n}',
    css
)

# .btn--add-to-cart
css = re.sub(
    r'\.btn--add-to-cart \{\n  background-color: var\(--color-card-bg\);\n  color: var\(--color-white\);\n  border: 1px solid rgba\(255,255,255,0\.2\);\n  font-size: 1\.125rem;\n  font-weight: 800;\n  text-transform: uppercase;\n  padding: var\(--spacing-md\);\n  border-radius: var\(--radius-md\);\n  box-shadow: 0 4px 14px rgba\(0, 0, 0, 0\.3\);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: var\(--spacing-sm\);\n\}',
    '.btn--add-to-cart {\n  background-color: var(--color-card-bg);\n  color: var(--color-text);\n  border: 1px solid rgba(0,0,0,0.1);\n  font-size: 1.125rem;\n  font-weight: 800;\n  text-transform: uppercase;\n  padding: var(--spacing-md);\n  border-radius: var(--radius-full);\n  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: var(--spacing-sm);\n}',
    css
)

# .btn--buy-now & keyframes pulse-button
css = re.sub(
    r'\.btn--buy-now \{\n  background-color: var\(--color-accent-1\);\n  color: var\(--color-white\);\n  font-size: 1\.125rem;\n  font-weight: 800;\n  text-transform: uppercase;\n  padding: var\(--spacing-md\);\n  border-radius: var\(--radius-md\);\n  box-shadow: 0 0 20px rgba\(254, 44, 85, 0\.5\);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  animation: pulse-button 2s infinite;\n\}\n\n@keyframes pulse-button \{\n  0% \{ transform: scale\(1\); box-shadow: 0 0 20px rgba\(254, 44, 85, 0\.5\); \}\n  50% \{ transform: scale\(1\.02\); box-shadow: 0 0 30px rgba\(254, 44, 85, 0\.8\); \}\n  100% \{ transform: scale\(1\); box-shadow: 0 0 20px rgba\(254, 44, 85, 0\.5\); \}\n\}',
    '.btn--buy-now {\n  background-color: var(--color-accent-1);\n  color: var(--color-white);\n  font-size: 1.125rem;\n  font-weight: 800;\n  text-transform: uppercase;\n  padding: var(--spacing-md);\n  border-radius: var(--radius-full);\n  box-shadow: 0 8px 20px rgba(255, 0, 84, 0.25);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: transform var(--transition-smooth), box-shadow var(--transition-smooth);\n}\n\n.btn--buy-now:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 12px 24px rgba(255, 0, 84, 0.35);\n}',
    css
)

# product accordions
css = re.sub(
    r'\.product-accordions \{\n  margin-top: var\(--spacing-xl\);\n  border-top: 1px solid rgba\(255,255,255,0\.1\);\n\}\n\n\.accordion-item \{\n  border-bottom: 1px solid rgba\(255,255,255,0\.1\);\n\}',
    '.product-accordions {\n  margin-top: var(--spacing-xl);\n  border-top: 1px solid rgba(0,0,0,0.06);\n}\n\n.accordion-item {\n  border-bottom: 1px solid rgba(0,0,0,0.06);\n}',
    css
)

# .fbt-box
css = re.sub(
    r'\.fbt-box \{\n  background: var\(--color-card-bg\);\n  border: 1px solid rgba\(255,255,255,0\.1\);\n  border-radius: var\(--radius-lg\);\n  padding: var\(--spacing-lg\);\n  box-shadow: 0 8px 32px rgba\(0,0,0,0\.3\);\n\}',
    '.fbt-box {\n  background: var(--color-card-bg);\n  border: 1px solid rgba(0,0,0,0.06);\n  border-radius: var(--radius-lg);\n  padding: var(--spacing-lg);\n  box-shadow: 0 10px 40px rgba(0,0,0,0.04);\n}',
    css
)

# .fbt-product-thumb
css = re.sub(
    r'\.fbt-product-thumb \{\n  width: 80px;\n  height: 80px;\n  border-radius: var\(--radius-md\);\n  overflow: hidden;\n  background: #2a2a2c;\n  border: 1px solid rgba\(255,255,255,0\.1\);\n\}',
    '.fbt-product-thumb {\n  width: 80px;\n  height: 80px;\n  border-radius: var(--radius-md);\n  overflow: hidden;\n  background: #f4f4f4;\n  border: 1px solid rgba(0,0,0,0.06);\n}',
    css
)

# .fbt-action-row
css = re.sub(
    r'\.fbt-action-row \{\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var\(--spacing-md\);\n  border-top: 1px solid rgba\(255,255,255,0\.1\);\n  padding-top: var\(--spacing-md\);\n\}',
    '.fbt-action-row {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: var(--spacing-md);\n  border-top: 1px solid rgba(0,0,0,0.06);\n  padding-top: var(--spacing-md);\n}',
    css
)

# .btn--fbt-add
css = re.sub(
    r'\.btn--fbt-add \{\n  background-color: var\(--color-accent-2\);\n  color: var\(--color-black\);\n  font-weight: 800;\n  font-size: 0\.95rem;\n  padding: var\(--spacing-sm\) var\(--spacing-xl\);\n  border-radius: var\(--radius-full\);\n  box-shadow: 0 4px 14px rgba\(37, 244, 238, 0\.4\);\n\}',
    '.btn--fbt-add {\n  background-color: var(--color-accent-2);\n  color: var(--color-white);\n  font-weight: 800;\n  font-size: 0.95rem;\n  padding: var(--spacing-sm) var(--spacing-xl);\n  border-radius: var(--radius-full);\n  box-shadow: 0 4px 14px rgba(67, 97, 238, 0.3);\n  transition: transform var(--transition-smooth);\n}\n.btn--fbt-add:hover {\n  transform: translateY(-2px);\n}',
    css
)

# .review-card
css = re.sub(
    r'\.review-card \{\n  background: var\(--color-card-bg\);\n  border: 1px solid rgba\(255,255,255,0\.1\);\n  border-radius: var\(--radius-lg\);\n  padding: var\(--spacing-lg\);\n  display: flex;\n  flex-direction: column;\n  gap: var\(--spacing-sm\);\n  box-shadow: 0 8px 32px rgba\(0,0,0,0\.3\);\n\}',
    '.review-card {\n  background: var(--color-card-bg);\n  border: 1px solid rgba(0,0,0,0.04);\n  border-radius: var(--radius-lg);\n  padding: var(--spacing-lg);\n  display: flex;\n  flex-direction: column;\n  gap: var(--spacing-sm);\n  box-shadow: 0 10px 30px rgba(0,0,0,0.04);\n}',
    css
)

# .review-card__user
css = re.sub(
    r'\.review-card__user \{\n  display: flex;\n  align-items: center;\n  gap: var\(--spacing-sm\);\n  margin-top: var\(--spacing-sm\);\n  border-top: 1px solid rgba\(255,255,255,0\.1\);\n  padding-top: var\(--spacing-sm\);\n\}',
    '.review-card__user {\n  display: flex;\n  align-items: center;\n  gap: var(--spacing-sm);\n  margin-top: var(--spacing-sm);\n  border-top: 1px solid rgba(0,0,0,0.06);\n  padding-top: var(--spacing-sm);\n}',
    css
)

# .product-card
css = re.sub(
    r'\.product-card \{\n  position: relative;\n  background: var\(--color-card-bg\);\n  border-radius: var\(--radius-lg\);\n  overflow: hidden;\n  border: 1px solid rgba\(255, 255, 255, 0\.05\);\n  box-shadow: 0 4px 20px rgba\(0, 0, 0, 0\.3\);\n  transition: transform var\(--transition-smooth\), box-shadow var\(--transition-smooth\), border-color var\(--transition-smooth\);\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n\}\n\.product-card:hover \{\n  transform: translateY\(-6px\);\n  box-shadow: 0 12px 30px rgba\(0, 0, 0, 0\.5\), 0 0 15px rgba\(37, 244, 238, 0\.15\);\n  border-color: rgba\(37, 244, 238, 0\.3\);\n\}\n\.product-card__image-wrapper \{\n  position: relative;\n  aspect-ratio: 4/5;\n  background: #111;\n  overflow: hidden;\n\}',
    '.product-card {\n  position: relative;\n  background: var(--color-card-bg);\n  border-radius: var(--radius-lg);\n  overflow: hidden;\n  border: 1px solid rgba(0, 0, 0, 0.04);\n  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);\n  transition: transform var(--transition-smooth), box-shadow var(--transition-smooth), border-color var(--transition-smooth);\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n}\n.product-card:hover {\n  transform: translateY(-6px);\n  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);\n  border-color: rgba(0, 0, 0, 0.08);\n}\n.product-card__image-wrapper {\n  position: relative;\n  aspect-ratio: 4/5;\n  background: #f8f8f8;\n  overflow: hidden;\n}',
    css
)

# .quick-add-btn hover and disabled
css = re.sub(
    r'\.quick-add-btn:hover \{\n  background: var\(--color-accent-1\);\n  color: var\(--color-white\);\n  border-color: var\(--color-accent-1\);\n  transform: translateY\(-1px\);\n  box-shadow: 0 0 15px rgba\(254, 44, 85, 0\.4\);\n\}\n\.quick-add-btn:disabled \{\n  opacity: 0\.6;\n  cursor: not-allowed;\n  background: rgba\(255, 255, 255, 0\.05\);\n  border-color: rgba\(255, 255, 255, 0\.1\);\n  color: rgba\(255, 255, 255, 0\.3\);\n  transform: none;\n  box-shadow: none;\n\}',
    '.quick-add-btn:hover {\n  background: var(--color-accent-1);\n  color: var(--color-white);\n  border-color: var(--color-accent-1);\n  transform: translateY(-1px);\n  box-shadow: 0 6px 16px rgba(255, 0, 84, 0.25);\n}\n.quick-add-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n  background: #f4f4f4;\n  border-color: #ddd;\n  color: #aaa;\n  transform: none;\n  box-shadow: none;\n}',
    css
)

with open('/Users/feli/Desktop/AntiGrav/FunStore/stratos/assets/application.css', 'w') as f:
    f.write(css)

print("Done")
