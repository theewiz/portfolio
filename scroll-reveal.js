/* Shared scroll-reveal system for case studies.
   Progressive enhancement: if this file fails to run, the inline boot
   script removes the hidden state after a short timeout. */
(function () {
  'use strict';

  var root = document.documentElement;

  if (window.__revealFallbackTimer) {
    window.clearTimeout(window.__revealFallbackTimer);
  }

  // The boot fallback already ran; leave the page fully visible.
  if (window.__revealTimedOut) return;

  var reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  if (reducedMotion && reducedMotion.matches) {
    root.classList.remove('reveal-pending', 'reveal-armed');
    return;
  }

  var CARD_SELECTOR = '.goal, .each-principle, .eachImage-container, .neuton-text, .first-box .line';
  var MEDIA_SELECTOR = 'img, video';
  var STAGGER = 110;
  var MAX_STEPS_DESKTOP = 4;
  var MAX_STEPS_MOBILE = 3;

  function revealImmediately(elements) {
    elements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  function init() {
    var top = document.querySelector('main .main-items .top');
    var right = document.querySelector('main .main-items .bottom .content-container .right');

    // Not a case-study layout; do nothing.
    if (!right) {
      root.classList.remove('reveal-pending', 'reveal-armed');
      return;
    }

    var targets = [];

    try {
      var cards = Array.prototype.slice.call(right.querySelectorAll(CARD_SELECTOR));
      var candidates = [];

      if (top) {
        candidates = candidates.concat(
          Array.prototype.slice.call(
            top.querySelectorAll('.head, .heading-img-container .right img')
          )
        );
      }

      candidates = candidates.concat(
        Array.prototype.slice.call(
          right.querySelectorAll('h1, h2, h3, h4, p, ul, img, video')
        )
      );

      var seen = new Set();

      // Grouped cards animate as one block; their children are skipped below.
      cards.forEach(function (card) {
        if (!seen.has(card)) {
          seen.add(card);
          targets.push(card);
        }
      });

      candidates.forEach(function (el) {
        if (seen.has(el)) return;
        if (el.closest(CARD_SELECTOR)) return;
        seen.add(el);
        targets.push(el);
      });

      // Skip elements that are not rendered at this viewport width (for
      // example, the hero image is display:none on mobile). They can never
      // intersect, so observing them would leave them permanently hidden.
      targets = targets.filter(function (el) {
        return el.getClientRects().length > 0;
      });

      if (!targets.length) {
        root.classList.remove('reveal-pending', 'reveal-armed');
        return;
      }

      targets.forEach(function (el) {
        el.classList.add('reveal');
        if (el.matches(MEDIA_SELECTOR)) {
          el.classList.add('reveal--media');
        }
      });

      // Elements that enter together are staggered within their section.
      var groupOf = new WeakMap();
      targets.forEach(function (el) {
        groupOf.set(el, el.closest('.right > div, .top') || el.parentElement || el);
      });

      if (!('IntersectionObserver' in window)) {
        revealImmediately(targets);
        root.classList.remove('reveal-pending', 'reveal-armed');
        return;
      }

      var isMobile = window.matchMedia
        ? window.matchMedia('(max-width: 760px)').matches
        : false;
      var maxSteps = isMobile ? MAX_STEPS_MOBILE : MAX_STEPS_DESKTOP;

      var observer = new IntersectionObserver(function (entries) {
        var visible = entries.filter(function (entry) {
          return entry.isIntersecting;
        });

        if (!visible.length) return;

        try {
          visible.sort(function (a, b) {
            var position = a.target.compareDocumentPosition(b.target);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
          });

          var counts = new Map();

          visible.forEach(function (entry) {
            var el = entry.target;
            var group = groupOf.get(el) || el.parentElement || el;
            var index = counts.get(group) || 0;
            counts.set(group, index + 1);

            var delay = Math.min(index, maxSteps - 1) * STAGGER;
            el.style.setProperty('--reveal-delay', delay + 'ms');
            el.classList.add('is-visible');
            observer.unobserve(el);
          });
        } catch (error) {
          // Never leave content hidden if a reveal step fails.
          revealImmediately(targets);
          root.classList.remove('reveal-armed');
        }
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -5% 0px'
      });

      root.classList.add('reveal-armed');
      targets.forEach(function (el) {
        observer.observe(el);
      });
      root.classList.remove('reveal-pending');
    } catch (error) {
      // Roll back cleanly so all content is visible.
      root.classList.remove('reveal-pending', 'reveal-armed');
      targets.forEach(function (el) {
        el.classList.remove('reveal', 'reveal--media', 'is-visible');
        el.style.removeProperty('--reveal-delay');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
