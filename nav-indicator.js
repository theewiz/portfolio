/* Shared active-state underline for the main site navigation.
   Projects tracks the projects section on the home page and About is active
   on the about page. Only one navigation item can be active at a time. */
(function () {
  'use strict';

  function init() {
    var nav = document.querySelector('nav .nav-items .nav-item-right');

    if (!nav) return;

    var items = [];
    var pageActive = null;
    var projectsItem = null;

    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (link) {
      var label = link.querySelector('li');

      if (!label) return;

      var item = {
        link: link,
        label: label,
        href: link.getAttribute('href') || '',
        target: null
      };

      if (label.classList.contains('project')) {
        var id = item.href.charAt(0) === '#' ? item.href.slice(1) : '';
        item.target = id ? document.getElementById(id) : null;
        projectsItem = item;
      } else if (!label.classList.contains('about')) {
        // Contact and any other item never receive the indicator.
        return;
      }

      var url;

      try {
        url = new URL(item.href, window.location.href);
      } catch (error) {
        url = null;
      }

      // A link that points at the page already being viewed is that page's
      // own active item, e.g. About while on about.html.
      if (
        url &&
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        !url.hash
      ) {
        pageActive = item;
      }

      items.push(item);
    });

    if (!items.length) return;

    var current = null;
    var frame = 0;
    var locked = false;
    var lockFrame = 0;
    var lockTargetY = 0;
    var lockStarted = 0;

    function setActive(item) {
      if (item === current) return;

      current = item;

      items.forEach(function (entry) {
        var active = entry === item;

        entry.label.classList.toggle('is-active', active);
        entry.label.classList.toggle('active', active && entry === pageActive);

        if (active) {
          entry.link.setAttribute(
            'aria-current',
            entry === pageActive ? 'page' : 'location'
          );
        } else {
          entry.link.removeAttribute('aria-current');
        }
      });
    }

    function sectionActive() {
      if (!projectsItem || !projectsItem.target) return null;

      var threshold = Math.min(200, window.innerHeight * 0.35);

      return projectsItem.target.getBoundingClientRect().top <= threshold
        ? projectsItem
        : null;
    }

    function update() {
      frame = 0;

      // A click owns the indicator until the page reaches its destination.
      if (locked) return;

      setActive(pageActive || sectionActive());
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    function endLock() {
      if (!locked) return;

      locked = false;

      if (lockFrame) {
        window.cancelAnimationFrame(lockFrame);
        lockFrame = 0;
      }

      update();
    }

    function checkLock() {
      lockFrame = 0;

      if (!locked) return;

      if (
        Math.abs(window.scrollY - lockTargetY) <= 2 ||
        Date.now() - lockStarted > 3000
      ) {
        endLock();
        return;
      }

      lockFrame = window.requestAnimationFrame(checkLock);
    }

    function lockTo(item) {
      locked = true;
      setActive(item);

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
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }

        if (item.target && !pageActive) {
          lockTo(item);
        } else {
          setActive(item);
        }
      });
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('popstate', schedule);

    function releaseLock() {
      if (locked) endLock();
    }

    window.addEventListener('wheel', releaseLock, { passive: true });
    window.addEventListener('touchmove', releaseLock, { passive: true });
    window.addEventListener('keydown', releaseLock);

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
