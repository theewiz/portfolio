/* Shared outline scrollspy for case studies.
   Keeps the outline link for the section currently being read black. */
(function () {
  'use strict';

  function init() {
    var outline = document.querySelector(
      'main .main-items .bottom .content-container .left .left-bottom'
    );

    if (!outline) return;

    var links = Array.prototype.slice.call(
      outline.querySelectorAll('a[href^="#"]')
    );
    var items = [];

    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (target) {
        items.push({ link: link, target: target });
      }
    });

    if (!items.length) return;

    var current = null;
    var frame = 0;
    var locked = null;
    var lockFrame = 0;
    var lockTargetY = 0;
    var lockStarted = 0;

    function setActive(item) {
      if (item === current) return;

      if (current) {
        current.link.classList.remove('is-active');
        current.link.removeAttribute('aria-current');
      }

      current = item;

      if (current) {
        current.link.classList.add('is-active');
        current.link.setAttribute('aria-current', 'location');
      }
    }

    function update() {
      frame = 0;

      // A click owns the active state until the page reaches its target.
      if (locked) return;

      var offset = Math.min(180, window.innerHeight * 0.28);
      var atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      var active = items[0];
      var bestTop = -Infinity;

      if (!atBottom) {
        // Pick the last section heading that has passed the reading line.
        items.forEach(function (item) {
          var top = item.target.getBoundingClientRect().top;
          if (top <= offset && top > bestTop) {
            bestTop = top;
            active = item;
          }
        });
      } else {
        active = items[items.length - 1];
      }

      setActive(active);
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    function endLock() {
      if (!locked) return;

      locked = null;

      if (lockFrame) {
        window.cancelAnimationFrame(lockFrame);
        lockFrame = 0;
      }

      update();
    }

    function checkLock() {
      lockFrame = 0;

      if (!locked) return;

      var atDestination = Math.abs(window.scrollY - lockTargetY) <= 2;

      if (atDestination || Date.now() - lockStarted > 3000) {
        endLock();
        return;
      }

      lockFrame = window.requestAnimationFrame(checkLock);
    }

    function lockTo(item) {
      locked = item;
      setActive(item);

      // Native smooth scrolling lands the heading at the top of the viewport,
      // clamped to the maximum scroll position.
      var maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      lockTargetY = Math.min(
        item.target.getBoundingClientRect().top + window.scrollY,
        maxScroll
      );
      lockStarted = Date.now();

      if (lockFrame) {
        window.cancelAnimationFrame(lockFrame);
      }

      lockFrame = window.requestAnimationFrame(checkLock);
    }

    items.forEach(function (item) {
      item.link.addEventListener('click', function (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        lockTo(item);
      });
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', update);
    window.addEventListener('hashchange', schedule);

    function releaseLock() {
      if (locked) endLock();
    }

    window.addEventListener('wheel', releaseLock, { passive: true });
    window.addEventListener('touchmove', releaseLock, { passive: true });
    window.addEventListener('keydown', releaseLock);

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
