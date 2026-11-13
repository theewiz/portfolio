/* Reusable case-study image lightbox.
   Opens eligible case study content images in a fullscreen modal overlay.
   Excludes hero images and explicitly non-lightbox images. */
(function () {
  'use strict';

  function init() {
    var main = document.querySelector('main .main-items');
    if (!main) return;

    var bottom = main.querySelector('.bottom');
    if (!bottom) return;

    var images = Array.prototype.slice
      .call(bottom.querySelectorAll('img'))
      .filter(function (img) {
        if (!img || img.closest('[data-lightbox="false"]')) return false;
        if (img.closest('.case-study-hero')) return false;
        if (img.classList.contains('case-study-hero')) return false;
        if (img.classList.contains('user-img')) return false;
        // Exclude persona/testimonial user images.
        if (img.closest('.neuton-container')) return false;
        if (img.closest('.container-neuton')) return false;
        if (img.closest('.musa-ilse')) return false;
        // Exclude key-metric/goal icons (small illustrative graphics), but keep
        // actual screen/content visuals (e.g. bitcoin screen SVGs live in .img-row-1).
        if (img.closest('.businessGoalsList-container')) return false;
        if (img.closest('.key-metrics')) return false;
        if (img.getAttribute('data-lightbox') === 'false') return false;
        // Must have a usable source.
        if (!img.currentSrc && !img.getAttribute('src')) return false;
        return true;
      });

    if (!images.length) return;

    // De-duplicate while preserving order.
    var seen = [];
    images = images.filter(function (img) {
      if (seen.indexOf(img) !== -1) return false;
      seen.push(img);
      return true;
    });

    var lightbox = createLightbox();
    document.body.appendChild(lightbox.el);

    var state = {
      open: false,
      index: 0,
      images: images,
      lastFocused: null,
      scrollY: 0,
      touchStartX: null,
      touchStartY: null
    };

    images.forEach(function (img, index) {
      if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      var label = img.getAttribute('alt');
      img.setAttribute(
        'aria-label',
        label && label.trim() ? 'Open image: ' + label : 'Open image in lightbox'
      );
      img.style.cursor = 'zoom-in';

      img.addEventListener('click', function (e) {
        e.preventDefault();
        open(index);
      });

      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(index);
        }
      });
    });

    function createLightbox() {
      var el = document.createElement('div');
      el.className = 'lightbox';
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');

      el.innerHTML =
        '<div class="lightbox__stage" data-lightbox-stage>' +
        '  <button type="button" class="lightbox__close" aria-label="Close image viewer">' +
        '    <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>' +
        '  </button>' +
        '  <button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Previous image">' +
        '    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
        '  </button>' +
        '  <figure class="lightbox__figure" role="dialog" aria-modal="true" aria-label="Image viewer">' +
        '    <img class="lightbox__image" alt="" />' +
        '  </figure>' +
        '  <button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Next image">' +
        '    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
        '  </button>' +
        '  <div class="lightbox__counter" aria-live="polite"></div>' +
        '</div>';

      return {
        el: el,
        stage: el.querySelector('[data-lightbox-stage]'),
        figure: el.querySelector('.lightbox__figure'),
        image: el.querySelector('.lightbox__image'),
        close: el.querySelector('.lightbox__close'),
        prev: el.querySelector('.lightbox__nav--prev'),
        next: el.querySelector('.lightbox__nav--next'),
        counter: el.querySelector('.lightbox__counter')
      };
    }

    function prefersReducedMotion() {
      return (
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function getFocusable() {
      return Array.prototype.slice
        .call(
          lightbox.el.querySelectorAll(
            'button:not([disabled]):not([hidden]), [href], [tabindex]:not([tabindex="-1"])'
          )
        )
        .filter(function (node) {
          return node.offsetParent !== null || node === lightbox.close;
        });
    }

    function updateNav() {
      var multi = state.images.length > 1;
      lightbox.prev.hidden = !multi;
      lightbox.next.hidden = !multi;
      lightbox.counter.hidden = !multi;
      if (multi) {
        lightbox.counter.textContent = state.index + 1 + ' / ' + state.images.length;
      } else {
        lightbox.counter.textContent = '';
      }
    }

    function render(index) {
      var img = state.images[index];
      if (!img) return;
      state.index = index;
      var src = img.currentSrc || img.getAttribute('src') || '';
      var alt = img.getAttribute('alt') || 'Case study image';
      lightbox.image.src = src;
      lightbox.image.alt = alt;
      lightbox.figure.setAttribute('aria-label', alt ? 'Image viewer: ' + alt : 'Image viewer');
      updateNav();
    }

    function lockScroll() {
      state.scrollY = window.scrollY || window.pageYOffset || 0;
      document.body.classList.add('lightbox-open');
      document.body.style.top = '-' + state.scrollY + 'px';
      document.body.style.position = 'fixed';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    function unlockScroll() {
      var y = state.scrollY;
      var html = document.documentElement;
      var prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      document.body.classList.remove('lightbox-open');
      document.body.style.top = '';
      document.body.style.position = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, y);
      // Restore again after layout/focus settles, then reinstate behavior.
      window.requestAnimationFrame(function () {
        window.scrollTo(0, y);
        window.requestAnimationFrame(function () {
          if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
          html.style.scrollBehavior = prevBehavior;
        });
      });
    }

    function open(index) {
      if (state.open) {
        render(index);
        return;
      }
      state.open = true;
      state.lastFocused = state.images[index] || document.activeElement;
      lightbox.el.removeAttribute('hidden');
      lightbox.el.setAttribute('aria-hidden', 'false');
      render(index);
      lockScroll();

      // Force reflow before adding open class for transition.
      void lightbox.el.offsetWidth;
      lightbox.el.classList.add('is-open');
      lightbox.close.focus();

      document.addEventListener('keydown', onKeydown, true);
    }

    function close() {
      if (!state.open) return;
      state.open = false;
      document.removeEventListener('keydown', onKeydown, true);

      var finish = function () {
        lightbox.el.classList.remove('is-open', 'is-closing');
        lightbox.el.setAttribute('hidden', '');
        lightbox.el.setAttribute('aria-hidden', 'true');
        lightbox.image.removeAttribute('src');
        unlockScroll();
        if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
          window.requestAnimationFrame(function () {
            try {
              state.lastFocused.focus({ preventScroll: true });
            } catch (err) {
              try {
                state.lastFocused.focus();
              } catch (e2) {}
            }
          });
        }
      };

      if (prefersReducedMotion()) {
        finish();
        return;
      }

      lightbox.el.classList.add('is-closing');
      lightbox.el.classList.remove('is-open');
      var done = false;
      var onEnd = function (e) {
        if (e.target !== lightbox.el) return;
        if (done) return;
        done = true;
        lightbox.el.removeEventListener('transitionend', onEnd);
        finish();
      };
      lightbox.el.addEventListener('transitionend', onEnd);
      window.setTimeout(function () {
        if (done) return;
        done = true;
        lightbox.el.removeEventListener('transitionend', onEnd);
        finish();
      }, 350);
    }

    function showPrev() {
      if (state.images.length < 2) return;
      var next = (state.index - 1 + state.images.length) % state.images.length;
      render(next);
    }

    function showNext() {
      if (state.images.length < 2) return;
      var next = (state.index + 1) % state.images.length;
      render(next);
    }

    function onKeydown(e) {
      if (!state.open) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
        return;
      }
      if (e.key === 'Tab') {
        var focusable = getFocusable();
        if (!focusable.length) {
          e.preventDefault();
          return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    lightbox.close.addEventListener('click', function (e) {
      e.stopPropagation();
      close();
    });

    lightbox.prev.addEventListener('click', function (e) {
      e.stopPropagation();
      showPrev();
    });

    lightbox.next.addEventListener('click', function (e) {
      e.stopPropagation();
      showNext();
    });

    // Clicking backdrop closes; clicking inside figure/image does not.
    lightbox.el.addEventListener('click', function (e) {
      if (e.target === lightbox.el || e.target === lightbox.stage) {
        close();
      }
    });

    lightbox.figure.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    // Basic swipe support on mobile.
    lightbox.stage.addEventListener(
      'touchstart',
      function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        state.touchStartX = e.touches[0].clientX;
        state.touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    lightbox.stage.addEventListener(
      'touchend',
      function (e) {
        if (state.touchStartX == null || state.touchStartY == null) return;
        var touch =
          e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null;
        if (!touch) {
          state.touchStartX = null;
          state.touchStartY = null;
          return;
        }
        var dx = touch.clientX - state.touchStartX;
        var dy = touch.clientY - state.touchStartY;
        state.touchStartX = null;
        state.touchStartY = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) showPrev();
          else showNext();
        }
      },
      { passive: true }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
