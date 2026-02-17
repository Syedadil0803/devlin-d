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

  // ---- Helper function for format system ----
  
  function applyFormatSystem(text) {
    // Convert semantic HTML tags to styled spans for consistent rendering
    return text
      .replace(/<strong>/g, '<span style="font-weight: bold;">')
      .replace(/<\/strong>/g, '</span>')
      .replace(/<em>/g, '<span style="font-style: italic;">')
      .replace(/<\/em>/g, '</span>');
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
        var isRichText = typeof announcement === 'object' && announcement.richText === true;

        var tag = url ? 'a' : 'span';
        var attrs = { className: 'cw-announcement-bar__item' };

        if (url) {
          attrs.className += ' cw-announcement-link';
          attrs.href = url;
          attrs.style = { textDecoration: 'underline', color: 'inherit' };
        }

        // Rich text: render HTML via innerHTML; plain text: safe textContent via children
        if (isRichText) {
          attrs.innerHTML = text;
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

      // Adjust navbar offset as bar scrolls out of view
      window.addEventListener('scroll', function () {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;
        var visibleBarHeight = Math.max(0, BAR_HEIGHT - scrollY);
        document.body.style.setProperty('--cw-bar-height', visibleBarHeight + 'px');
      }, { passive: true });
    });
  }

  // ---- Promo Card ----

  function renderPromoCard(config) {
    if (!shouldShow(config)) return;

    const style = config.style || {};
    const position = style.position || 'bottom-right';

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
      titleElement.innerHTML = applyFormatSystem(config.title); // Apply format system
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
      subtitleElement.innerHTML = applyFormatSystem(config.subtitle); // Apply format system
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
      descriptionElement.innerHTML = applyFormatSystem(config.description); // Apply format system
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
      
      // Apply format system once to create template
      const formattedTemplate = applyFormatSystem(config.timerText);
      const timerText = createElement('span', {});
      timerContainer.appendChild(timerText);
      card.appendChild(timerContainer);
      
      // Function to update timer display
      function updateTimer() {
        const now = new Date();
        const endTime = new Date(config.endDate);
        if (endTime > now) {
          const diff = endTime - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          // Update the time values in the formatted template
          let updatedText = formattedTemplate;
          updatedText = updatedText.replace('{h}', hours);
          updatedText = updatedText.replace('{mm}', minutes.toString().padStart(2, '0'));
          updatedText = updatedText.replace('{ss}', seconds.toString().padStart(2, '0'));
          
          timerText.innerHTML = updatedText;
        }
      }
      
      // Render immediately on first load to prevent layout shift
      updateTimer();
      
      // Then update every second
      setInterval(updateTimer, 1000);
    }

    // Button
    if (config.showButton && config.buttonUrl) {
      const btn = createElement('a', {
        className: 'cw-promo-card__btn',
        href: config.buttonUrl,
        style: {
          backgroundColor: style.buttonColor || '#6366f1',
          color: style.buttonTextColor || '#ffffff',
        },
        innerHTML: config.buttonText || 'Shop Now',
      });
      card.appendChild(btn);
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
