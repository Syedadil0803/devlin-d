/**
 * ============================================
 * Campaign Widgets - Standalone JS
 * 
 * Usage: 
 *   1. Include campaign-widgets.css in <head>
 *   2. Include this script at end of <body>
 *   3. It auto-fetches config & renders widgets
 * 
 * Config URL can be overridden:
 *   window.CW_CONFIG_URL = 'https://your-url.com/config.json';
 * ============================================
 */

(function () {
  'use strict';

  // ---- Configuration ----
  const CONFIG_URL = window.CW_CONFIG_URL || 'https://cdn.aairavx.com/campaign-config.json';
  const MARQUEE_SPEED = 60; // pixels per second

  // ---- Utility Functions ----

  /**
   * Check if a campaign is within its scheduled date range
   */
  function isWithinDateRange(startDate, endDate) {
    if (!startDate && !endDate) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      if (today < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      if (today > end) return false;
    }
    return true;
  }

  /**
   * Check if a campaign should be shown (active flag + date range)
   */
  function shouldShow(config) {
    if (!config || !config.active) return false;
    return isWithinDateRange(config.startDate, config.endDate);
  }

  /**
   * Create an HTML element with attributes and children
   */
  function createElement(tag, attrs, children) {
    const el = document.createElement(tag);
    var hasInnerHTML = false;

    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') {
          el.className = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
          Object.assign(el.style, attrs[key]);
        } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
          el.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
        } else if (key === 'innerHTML') {
          el.innerHTML = attrs[key];
          hasInnerHTML = true;
        } else {
          el.setAttribute(key, attrs[key]);
        }
      });
    }

    // Only set children if innerHTML was not already set (innerHTML takes priority)
    if (children && !hasInnerHTML) {
      if (typeof children === 'string') {
        el.textContent = children;
      } else if (Array.isArray(children)) {
        children.forEach(function (child) {
          if (child) el.appendChild(child);
        });
      } else if (children instanceof Node) {
        el.appendChild(children);
      }
    }

    return el;
  }

  // ---- Helper function for HTML sanitization ----
  
  function sanitizeHTML(html) {
    // Create a temporary element to parse HTML
    var temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Allow only safe tags and attributes
    var allowedTags = ['span', 'strong', 'em', 'b', 'i', 'u', 'br'];
    var allowedAttributes = ['style', 'class'];
    var allowedStyles = ['font-size', 'color', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'line-height'];
    
    function sanitizeNode(node) {
      if (node.nodeType === 3) return node; // Text node - safe
      
      if (node.nodeType === 1) { // Element node
        var tagName = node.tagName.toLowerCase();
        
        // Remove disallowed tags
        if (allowedTags.indexOf(tagName) === -1) {
          var textNode = document.createTextNode(node.textContent);
          node.parentNode.replaceChild(textNode, node);
          return textNode;
        }
        
        // Sanitize attributes
        var attrs = Array.from(node.attributes);
        attrs.forEach(function(attr) {
          if (allowedAttributes.indexOf(attr.name) === -1) {
            node.removeAttribute(attr.name);
          } else if (attr.name === 'style') {
            // Sanitize inline styles and preserve them
            var styles = attr.value.split(';').filter(function(style) {
              if (!style.trim()) return false;
              var prop = style.split(':')[0].trim();
              return allowedStyles.indexOf(prop) !== -1;
            }).join(';');
            // Ensure styles end with semicolon for proper parsing
            if (styles && !styles.endsWith(';')) styles += ';';
            node.setAttribute('style', styles);
          }
        });
        
        // Recursively sanitize children
        Array.from(node.childNodes).forEach(sanitizeNode);
      }
      
      return node;
    }
    
    Array.from(temp.childNodes).forEach(sanitizeNode);
    return temp.innerHTML;
  }

  // ---- Helper function for background styles ----
  
  function getBackgroundStyle(background) {
    if (!background) return '#dc2626';
    
    if (background.type === 'radial') {
      return 'radial-gradient(circle, ' + background.startColor + ', ' + background.endColor + ')';
    } else if (background.type === 'linear') {
      var direction = background.direction || '90deg';
      var midpoint = background.midpoint || 50;
      return 'linear-gradient(' + direction + ', ' + background.startColor + ' ' + midpoint + '%, ' + background.endColor + ')';
    } else if (background.type === 'solid') {
      return background.startColor;
    }
    return background.startColor || '#dc2626';
  }

  // ---- Announcement Bar (Marquee Ticker) ----

  function renderAnnouncementBar(config) {
    if (!shouldShow(config)) return;

    var announcements = config.announcements;
    if (!announcements || announcements.length === 0) return;

    var style = config.style || {};

    // Build the bar
    var bar = createElement('div', {
      className: 'cw-announcement-bar',
      id: 'cw-announcement-bar',
      style: {
        background: getBackgroundStyle(style.background) || '#dc2626',
        color: style.textColor || '#ffffff',
      },
    });

    // Track (continuous scrolling container)
    var track = createElement('div', {
      className: 'cw-announcement-bar__track',
    });

    // Build one set of announcement items
    function buildAnnouncementSet() {
      var fragment = document.createDocumentFragment();
      announcements.forEach(function (announcement) {
        // Handle both old string format and new object format
        var text = typeof announcement === 'string' ? announcement : announcement.text;
        var url = typeof announcement === 'object' && announcement.url ? announcement.url : null;
        // Auto-detect rich text if it contains HTML tags, or use explicit richText flag
        var isRichText = typeof announcement === 'object' && 
                        (announcement.richText === true || /<[^>]+>/.test(text));

        var tag = url ? 'a' : 'span';
        var attrs = { className: 'cw-announcement-bar__item' };

        if (url) {
          attrs.className += ' cw-announcement-link';
          attrs.href = url;
          attrs.style = { textDecoration: 'underline', color: 'inherit' };
        }

        // Rich text: sanitize and render HTML via innerHTML; plain text: safe textContent via children
        if (isRichText) {
          attrs.innerHTML = sanitizeHTML(text);
          fragment.appendChild(createElement(tag, attrs));
        } else {
          fragment.appendChild(createElement(tag, attrs, text));
        }
      });
      return fragment;
    }

    // Duplicate the content for seamless infinite scroll
    // We need at least 2 copies so when one scrolls off, the other takes over
    track.appendChild(buildAnnouncementSet());
    track.appendChild(buildAnnouncementSet());

    bar.appendChild(track);

    // Insert into page
    document.body.prepend(bar);

    // Bar height is fixed at 40px via CSS — use constant instead of measuring
    var BAR_HEIGHT = 40;

    requestAnimationFrame(function () {
      var halfWidth = track.scrollWidth / 2;
      var duration = halfWidth / MARQUEE_SPEED;
      bar.style.setProperty('--cw-marquee-duration', duration + 's');

      document.body.style.setProperty('--cw-bar-height', BAR_HEIGHT + 'px');
      document.body.classList.add('cw-has-announcement-bar');

      // Throttle scroll handler for better performance
      var scrollTimeout = null;
      var lastScrollY = 0;
      
      function updateBarOffset() {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY !== lastScrollY) {
          var visibleBarHeight = Math.max(0, BAR_HEIGHT - scrollY);
          document.body.style.setProperty('--cw-bar-height', visibleBarHeight + 'px');
          lastScrollY = scrollY;
        }
      }
      
      // Adjust navbar offset as bar scrolls out of view (throttled)
      window.addEventListener('scroll', function () {
        if (!scrollTimeout) {
          scrollTimeout = setTimeout(function() {
            updateBarOffset();
            scrollTimeout = null;
          }, 16); // ~60fps
        }
      }, { passive: true });
    });
  }

  // ---- Promo Card ----

  function renderPromoCard(config) {
    if (!shouldShow(config)) return;

    const style = config.style || {};
    const position = style.position || 'bottom-right';
    
    // Timer interval reference for cleanup (declare at function scope)
    var timerInterval = null;

    // Build the card
    const card = createElement('div', {
      className: 'cw-promo-card cw-promo-card--' + position,
      id: 'cw-promo-card',
      style: {
        background: getBackgroundStyle(style.background) || '#1f2937',
        color: style.textColor || '#ffffff',
      },
    });

    // Shimmer effect
    card.appendChild(createElement('div', { className: 'cw-promo-card__shimmer' }));

    // Close button
    const closeBtn = createElement('button', {
      className: 'cw-promo-card__close',
      'aria-label': 'Close promotional card',
      innerHTML: '&times;',
      onClick: function () {
        // Cleanup timer if exists
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        // Animate out and remove
        card.classList.add('cw-closing');
        setTimeout(function () {
          card.remove();
        }, 350);
      },
    });
    card.appendChild(closeBtn);

    // Title with individual styling
    if (config.title) {
      const titleStyle = style.titleStyle || {};
      const titleElement = createElement('div', {
        className: 'cw-promo-card__title',
        style: {
          background: getBackgroundStyle(titleStyle.background) || 'transparent',
          color: titleStyle.textColor || style.textColor || '#ffffff',
          textAlign: titleStyle.textAlign || 'left',
          fontWeight: titleStyle.fontWeight || '600',
        },
      });
      titleElement.innerHTML = sanitizeHTML(config.title);
      card.appendChild(titleElement);
    }

    // Subtitle with individual styling
    if (config.subtitle) {
      const subheadingStyle = style.subheadingStyle || {};
      const subtitleElement = createElement('div', {
        className: 'cw-promo-card__subtitle',
        style: {
          background: getBackgroundStyle(subheadingStyle.background) || 'transparent',
          color: subheadingStyle.textColor || style.textColor || '#ffffff',
          textAlign: subheadingStyle.textAlign || 'left',
          fontWeight: subheadingStyle.fontWeight || '500',
        },
      });
      subtitleElement.innerHTML = sanitizeHTML(config.subtitle);
      card.appendChild(subtitleElement);
    }

    // Description with individual styling
    if (config.description) {
      const descriptionStyle = style.descriptionStyle || {};
      const descriptionElement = createElement('div', {
        className: 'cw-promo-card__description',
        style: {
          background: getBackgroundStyle(descriptionStyle.background) || 'transparent',
          color: descriptionStyle.textColor || style.textColor || '#ffffff',
          textAlign: descriptionStyle.textAlign || 'left',
          fontWeight: descriptionStyle.fontWeight || '400',
        },
      });
      descriptionElement.innerHTML = sanitizeHTML(config.description);
      card.appendChild(descriptionElement);
    }

    // Timer
    if (config.showTimer && config.timerText) {
      const timerContainer = createElement('div', {
        className: 'cw-promo-card__timer',
        style: {
          background: getBackgroundStyle(style.dateStyle?.background) || 'transparent',
          color: style.dateStyle?.textColor || style.textColor || '#ffffff',
          textAlign: style.dateStyle?.textAlign || 'center',
          fontWeight: style.dateStyle?.fontWeight || '500',
        },
      });
      
      // Sanitize timer template once
      const formattedTemplate = sanitizeHTML(config.timerText);
      const timerText = createElement('span', {});
      timerContainer.appendChild(timerText);
      card.appendChild(timerContainer);
      
      // Function to update timer display
      function updateTimer() {
        const now = new Date();
        const endTime = new Date(config.endDate + 'T23:59:59');
        if (endTime > now) {
          const diff = endTime - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          // Update the time values in the formatted template
          let updatedText = formattedTemplate;
          
          // Support both old format {h} {mm} {ss} and new format hh mm ss
          updatedText = updatedText.replace(/\{h\}/g, hours);
          updatedText = updatedText.replace(/\{mm\}/g, minutes.toString().padStart(2, '0'));
          updatedText = updatedText.replace(/\{ss\}/g, seconds.toString().padStart(2, '0'));
          
          // Also support hh, mm, ss (without curly braces) - add h, m, s suffixes by default
          updatedText = updatedText.replace(/\bhh\b/g, hours.toString().padStart(2, '0') + 'h');
          updatedText = updatedText.replace(/\bmm\b/g, minutes.toString().padStart(2, '0') + 'm');
          updatedText = updatedText.replace(/\bss\b/g, seconds.toString().padStart(2, '0') + 's');
          
          // Only add colons with spacing if they don't already exist in the template
          // Check if colons are already present between closing and opening tags
          if (!/(<\/[^>]+>)\s*:\s*(<[^>]+>)/.test(updatedText)) {
            // Add colons with equal spacing (only if h/m/s units are present and no colons exist)
            updatedText = updatedText.replace(/(\d+h)(<\/[^>]+>)\s*/gi, '$1 : $2');
            updatedText = updatedText.replace(/(\d+m)(<\/[^>]+>)\s*/gi, '$1 : $2');
          }
          
          timerText.innerHTML = updatedText;
        } else {
          // Timer expired - clear interval and optionally hide card
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        }
      }
      
      // Render immediately on first load to prevent layout shift
      updateTimer();
      
      // Then update every second
      timerInterval = setInterval(updateTimer, 1000);
    }

    // Button
    if (config.showButton && config.buttonUrl) {
      const buttonStyle = style.buttonStyle || {};
      
      // Create button wrapper for alignment control
      const buttonWrapper = createElement('div', {
        className: 'cw-promo-card__btn-wrapper',
        style: {
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }
      });
      
      const btn = createElement('a', {
        className: 'cw-promo-card__btn' + (config.buttonFullWidth ? ' cw-promo-card__btn--full' : ''),
        href: config.buttonUrl,
        style: {
          background: getBackgroundStyle(buttonStyle.background) || style.buttonColor || '#6366f1',
          color: buttonStyle.textColor || style.buttonTextColor || '#ffffff',
          textAlign: buttonStyle.textAlign || 'center',
        },
        innerHTML: sanitizeHTML(config.buttonText || 'Shop Now'),
      });
      
      buttonWrapper.appendChild(btn);
      card.appendChild(buttonWrapper);
    }

    // Insert into page
    document.body.appendChild(card);
  }

  // ---- Main: Fetch config & initialize ----

  function init() {
    fetch(CONFIG_URL, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Campaign config fetch failed: ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {

        // Render announcement bar
        if (data.announcementBar) {
          renderAnnouncementBar(data.announcementBar);
        }

        // Render promo card
        if (data.promoCard) {
          renderPromoCard(data.promoCard);
        }
      })
      .catch(function (error) {
        console.warn('[Campaign Widgets] Could not load campaign config:', error.message);
      });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
