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
        } else {
          el.setAttribute(key, attrs[key]);
        }
      });
    }

    if (children) {
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
        backgroundColor: style.backgroundColor || '#dc2626',
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
      announcements.forEach(function (text) {
        fragment.appendChild(createElement('span', {
          className: 'cw-announcement-bar__item',
        }, text));
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

    // Measure bar height and offset fixed navbar elements
    requestAnimationFrame(function () {
      var halfWidth = track.scrollWidth / 2;
      var duration = halfWidth / MARQUEE_SPEED;
      bar.style.setProperty('--cw-marquee-duration', duration + 's');

      // Set bar height as CSS variable so fixed navbar can be offset
      var barHeight = bar.offsetHeight;
      document.body.style.setProperty('--cw-bar-height', barHeight + 'px');
      document.body.classList.add('cw-has-announcement-bar');

      // Dynamically adjust navbar offset as user scrolls
      window.addEventListener('scroll', function () {
        var scrollY = window.pageYOffset || document.documentElement.scrollTop;
        var visibleBarHeight = Math.max(0, barHeight - scrollY);
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
        backgroundColor: style.backgroundColor || '#1f2937',
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

    // Title
    if (config.title) {
      card.appendChild(
        createElement('h3', {
          className: 'cw-promo-card__title',
          style: { color: style.textColor || '#ffffff' },
        }, config.title)
      );
    }

    // Description
    if (config.description) {
      card.appendChild(
        createElement('p', {
          className: 'cw-promo-card__description',
          style: { color: style.textColor || '#ffffff' },
        }, config.description)
      );
    }

    // Button
    if (config.buttonUrl) {
      const btn = createElement('a', {
        className: 'cw-promo-card__btn',
        href: config.buttonUrl,
        style: {
          backgroundColor: style.buttonColor || '#6366f1',
          color: style.buttonTextColor || '#ffffff',
        },
        innerHTML: 'Shop Now',
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
