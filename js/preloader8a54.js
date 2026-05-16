/**
 * Decoria Theme - Preloader JavaScript
 * File: assets/js/preloader.js
 *
 * Works for both:
 *   - Spinner preloader (simple dismiss on window.load)
 *   - Custom Type (image slideshow with progress bar + dots)
 *
 * Config is passed from PHP via wp_localize_script as `decoriaPreloader`:
 *   { style, maxTime, slideDur }
 */

(function () {
    'use strict';

    /* ── Guard ── */
    var cfg = window.decoriaPreloader || { style: 'spinner', maxTime: 12000, slideDur: 2400 };
    var el  = document.getElementById('decoria-preloader');
    if (!el) return;

    /* ============================================================
       SHARED: dismiss the preloader with fade-out
       ============================================================ */
    var dismissed = false;

    function dismiss() {
        if (dismissed) return;
        dismissed = true;

        // Snap progress to 100 if custom type
        var fill    = document.getElementById('dp-progress-fill');
        var numSpan = document.getElementById('dp-progress-num');
        if (fill)    fill.style.width = '100%';
        if (numSpan) numSpan.textContent = '100';

        // Small grace delay so 100% is visible briefly
        setTimeout(function () {
            el.classList.add('is-hidden');

            // Remove from DOM after transition
            el.addEventListener('transitionend', function onEnd() {
                el.removeEventListener('transitionend', onEnd);
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        }, 400);
    }

    /* Safety fallback - always dismiss after maxTime */
    var safetyTimer = setTimeout(dismiss, cfg.maxTime);

    /* Dismiss on page fully loaded */
    if (document.readyState === 'complete') {
        clearTimeout(safetyTimer);
        setTimeout(dismiss, 300);
    } else {
        window.addEventListener('load', function () {
            clearTimeout(safetyTimer);
            setTimeout(dismiss, 500);
        });
    }

    /* ============================================================
       SPINNER: nothing extra needed — dismiss() handles it.
       ============================================================ */
    if (cfg.style !== 'custom_type') return;

    /* ============================================================
       CUSTOM TYPE: image slideshow + dots + progress bar
       ============================================================ */
    var slides      = el.querySelectorAll('.decoria-preloader__slide');
    var dots        = el.querySelectorAll('.decoria-preloader__dot');
    var progressFill = document.getElementById('dp-progress-fill');
    var progressNum  = document.getElementById('dp-progress-num');

    var totalSlides = slides.length;
    var current     = 0;
    var slideDur    = cfg.slideDur || 2400;
    var startTime   = Date.now();
    var slideTimer  = null;

    /* ── Activate first slide immediately ── */
    activateSlide(0);

    /* ── Cycle slides ── */
    slideTimer = setInterval(function () {
        var next = (current + 1) % totalSlides;
        goToSlide(next);
    }, slideDur);

    function goToSlide(next) {
        /* Exit current */
        slides[current].classList.remove('is-active');
        slides[current].classList.add('is-exit');

        var exitEl = slides[current]; // closure capture
        setTimeout(function () {
            exitEl.classList.remove('is-exit');
        }, 850);

        /* Deactivate current dot */
        resetDot(current);

        /* Advance */
        current = next;
        activateSlide(current);
    }

    function activateSlide(idx) {
        slides[idx].classList.add('is-active');
        activateDot(idx);
    }

    /* ── Dots ── */
    function activateDot(idx) {
        if (!dots[idx]) return;
        var dot  = dots[idx];
        var fill = dot.querySelector('.decoria-preloader__dot-fill');

        /* Force reflow to restart animation */
        if (fill) {
            fill.style.animation = 'none';
            fill.offsetHeight; // reflow
            fill.style.animation = '';
        }

        dot.style.setProperty('--dp-dot-dur', (slideDur / 1000) + 's');
        dot.classList.add('is-active');
    }

    function resetDot(idx) {
        if (!dots[idx]) return;
        var dot  = dots[idx];
        var fill = dot.querySelector('.decoria-preloader__dot-fill');

        dot.classList.remove('is-active');

        if (fill) {
            fill.style.animation = 'none';
            fill.offsetHeight;
            fill.style.animation = '';
        }
    }

    /* ── Progress bar ── */
    function updateProgress() {
        if (dismissed) return;

        var elapsed  = Date.now() - startTime;
        var raw      = Math.min(elapsed / cfg.maxTime, 0.98); // stop at 98 until dismissed
        /* Ease-out curve — fast then slows */
        var progress = Math.round((1 - Math.pow(1 - raw, 2.4)) * 100);

        if (progressFill) progressFill.style.width = progress + '%';
        if (progressNum)  progressNum.textContent  = progress;

        if (progress < 98) {
            requestAnimationFrame(updateProgress);
        }
    }

    requestAnimationFrame(updateProgress);

    /* ── Override dismiss to also stop slide interval ── */
    var _originalDismiss = dismiss;
    dismissed = false; // reset flag (set too early above for custom type branch)

    /* Re-register window load for custom type so interval is cleared */
    window.addEventListener('load', function () {
        clearTimeout(safetyTimer);
        clearInterval(slideTimer);
        setTimeout(_originalDismiss, 600);
    });

    /* Override safety fallback too */
    clearTimeout(safetyTimer);
    safetyTimer = setTimeout(function () {
        clearInterval(slideTimer);
        _originalDismiss();
    }, cfg.maxTime);

})();