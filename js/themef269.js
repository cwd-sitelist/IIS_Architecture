(function($) {
    "use strict";

    // Silent logger (no console)
    const logger = {
        log:   function(msg, data) {},
        warn:  function(msg, data) {},
        error: function(msg, data) {}
    };

    // Utility Functions
    // -----------------
    const elementExists = function(selector) {
        return $(selector).length > 0;
    };

    const debounce = function(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    };

    // Swiper Sliders
    // --------------
    var _swiperRetryCount = 0;
    function initSwipers() {
        if (typeof Swiper === 'undefined') {
            if (_swiperRetryCount++ < 20) { setTimeout(initSwipers, 500); }
            return;
        }
        _swiperRetryCount = 0;

        const thumbsInstances = {};

        /* --------------------- THUMBS --------------------- */
        document.querySelectorAll('.swiper_thumbs').forEach(function (thumb) {
            const mainId = thumb.getAttribute('data-main-id');
            if (!mainId) return;

            let options = {};
            try { options = JSON.parse(thumb.getAttribute('data-swiper') || '{}'); }
            catch (e) { logger.error('Thumb options parse error', e); }

            thumbsInstances[mainId] = new Swiper(thumb, {
                ...options,
                watchSlidesProgress: true
            });
        });

        /* --------------------- MAIN SLIDER --------------------- */
        document.querySelectorAll('.swiper_container').forEach(function (container) {
            if (container.swiper) container.swiper.destroy(true, true);

            const mainId = container.id;
            let options = {};
            try { options = JSON.parse(container.getAttribute('data-swiper') || '{}'); }
            catch (e) { logger.error('Main options error for ' + mainId, e); }

            /* ---- THUMBS ---- */
            if (thumbsInstances[mainId]) {
                options.thumbs = { swiper: thumbsInstances[mainId] };
            }

            /* ---- FRACTION PAGINATION ---- */
            if (!options.pagination) {
                let paginationEl = container.querySelector('.swiper-pagination');
                if (!paginationEl) {
                    paginationEl = document.createElement('div');
                    paginationEl.className = 'swiper-pagination swiper-pagination-fraction';
                    container.appendChild(paginationEl);
                }
                options.pagination = {
                    el: paginationEl,
                    type: 'fraction',
                    formatFractionCurrent: function (number) {
                        return String(number).padStart(2, '0');
                    },
                    formatFractionTotal: function (number) {
                        return String(number).padStart(2, '0');
                    }
                };
            }

            /* ---- NAVIGATION (optional) ---- */
            if (!options.navigation) {
                options.navigation = {
                    nextEl: container.querySelector('.swiper-button-next'),
                    prevEl: container.querySelector('.swiper-button-prev')
                };
            }

            const mainSwiper = new Swiper(container, options);

            /* ---- AUTOPLAY PAUSE ON HOVER ---- */
            if (options.autoplay) {
                container.addEventListener('mouseenter', () => {
                    if (mainSwiper.autoplay && mainSwiper.autoplay.stop) mainSwiper.autoplay.stop();
                });
                container.addEventListener('mouseleave', () => {
                    if (mainSwiper.autoplay && mainSwiper.autoplay.start) mainSwiper.autoplay.start();
                });
            }
        });
    }

    function setupGutenbergObserver() {
        initSwipers();

        if (document.body.classList.contains('block-editor-page') ||
            document.getElementById('editor') ||
            document.querySelector('.edit-post-layout')) {
            const observer = new MutationObserver(function(mutations) {
                let shouldInit = false;
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length || mutation.type === 'attributes') {
                        if (mutation.target.querySelector('.swiper_container, .swiper_thumbs')) {
                            shouldInit = true;
                        }
                    }
                });
                if (shouldInit) {
                    initSwipers();
                }
            });

            const editorArea = document.getElementById('editor') ||
                               document.querySelector('.edit-post-layout') ||
                               document.querySelector('.editor-styles-wrapper');

            if (editorArea) {
                observer.observe(editorArea, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'id']
                });
            }
        }
    }

    // Testimonial
    function decoria_testimonial_swiper_carousel($scope) {
        if (typeof Swiper === 'undefined') return;

        const container = $scope ? $scope.find('.decoriatestimonial2') : $('.decoriatestimonial2');
        if (!container.length) return;

        container.each(function () {
            const $el = $(this);
            let config = $el.data('swiper') || {};

            config.pagination = {
                el: '.decoriatestimonial2-pagination',
                clickable: true,
                renderBullet: function (index, className) {
                    const slide = $el.find('.swiper-slide').eq(index);
                    const name = slide.data('author-name') || 'Client ' + (index + 1);
                    return '<span class="' + className + '"><span class="bullet-name">' + name + '</span></span>';
                }
            };

            if ($el[0].swiper) {
                $el[0].swiper.destroy(true, true);
            }

            new Swiper($el[0], config);
        });
    }

    // FAQ Accordion
    // -------------
    window.initFaqAccordion = function(blockId) {
        const $container = $('#' + blockId);
        if (!$container.length) return;

        const mode      = $container.data('accordion-type') || 'accordion';
        const plusIcon  = $container.data('plus-icon')  || 'fa-plus';
        const minusIcon = $container.data('minus-icon') || 'fa-minus';
        const $items    = $container.find('.faq-item');

        const toggleItem = ($item) => {
            const $icon   = $item.find('.faq-toggle-icon i');
            const $answer = $item.find('.faq-answer-container');
            const isOpen  = $item.hasClass('faq-item-open');

            if (mode === 'accordion' && !isOpen) {
                $items.not($item).removeClass('faq-item-open')
                    .find('.faq-answer-container').slideUp(300);
                $items.not($item).find('.faq-toggle-icon i').attr('class', plusIcon);
            }

            if (isOpen) {
                $item.removeClass('faq-item-open');
                $answer.slideUp(300);
                $icon.attr('class', plusIcon);
            } else {
                $item.addClass('faq-item-open');
                $answer.slideDown(300);
                $icon.attr('class', minusIcon);
            }
        };

        $items.each(function() {
            const $item     = $(this);
            const $question = $item.find('.faq-question-container');
            $question.off('click').on('click', function() {
                toggleItem($item);
            });
        });

        if (mode === 'first-open') {
            const $first = $items.first();
            $first.addClass('faq-item-open');
            $first.find('.faq-answer-container').show();
            $first.find('.faq-toggle-icon i').attr('class', minusIcon);
        }
    };

    // Tab Widget
    // ----------
    function activateTab($container, tabId) {
        if (!tabId) return;

        const $tabButtons  = $container.find('.tab-button');
        const $tabContents = $container.find('.tab-content-container');

        $tabButtons.removeClass('active');
        $tabContents.removeClass('active fade-in');

        $container.find(`[data-tab="${tabId}"]`).addClass('active');
        const $activeContent = $container.find('#' + tabId);
        $activeContent.addClass('active');

        setTimeout(() => {
            $activeContent.addClass('fade-in');
        }, 10);

        $container.trigger('tab_activated', [tabId]);
    }

    function initTabWidgets($scope) {
        $scope.find('.tabs-widget-container').each(function() {
            const $container = $(this);
            if ($container.hasClass('tabs-initialized')) return;
            $container.addClass('tabs-initialized');

            const $tabButtons = $container.find('.tab-button');
            activateTab($container, $tabButtons.first().data('tab'));

            $tabButtons.off('click').on('click', function(e) {
                e.preventDefault();
                const tabId = $(this).data('tab');
                activateTab($container, tabId);
            });
        });
    }

    // Block Post Type Tabs
    // --------------------
    function initBlockTabs($scope) {
        $scope.find('.block-tabs-container').each(function() {
            const $container = $(this);
            if ($container.hasClass('tabs-initialized')) return;
            $container.addClass('tabs-initialized');

            $container.find('.tab-button').on('click', function(e) {
                e.preventDefault();
                const tabId = $(this).data('tab');
                $container.find('.tab-button').removeClass('active');
                $container.find('.tab-content-container').removeClass('active').hide();
                $(this).addClass('active');
                $('#' + tabId).addClass('active').show();
            });

            $container.find('.tab-button:first').trigger('click');
        });
    }

    // Service Cards Hover
    // -------------------
    function initServiceCards() {
        const serviceCards = document.querySelectorAll('.service_card');

        if (serviceCards.length > 0 && !serviceCards[0].classList.contains('active')) {
            serviceCards[0].classList.add('active');
        }

        serviceCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                serviceCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });
    }

    // General Utilities
    // -----------------
    function initUtilities() {
        function updateYear() {
            $('.syear').text(new Date().getFullYear());
        }
        updateYear();
        setInterval(updateYear, 1000 * 60 * 60 * 24);

        $('.decoria-back-to-top').on('click', function(e) {
            e.preventDefault();
            $('html, body').animate({ scrollTop: 0 }, 800);
        });

        $(window).on('scroll', debounce(function() {
            if ($(this).scrollTop() > 100) {
                $('.decoria-back-to-top').fadeIn();
            } else {
                $('.decoria-back-to-top').fadeOut();
            }
        }, 200));
    }

    // Search Widget
    // -------------
    function initSearchWidget() {
        $('.decoria-search-toggle-btn').on('click', function(e) {
            e.preventDefault();
            $('.decoria-search-widget.toggle-style').fadeIn(300);
            setTimeout(function() {
                $('.decoria-search-widget.toggle-style .search').focus();
            }, 300);
        });

        $('.decoria-search-close-btn').on('click', function(e) {
            e.preventDefault();
            $('.decoria-search-widget.toggle-style').fadeOut(300);
            $('.decoria-search-widget.toggle-style .search').val('');
            $('.decoria_search-results').empty();
        });

        $(document).on('click', function(e) {
            if ($(e.target).is('.decoria-search-widget.toggle-style')) {
                $('.decoria-search-widget.toggle-style').fadeOut(300);
                $('.decoria-search-widget.toggle-style .search').val('');
                $('.decoria_search-results').empty();
            }
        });

        $(document).on('keyup', function(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                $('.decoria-search-widget.toggle-style').fadeOut(300);
                $('.decoria-search-widget.toggle-style .search').val('');
                $('.decoria_search-results').empty();
            }
        });

        $('.decoria-search-widget.toggle-style .box-header-search').on('click', function(e) {
            e.stopPropagation();
        });
    }

    // Video Popups
    // ------------
    function initVideoPopups() {
        if ( !$('.video_box.magnific-popup a').length ) return;

        var _magnificLoading = false;
        var _magnificLoaded  = false;

        function bindMagnific() {
            var $videos = $('.video_box.magnific-popup a');
            if ( !$videos.length ) return;
            _magnificLoaded = true;
            $videos.magnificPopup({
                disableOn: 700,
                type: 'iframe',
                mainClass: 'mfp-fade',
                removalDelay: 160,
                preloader: false,
                fixedContentPos: false
            });
        }

        function loadAndBind( $trigger, e ) {
            // Already bound — re-trigger the click naturally
            if ( _magnificLoaded ) {
                $trigger.trigger('click.magnificPopup');
                return;
            }

            e.preventDefault();

            // No URL available — open in new tab as fallback
            var url = typeof decoria_magnific_url !== 'undefined' ? decoria_magnific_url : '';
            if ( !url ) {
                window.open( $trigger.attr('href'), '_blank' );
                return;
            }

            // Already loading — wait
            if ( _magnificLoading ) return;
            _magnificLoading = true;

            $.getScript( url )
                .done(function() {
                    if ( typeof $.fn.magnificPopup !== 'undefined' ) {
                        bindMagnific();
                        // Re-trigger the click so the popup opens immediately
                        $trigger.trigger('click');
                    } else {
                        window.open( $trigger.attr('href'), '_blank' );
                    }
                })
                .fail(function() {
                    _magnificLoading = false;
                    window.open( $trigger.attr('href'), '_blank' );
                });
        }

        // If already available, bind immediately
        if ( typeof $.fn.magnificPopup !== 'undefined' ) {
            bindMagnific();
            return;
        }

        // Otherwise attach a one-time delegated handler that loads on first click
        $(document).on('click.decoriaVideoPopup', '.video_box.magnific-popup a', function(e) {
            if ( _magnificLoaded ) return; // let magnificPopup handle it
            e.preventDefault();
            loadAndBind( $(this), e );
        });
    }

    // Accordion Images
    // ----------------
    function initAccordionImages() {
        const accordionItems  = document.querySelectorAll('.decoria-accordion-item');
        const accordionImages = document.querySelectorAll('.decoria-accordion-image');

        accordionItems.forEach((item) => {
            const header = item.querySelector('.decoria-accordion-header');
            header.addEventListener('click', () => {
                const imageIndex = item.getAttribute('data-image');

                accordionItems.forEach(acc => acc.classList.remove('active'));
                item.classList.add('active');

                accordionImages.forEach(img => {
                    img.classList.remove('active');
                    if (img.getAttribute('data-index') === imageIndex) {
                        img.classList.add('active');
                    }
                });
            });
        });
    }

    // Initialize All
    // --------------
    $(document).ready(function() {
        initUtilities();
        initSearchWidget();
        initVideoPopups();
        initTabWidgets($(document));
        initBlockTabs($(document));
        initServiceCards();
        initAccordionImages();
        $('.faq-accordion-container').each(function() {
            const id = $(this).attr('id');
            if (id) {
                window.initFaqAccordion(id);
            }
        });
    });

    $(window).on('load', function() {
        initTabWidgets($(document));
    });

    $(document).on('faq_accordion_loaded', function(e, blockId) {
        if (blockId) {
            window.initFaqAccordion(blockId);
        }
    });

    $(document).on('tabs_widget_loaded tabs_content_updated', function() {
        initTabWidgets($(document));
    });

    // Gutenberg Support
    if (typeof wp !== 'undefined' && wp.data) {
        wp.data.subscribe(function() {
            const $editorCanvas = $('.block-editor-writing-flow, .edit-post-visual-editor');
            if ($editorCanvas.length) {
                initTabWidgets($editorCanvas);
                initBlockTabs($editorCanvas);
            }

            const editor = window.wp.data.select('core/editor');
            if (editor && editor.isSavingPost && editor.isSavingPost()) {
                setTimeout(initSwipers, 500);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupGutenbergObserver);
    } else {
        setupGutenbergObserver();
    }

    if (window.MutationObserver) {
        const observer = new MutationObserver(() => initTabWidgets($(document)));
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.decoriaTabWidget = {
        init: () => initTabWidgets($(document)),
        activateTab: (containerId, tabId) => {
            const $container = $('#' + containerId);
            if ($container.length) {
                activateTab($container, tabId);
            }
        }
    };

    jQuery('.social-icons.style_one li small').each(function() {
        var $small      = jQuery(this);
        var $a          = $small.next('a.m_icon');
        var aWidth      = $a.outerWidth();
        var smallWidth  = $small.outerWidth();
        var centerLeft  = (aWidth - smallWidth) / 2;
        $small.css('left', centerLeft + 'px');
    });

    jQuery(document).ready(function($) {
        $('.option-panel-toggle').on('click', function() {
            $(this).next('.option-panel').toggleClass('open');
            $('.sticky_header_content').toggleClass('no_sticky_header');
        });

        $('.option-panel-close').on('click', function(event) {
            event.stopPropagation();
            $(this).closest('.option-panel').removeClass('open');
            $('.sticky_header_content').removeClass('no_sticky_header');
        });
    });

    class MovingTitleWidget {
        constructor(container) {
            this.container      = $(container);
            this.wrapper        = this.container.find('.moving-title-wrapper');
            this.titleWords     = this.container.find('.title-word');
            this.pauseOnHover   = this.container.data('pause-on-hover') === true;
            this.animationSpeed = this.container.data('speed') || 25;
            this.init();
        }

        init() {
            this.setupAnimation();
            this.setupHoverEffects();
            this.clearInlineStyles();
        }

        setupAnimation() {
            this.wrapper.css({ 'animation-duration': this.animationSpeed + 's' });
        }

        setupHoverEffects() {
            const self = this;

            this.titleWords.each(function() {
                const $word  = $(this);
                const $image = $word.find('.hover-image');

                if ($image.length > 0) {
                    $word.on('mouseenter.movingTitle', function() {
                        if (self.pauseOnHover) self.container.addClass('animation-paused');
                    });
                    $word.on('mouseleave.movingTitle', function() {
                        if (self.pauseOnHover) self.container.removeClass('animation-paused');
                    });
                }
            });

            this.container.on('mouseleave.movingTitle', function() {
                self.container.removeClass('animation-paused');
            });
        }

        clearInlineStyles() {
            this.titleWords.each(function() {
                const $word  = $(this);
                const $image = $word.find('.hover-image');

                if ($image.length > 0) {
                    $image.css({ 'top': '', 'left': '', 'transform': '', 'position': '', 'width': '', 'height': '' });
                }
            });
        }

        destroy() {
            this.titleWords.off('.movingTitle');
            this.container.off('.movingTitle');
            $(window).off('.movingTitle');
        }

        pause()  { this.container.addClass('animation-paused'); }
        resume() { this.container.removeClass('animation-paused'); }

        setSpeed(speed) {
            this.animationSpeed = speed;
            this.wrapper.css('animation-duration', speed + 's');
        }
    }

    function initMovingTitleWidgets() {
        $('.moving-title-container').each(function() {
            const $container = $(this);
            if (!$container.data('movingTitleWidget')) {
                const widget = new MovingTitleWidget(this);
                $container.data('movingTitleWidget', widget);
            }
        });
    }

    $(document).ready(function() {
        initMovingTitleWidgets();
    });

    window.MovingTitleWidget = MovingTitleWidget;

    function initProgressIndicator() {
        if (!elementExists('.progress_indicator path')) return;

        const progressPath = document.querySelector('.progress_indicator path');
        const pathLength   = progressPath.getTotalLength();

        progressPath.style.transition = progressPath.style.WebkitTransition = 'none';
        progressPath.style.strokeDasharray  = pathLength + ' ' + pathLength;
        progressPath.style.strokeDashoffset = pathLength;
        progressPath.getBoundingClientRect();
        progressPath.style.transition = progressPath.style.WebkitTransition = 'stroke-dashoffset 10ms linear';

        const updateProgress = debounce(function() {
            const scroll   = $(window).scrollTop();
            const height   = $(document).height() - $(window).height();
            const progress = pathLength - (scroll * pathLength / height);
            progressPath.style.strokeDashoffset = progress;
        }, 10);

        updateProgress();
        $(window).on('scroll', updateProgress);

        const offset = 250;
        $(window).on('scroll', function() {
            if ($(this).scrollTop() > offset) {
                $('.progress_indicator').addClass('active-progress');
            } else {
                $('.progress_indicator').removeClass('active-progress');
            }
        });

        $('.progress_indicator').on('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return false;
        });
    }

    // Service Hover
    function initServiceHover(scope = document) {
        if (scope && typeof scope.jquery !== 'undefined') {
            scope = scope[0];
        }

        const serviceItems = scope.querySelectorAll('.service-hover-item');
        if (!serviceItems.length) return;

        const firstItem = serviceItems[0];
        const lastItem  = serviceItems[serviceItems.length - 1];
        let revertTimer = null;

        firstItem.classList.add('active');

        serviceItems.forEach(item => {
            item.addEventListener('mouseenter', function() {
                clearTimeout(revertTimer);
                serviceItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });

            item.addEventListener('mouseleave', function() {
                if (this === lastItem) {
                    clearTimeout(revertTimer);
                    revertTimer = setTimeout(() => {
                        serviceItems.forEach(i => i.classList.remove('active'));
                        firstItem.classList.add('active');
                    }, 2000);
                }
            });
        });
    }

    // Project Tab Carousel
    function decoria_tab_carousel() {
        if (!elementExists('.decoria_project_tab_design')) return;

        $('.decoria_project_tab_design').each(function () {
            var $tabContainer = $(this);
            var widgetId      = $tabContainer.data('widget-id') ||
                                $tabContainer.attr('id') ||
                                'tabwidget_' + Math.floor(Math.random() * 100000);

            var hoverEnabled  = $tabContainer.hasClass('onhover');
            var eventHandler  = hoverEnabled ? 'mouseover' : 'click';

            var $tabButtons = $tabContainer.find('.showcase_tabs_btns .nav-item');
            var $tabPanels  = $tabContainer.find('.s_tabs_content .s_tab');

            if ($tabButtons.length === 0 || $tabPanels.length === 0) return;

            function setActiveTab(tabId) {
                if (!tabId) return;
                var $targetPanel = $tabContainer.find(tabId);
                if ($targetPanel.length === 0) return;

                $tabButtons.removeClass('active');
                $tabContainer.find('[data-tab="' + tabId + '"]').addClass('active');
                $tabPanels.removeClass('active-tab show');
                $targetPanel.addClass('active-tab show');
            }

            var storedTab      = localStorage.getItem('activeTab-' + widgetId);
            var validStoredTab = storedTab && $tabContainer.find(storedTab).length > 0 ? storedTab : null;
            var defaultTab     = $tabButtons.first().attr('data-tab') || '#tab-1';
            var activeTabId    = validStoredTab || defaultTab;

            setActiveTab(activeTabId);

            if (!validStoredTab && storedTab) {
                localStorage.setItem('activeTab-' + widgetId, activeTabId);
            }

            $tabButtons.on(eventHandler, function (e) {
                e.preventDefault();
                var tabId = $(this).attr('data-tab');
                if (tabId) {
                    setActiveTab(tabId);
                    localStorage.setItem('activeTab-' + widgetId, tabId);
                }
            });
        });
    }

    // Progress Bar
    function decoria_progress_bar() {
        if (typeof IntersectionObserver === 'undefined') {
            logger.warn('Intersection Observer not supported');
            return;
        }

        if ($('.count-bar').length) {
            const observerOptions = {
                root: null,
                rootMargin: '0px 0px -50px 0px',
                threshold: 0.1
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const el      = $(entry.target);
                        const percent = el.data('percent');
                        el.css('width', percent + '%').addClass('counted');
                        observer.unobserve(el[0]);
                    }
                });
            }, observerOptions);

            $('.count-bar').each(function() {
                observer.observe(this);
            });
        }
    }

    jQuery(document).ready(function($) {
        $('.elementor-room-section').each(function() {
            const $room     = $(this);
            const $elements = $room.find('.room-element');

            $elements.on('mouseenter', function() {
                $room.find('.room-tooltip').hide();
                $(this).siblings('.room-tooltip').show();
            }).on('mouseleave', function() {
                $(this).siblings('.room-tooltip').hide();
            });
        });

        let draggedElement = null;
        $('.room-element').on('dragstart', function(e) {
            draggedElement = $(this).closest('.room-element-wrapper');
        }).on('dragend', function(e) {
            if (draggedElement) {
                const roomOffset = draggedElement.closest('.elementor-room-section').offset();
                const newRect    = e.originalEvent.target.getBoundingClientRect();
                draggedElement.css({
                    top:    (newRect.top  - roomOffset.top)  + 'px',
                    left:   (newRect.left - roomOffset.left) + 'px',
                    bottom: 'auto',
                    right:  'auto'
                }).attr('data-anchor', 'top-left');
                draggedElement = null;
            }
        });
    });

    // Decoria Tabs
    function decoria_tab() {
        if (!elementExists('.decoria_tab_box')) return;

        $('.decoria_tab_box').each(function() {
            var $tabContainer = $(this);
            var widgetId      = $tabContainer.data('widget-id');
            var hoverEnabled  = $tabContainer.hasClass('onhover');
            var eventHandler  = hoverEnabled ? 'mouseover' : 'click';

            function setActiveTab(tabId) {
                var $target = $tabContainer.find(tabId);
                $tabContainer.find('.showcase_tabs_btns .s_tab_btn, .price_btn_s .s_tab_btn').removeClass('active');
                $tabContainer.find('[data-tab="' + tabId + '"]').addClass('active');
                $tabContainer.find('.s_tabs_content .s_tab').removeClass('active-tab show');
                $target.addClass('active-tab show');
            }

            var activeTab = localStorage.getItem('activeTab-' + widgetId) ||
                            $tabContainer.find('.showcase_tabs_btns .s_tab_btn:first, .price_btn_s .s_tab_btn:first').attr('data-tab');
            setActiveTab(activeTab);

            $tabContainer.find('.showcase_tabs_btns .s_tab_btn, .price_btn_s .s_tab_btn').on(eventHandler, function(e) {
                e.preventDefault();
                var tabId = $(this).attr('data-tab');
                setActiveTab(tabId);
                localStorage.setItem('activeTab-' + widgetId, tabId);
            });
        });
    }

    // AJAX Pagination
    function initAjaxPagination() {
        jQuery(document).on('click', '.yes_jax_pagi .page-numbers:not(.current)', function(e) {
            e.preventDefault();

            var $this = jQuery(this);

            if ($this.data('requestRunning')) {
                return false;
            }
            $this.data('requestRunning', true);

            var $container = $this.closest('[data-ajax-container]');
            if (!$container.length) {
                logger.error('No ajax container found');
                $this.data('requestRunning', false);
                return false;
            }

            var contentWrapper   = $container.data('content-wrapper');
            var contentContainer = $container.data('content-container');

            if (!contentWrapper || !contentContainer) {
                logger.error('Missing configuration data attributes');
                $this.data('requestRunning', false);
                return false;
            }

            var $contentList    = $container.find(contentContainer);
            var $paginationArea = $this.closest('.pagination-area');

            if (!$contentList.length) {
                logger.error('Content list not found');
                $this.data('requestRunning', false);
                return false;
            }

            $contentList.append('<div class="ajax-loader-wrapper"><span class="ajax-loader-inner"></span></div>');
            $paginationArea.addClass('loading');

            jQuery.get($this.attr('href'), function(response) {
                var $response      = jQuery(response);
                var $newContent    = $response.find(contentContainer).children(contentWrapper);
                var $newPagination = $response.find('.pagination-area').html();

                if ($newContent.length === 0) {
                    logger.warn('No new content found in response');
                    jQuery('.ajax-loader-wrapper').remove();
                    $paginationArea.removeClass('loading');
                    $paginationArea.fadeOut(300, function() { jQuery(this).remove(); });
                    $this.data('requestRunning', false);
                    return;
                }

                var $tempDiv        = jQuery('<div>').html($newPagination);
                var $tempPagination = $tempDiv.find('.pagination-area');
                var hasNextLink     = $tempDiv.find('.page-numbers').not('.current').length > 0;
                var currentPage     = parseInt($tempPagination.data('current-page')) || 0;
                var maxPages        = parseInt($tempPagination.data('max-pages')) || 0;
                var isLastPage      = (currentPage >= maxPages) && (maxPages > 0);

                if ($newPagination && hasNextLink && !isLastPage) {
                    $paginationArea.html($newPagination);
                } else {
                    $paginationArea.fadeOut(300, function() { jQuery(this).remove(); });
                }

                $newContent.css('opacity', 0);
                $contentList.append($newContent);

                if (typeof jQuery.fn.imagesLoaded === 'function') {
                    $newContent.imagesLoaded(function() {
                        $newContent.animate({ opacity: 1 }, 500);
                        jQuery('.ajax-loader-wrapper').remove();
                        $paginationArea.removeClass('loading');
                        initProjectHoverCards();
                    });
                } else {
                    setTimeout(function() {
                        $newContent.animate({ opacity: 1 }, 500);
                        jQuery('.ajax-loader-wrapper').remove();
                        $paginationArea.removeClass('loading');
                        initProjectHoverCards();
                    }, 300);
                }
            }).fail(function(xhr, status, error) {
                logger.error('AJAX failed');
                jQuery('.ajax-error-notice').remove();
                $paginationArea.html('<div class="ajax-error-notice" style="padding:10px;color:#c00;">Failed to load more items. Please try again.</div>');
                jQuery('.ajax-loader-wrapper').remove();
                $paginationArea.removeClass('loading');
                $this.data('requestRunning', false);
            });

            return false;
        });
    }

    // Project Hover Cards
    function initProjectHoverCards() {
        var cards = document.querySelectorAll('.project_hover_card_common');
        if (!cards.length) return;

        var timeoutId        = null;
        var AUTO_RESET_DELAY = 4000;

        function removeAllActive() {
            cards.forEach(function(card) { card.classList.remove('active'); });
        }

        function activateCard(card) {
            removeAllActive();
            card.classList.add('active');
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(function() {
                removeAllActive();
                var firstCard = document.querySelector('.project_hover_card_common');
                if (firstCard) firstCard.classList.add('active');
            }, AUTO_RESET_DELAY);
        }

        cards.forEach(function(card) {
            var newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
        });

        cards = document.querySelectorAll('.project_hover_card_common');

        cards.forEach(function(card) {
            card.addEventListener('mouseenter', function() { activateCard(card); });
        });

        if (cards[0]) cards[0].classList.add('active');
    }

    jQuery(document).ready(function($) {
        var hasAjaxContainers = $(
            '.ajax_posts_enabled, .ajax_project_enabled, .ajax_services_enabled, .ajax_teams_enabled'
        ).length > 0;

        if (hasAjaxContainers) {
            initAjaxPagination();
            initProjectHoverCards();
        }
    });

    // FAQs Accordion
    function decoria_faqsall() {
        if (!elementExists('.accordion_box')) return;

        $(".accordion_box").off('click').on('click', '.question', function() {
            var outerBox = $(this).closest('.accordion_box');
            var target   = $(this).closest('.accordion');

            $(this).toggleClass('active');

            outerBox.find('.accordion').not(target).removeClass('active-block');
            outerBox.find('.accordion .question, .accordion .icon_fq').not(this).removeClass('active');
            outerBox.find('.accordion').not(target).children('.accordion-content').slideUp(300);

            var accordionContent = $(this).next('.accordion-content');
            if (accordionContent.is(':visible')) {
                accordionContent.slideUp(300);
            } else {
                target.addClass('active-block');
                accordionContent.slideDown(300);
            }
        });
    }

    // Deals Countdown
    function initDealsCountdown() {
        if (typeof $.fn.countdown === 'undefined') {
            logger.warn('jQuery Countdown plugin not loaded');
            return;
        }

        $("[data-countdown]").each(function () {
            var $this     = $(this);
            var finalDate = $(this).data("countdown");

            if (!finalDate) {
                logger.warn('No countdown date found');
                return;
            }

            try {
                $this.countdown(finalDate, function (event) {
                    $(this).html(event.strftime(
                        '<span class="countdown-section"><span class="title-count font-48">%D</span><span class="countdown-period font-18 days">  </span></span>' +
                        '<span class="countdown-section"><span class="title-count font-48 ">%H</span><span class="countdown-period font-18 hours">  </span></span>' +
                        '<span class="countdown-section"><span class="title-count font-48 ">%M</span><span class="countdown-period font-18 mins">  </span></span>' +
                        '<span class="countdown-section"><span class="title-count font-48 ">%S</span><span class="countdown-period font-18 sec">  </span></span>'
                    ));
                });
            } catch (error) {
                logger.error('Countdown init error', error);
            }
        });
    }

    jQuery(document).ready(function ($) {
        $('.product-features').each(function () {
            var $wrapper      = $(this);
            var $items        = $wrapper.find('.features-list li');
            var $btn          = $wrapper.find('.read-more-btn');
            var visibleCount  = 3;

            if ($items.length <= visibleCount) {
                $btn.hide();
                return;
            }

            $items.slice(visibleCount).addClass('hidden');

            $btn.on('click', function () {
                var isExpanded = $btn.hasClass('expanded');
                if (isExpanded) {
                    $items.slice(visibleCount).addClass('hidden');
                    $btn.removeClass('expanded').text($btn.data('readmore'));
                } else {
                    $items.removeClass('hidden');
                    $btn.addClass('expanded').text($btn.data('readless'));
                }
            });
        });
    });

    // Dropdown Position
    function initDropdownPosition() {
        function setDropdownPosition() {
            const containers = document.querySelectorAll('.profile_woo, .login_box:not(.mobile-login-box)');

            containers.forEach(container => {
                const dropdown = container.querySelector('.dropdown-account, .account_login');
                if (!dropdown) return;

                const containerRect = container.getBoundingClientRect();
                const windowWidth   = window.innerWidth;

                dropdown.classList.remove('near_left', 'near_right');

                const originalDisplay    = dropdown.style.display;
                const originalVisibility = dropdown.style.visibility;
                const originalPosition   = dropdown.style.position;

                dropdown.style.visibility = 'hidden';
                dropdown.style.display    = 'block';
                dropdown.style.position   = 'absolute';

                const dropdownWidth = dropdown.offsetWidth || 200;

                dropdown.style.display    = originalDisplay;
                dropdown.style.visibility = originalVisibility;
                dropdown.style.position   = originalPosition;

                const spaceToRight = windowWidth - containerRect.left;
                const bufferSpace  = 20;

                if (spaceToRight >= dropdownWidth + bufferSpace) {
                    dropdown.classList.add('near_left');
                } else {
                    dropdown.classList.add('near_right');
                }
            });
        }

        $(document).on('click', '.login_box:not(.mobile-login-box)', function(e) {
            e.stopPropagation();
            const $clickedBox = $(this);
            $('.login_box:not(.mobile-login-box)').not($clickedBox).removeClass('active');
            $clickedBox.toggleClass('active');
            if ($clickedBox.hasClass('active')) {
                setTimeout(setDropdownPosition, 10);
            }
        });

        $('.login_box:not(.mobile-login-box)').each(function() {
            const $loginBox = $(this);
            $loginBox.find('.u-column1 h2').addClass('login active');
            $loginBox.find('.u-column2 h2').addClass('register');
            $loginBox.find('.woocommerce-form-login').addClass('enable_this_woo');
        });

        $(document).on('click', '.u-column1 h2', function(e) {
            e.stopPropagation();
            const $parentLoginBox = $(this).closest('.login_box:not(.mobile-login-box)');
            $parentLoginBox.find('.woocommerce-form-login').addClass('enable_this_woo');
            $parentLoginBox.find('.woocommerce-form-register').removeClass('enable_this_woo');
            $parentLoginBox.find('.u-column1 h2').addClass('active');
            $parentLoginBox.find('.u-column2 h2').removeClass('active');
            $parentLoginBox.addClass('active');
        });

        $(document).on('click', '.u-column2 h2', function(e) {
            e.stopPropagation();
            const $parentLoginBox = $(this).closest('.login_box:not(.mobile-login-box)');
            $parentLoginBox.find('.woocommerce-form-register').addClass('enable_this_woo');
            $parentLoginBox.find('.woocommerce-form-login').removeClass('enable_this_woo');
            $parentLoginBox.find('.u-column2 h2').addClass('active');
            $parentLoginBox.find('.u-column1 h2').removeClass('active');
            $parentLoginBox.addClass('active');
        });

        $(document).on('click', '.login_box:not(.mobile-login-box) .dropdown-account, .login_box:not(.mobile-login-box) .account_login', function(e) {
            e.stopPropagation();
        });

        $(document).on('click', function(e) {
            $('.login_box:not(.mobile-login-box)').removeClass('active');
        });

        window.addEventListener('load', setDropdownPosition);

        const resizeHandler = debounce(function() { setDropdownPosition(); }, 250);
        window.addEventListener('resize', resizeHandler);

        setDropdownPosition();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initServiceHover();
    });

    $(window).on('elementor/frontend/init', function() {
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-tab-v2.default', decoria_tab);
        elementorFrontend.hooks.addAction('frontend/element_ready/service-hover-content-repeater.default', initServiceHover);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-service-carousel-v1.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-client-carousel-widget.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-testimonial-v1.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-testimonial-v2.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-faqs-v1.default', decoria_faqsall);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-blog-carousel-v1.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-project-carousel.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-testimonial-v3.default', decoria_testimonial_swiper_carousel);
        elementorFrontend.hooks.addAction('frontend/element_ready/countdown_widget.default', initDealsCountdown);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-tean-grid-carousel.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-project-tab-carousel-v1.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-image-carousel-widget.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-related-posts-carousel.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/steelthemes-service-hover-v1.default', initSwipers);
        elementorFrontend.hooks.addAction('frontend/element_ready/decoria-product-carousel-v1.default', initSwipers);
    });

    jQuery(window).on('load', function() {
        (function($) {
            initProgressIndicator();
            decoria_tab_carousel();
            decoria_progress_bar();
            decoria_tab();
            decoria_testimonial_swiper_carousel();
            decoria_faqsall();
            initProjectHoverCards();
            initDealsCountdown();
            initDropdownPosition();
        })(jQuery);
    });

    // Header Dropdown
    function initHeaderDropdown() {
        if (elementExists('.navbar_nav li.dropdown ul')) {
            $('.navbar_nav li.dropdown > a').append('<div class="dropdown-btn trans"><span class="decorias-chevron-down"></span></div>');
        }
        if (elementExists('.navbar_nav li.mega_menu ul')) {
            $('.navbar_nav li.mega_menu > a').append('<div class="dropdown-btn trans"><span class="decorias-chevron-down"></span></div>');
        }
        if (elementExists('.navbar_nav > li:not(.mega_menu)')) {
            $('.navbar_nav > li:not(.mega_menu)').on('mouseenter mouseleave', function() {
                var submenu  = $(this).find('.navbar_nav > li > .sub-menu');
                var liHeight = $(this).outerHeight();
                submenu.addClass('active').css('top', liHeight);
            }, function() {
                $(this).find('.navbar_nav > li > .sub-menu').removeClass('active');
            });
        }
    }

    // Mobile Menu
    function initMobileMenu() {
        if (!elementExists('.mobile_menu_area')) return;

        $('.navbar_togglers').on('click', function(e) {
            e.preventDefault();
            $('.mobile_menu_area').addClass('active');
            $('.mobile-menu-overlay').addClass('active');
            $('body').addClass('menu-open');
        });

        $('.menu-close-btn, .mobile-menu-overlay').on('click', function(e) {
            e.preventDefault();
            $('.mobile_menu_area').removeClass('active');
            $('.mobile-menu-overlay').removeClass('active');
            $('body').removeClass('menu-open');
        });

        const $offCanvasNav        = $('.mobile_menu_area');
        const $offCanvasNavSubMenu = $offCanvasNav.find('.sub-menu');

        $offCanvasNavSubMenu.parent().each(function() {
            if (!$(this).find('> .dropdown-btn').length) {
                $(this).prepend('<span class="dropdown-btn"><i class="decorias-chevron-down"></i></span>');
            }
        });

        $offCanvasNavSubMenu.slideUp();

        $offCanvasNav.on('click', '.dropdown-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $this    = $(this);
            const $parent  = $this.parent('li');
            const $submenu = $parent.find('> .sub-menu');

            if ($submenu.length) {
                if ($submenu.is(':visible')) {
                    $parent.removeClass('drop-active');
                    $submenu.slideUp(300);
                } else {
                    $parent.addClass('drop-active');
                    $parent.siblings('li').removeClass('drop-active').find('li').removeClass('drop-active');
                    $parent.siblings('li').find('.sub-menu').slideUp(300);
                    $submenu.slideDown(300);
                }
            }
        });

        $offCanvasNav.on('click', 'li a.nav_link', function(e) {
            const $this    = $(this);
            const $parent  = $this.parent('li');
            const $submenu = $parent.find('> .sub-menu');

            if ($submenu.length && !$this.hasClass('dropdown-btn') && $parent.hasClass('menu-item-has-children')) {
                e.preventDefault();
                if ($submenu.is(':visible')) {
                    $parent.removeClass('drop-active');
                    $submenu.slideUp(300);
                } else {
                    $parent.addClass('drop-active');
                    $parent.siblings('li').removeClass('drop-active').find('li').removeClass('drop-active');
                    $parent.siblings('li').find('.sub-menu').slideUp(300);
                    $submenu.slideDown(300);
                }
            }
        });

        $(document).on('click', function(e) {
            const $target = $(e.target);
            if (!$target.closest('.mobile_menu_area').length &&
                !$target.closest('.navbar_togglers').length &&
                $('.mobile_menu_area').hasClass('active')) {
                $('.mobile_menu_area').removeClass('active');
                $('.mobile-menu-overlay').removeClass('active');
                $('body').removeClass('menu-open');
            }
        });

        $('.mobile_menu_area').on('click', function(e) { e.stopPropagation(); });

        $(window).on('resize', debounce(function() {
            if ($(window).width() > 991) {
                $('.mobile_menu_area').removeClass('active');
                $('.mobile-menu-overlay').removeClass('active');
                $('body').removeClass('menu-open');
            }
        }, 200));
    }

    // Mega Menu Adjustment
    // Mega Menu Adjustment
function decoria_adjustMegaMenu() {
    if (window.innerWidth < 1200) {
        document.querySelectorAll('.navbar_nav .sub-menu').forEach(subMenu => {
            subMenu.style.left     = '';
            subMenu.style.width    = '';
            subMenu.style.maxWidth = '';
            subMenu.classList.remove('submenu-visible');
        });
        return;
    }

    const navbarNav = document.querySelector('.navbar_nav');
    if (!navbarNav) return;

    const megaMenuItems = document.querySelectorAll(
        '.navbar_nav > li.mega_menu, .navbar_nav > li.flex_menu_activate.menu_fullwidth'
    );

    megaMenuItems.forEach(item => {
        const subMenu = item.querySelector('.sub-menu');
        if (!subMenu) return;

        subMenu.style.left     = '';
        subMenu.style.width    = '';
        subMenu.style.maxWidth = '';

        const itemRect      = item.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const menuWidth     = viewportWidth - 10;
        const leftOffset    = -(itemRect.left - 5);

        subMenu.style.left     = `${leftOffset}px`;
        subMenu.style.width    = `${menuWidth}px`;
        subMenu.style.maxWidth = `${menuWidth}px`;
        subMenu.classList.add('submenu-visible');
    });
}

function initMegaMenu() {
    class MegaMenu {
        constructor() {
            this.menuArea = document.querySelector('.desktop_menu_area');
            this.navItems = document.querySelectorAll('.desktop_navbar_nav .nav-item.flex_menu_activate');
            this.init();
        }

        init() {
            if (!this.menuArea) return;
            this.setupEventListeners();
            this.handleResize();
            this.positionMegaMenus();
        }

        setupEventListeners() {
            const resizeHandler = debounce(() => {
                this.handleResize();
                this.positionMegaMenus();
                decoria_adjustMegaMenu();
            }, 250);
            window.addEventListener('resize', resizeHandler);

            this.navItems.forEach(item => {
                const subMenu = item.querySelector(':scope > .sub-menu');
                if (subMenu) {
                    item.addEventListener('mouseenter', () => this.showSubMenu(item));
                    item.addEventListener('mouseleave', () => this.hideSubMenu(item));
                }
            });

            this.navItems.forEach(item => {
                const link    = item.querySelector(':scope > .nav_link');
                const subMenu = item.querySelector(':scope > .sub-menu');
                if (subMenu && link) {
                    link.addEventListener('click', (e) => {
                        if (window.innerWidth <= 768) {
                            e.preventDefault();
                            this.toggleMobileMenu(item);
                        }
                    });
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav-item.flex_menu_activate')) {
                    this.hideAllSubMenus();
                }
            });
        }

        showSubMenu(item) {
            const subMenu = item.querySelector(':scope > .sub-menu');
            if (!subMenu) return;
            this.hideAllSubMenus();
            item.classList.add('menu-active');
            this.positionSubMenu(item, subMenu);
        }

        hideSubMenu(item) {
            const subMenu = item.querySelector(':scope > .sub-menu');
            if (!subMenu) return;
            setTimeout(() => {
                if (!item.matches(':hover') && !subMenu.matches(':hover')) {
                    item.classList.remove('menu-active');
                }
            }, 100);
        }

        hideAllSubMenus() {
            this.navItems.forEach(item => {
                item.classList.remove('menu-active');
                item.classList.remove('mobile-menu-open');
                const subMenu = item.querySelector(':scope > .sub-menu');
                if (subMenu && window.innerWidth <= 768) {
                    subMenu.style.display = 'none';
                }
            });
        }

        positionSubMenu(item, subMenu) {
            if (window.innerWidth <= 768) return;

            const viewportWidth = document.documentElement.clientWidth;
            const rect          = item.getBoundingClientRect();

            // Reset all positioning first
            subMenu.style.left      = '';
            subMenu.style.right     = '';
            subMenu.style.width     = '';
            subMenu.style.maxWidth  = '';
            subMenu.style.minWidth  = '';
            subMenu.style.transform = '';

            const isFullWidth = item.classList.contains('menu_four_column') ||
                item.classList.contains('menu_five_column') ||
                item.classList.contains('menu_six_column') ||
                item.classList.contains('menu_seven_column');

            const isThreeColumn = item.classList.contains('menu_three_column');
            const isTwoColumn   = item.classList.contains('menu_two_column');

            if (isFullWidth) {
                const menuWidth = viewportWidth - 10;
                // Fix: clamp left so menu never goes past right edge of viewport
                const naturalLeft = -(rect.left - 5);
                const menuRight   = rect.left + naturalLeft + menuWidth;
                const overflow    = menuRight - viewportWidth;
                const leftOffset  = overflow > 0 ? naturalLeft - overflow : naturalLeft;

                subMenu.style.left     = `${leftOffset}px`;
                subMenu.style.right    = 'auto';
                subMenu.style.width    = `${menuWidth}px`;
                subMenu.style.maxWidth = `${menuWidth}px`;
                return;
            }

            // Detect which half of the viewport the menu item sits in
            const itemCenterX   = rect.left + rect.width / 2;
            const itemIsOnRight = itemCenterX > viewportWidth / 2;

            if (isThreeColumn) {
                subMenu.style.minWidth = '700px';
                subMenu.style.maxWidth = '900px';
            } else if (isTwoColumn) {
                subMenu.style.minWidth = '500px';
                subMenu.style.maxWidth = '700px';
            }

            // Temporarily reveal to measure real width
            subMenu.style.visibility = 'hidden';
            subMenu.style.display    = 'block';
            const subMenuWidth = subMenu.offsetWidth || (isThreeColumn ? 800 : isTwoColumn ? 580 : 220);
            subMenu.style.display    = '';
            subMenu.style.visibility = '';

            if (itemIsOnRight) {
                const leftEdgeIfAnchored = rect.right - subMenuWidth;
                if (leftEdgeIfAnchored >= 10) {
                    subMenu.style.right = '0';
                    subMenu.style.left  = 'unset';
                } else {
                    subMenu.style.left  = `${-(rect.left - 5) + 10}px`;
                    subMenu.style.right = 'unset';
                }
            } else {
                const rightEdgeIfAnchored = rect.left + subMenuWidth;
                if (rightEdgeIfAnchored <= viewportWidth - 10) {
                    subMenu.style.left  = '0';
                    subMenu.style.right = 'unset';
                } else {
                    subMenu.style.right = '0';
                    subMenu.style.left  = 'unset';
                }
            }
        }

        positionMegaMenus() {
            if (window.innerWidth <= 768) return;
            this.navItems.forEach(item => {
                const subMenu = item.querySelector(':scope > .sub-menu');
                if (subMenu) this.positionSubMenu(item, subMenu);
            });
        }

        toggleMobileMenu(item) {
            const subMenu = item.querySelector(':scope > .sub-menu');
            if (!subMenu) return;

            const isVisible = subMenu.style.display === 'block';

            this.navItems.forEach(otherItem => {
                if (otherItem !== item) {
                    const otherSubMenu = otherItem.querySelector(':scope > .sub-menu');
                    if (otherSubMenu) {
                        otherSubMenu.style.display = 'none';
                        otherItem.classList.remove('mobile-menu-open');
                    }
                }
            });

            if (isVisible) {
                subMenu.style.display = 'none';
                item.classList.remove('mobile-menu-open');
            } else {
                subMenu.style.display = 'block';
                item.classList.add('mobile-menu-open');
            }
        }

        handleResize() {
            const isMobile = window.innerWidth <= 768;

            this.navItems.forEach(item => {
                const subMenu = item.querySelector(':scope > .sub-menu');
                if (!subMenu) return;

                if (isMobile) {
                    subMenu.style.position  = 'static';
                    subMenu.style.transform = 'none';
                    subMenu.style.width     = '100%';
                    subMenu.style.left      = 'auto';
                    subMenu.style.right     = 'auto';
                    subMenu.style.minWidth  = 'auto';
                    subMenu.style.maxWidth  = 'none';
                    subMenu.style.display   = 'none';
                } else {
                    subMenu.style.position = 'absolute';
                    subMenu.style.display  = '';
                    item.classList.remove('mobile-menu-open');
                }
            });
        }

        refresh() {
            this.positionMegaMenus();
            decoria_adjustMegaMenu();
        }

        destroy() {}
    }

    const megaMenu = new MegaMenu();
    window.megaMenu = megaMenu;
    decoria_adjustMegaMenu();
}

    document.addEventListener('DOMContentLoaded', () => {
        initMegaMenu();
        decoria_adjustMegaMenu();
    });

    window.addEventListener('load', () => {
        decoria_adjustMegaMenu();
        if (window.megaMenu) window.megaMenu.refresh();
    });
    // Watch for cart price update and reposition mega menu
function initCartUpdateObserver() {
    const cartContainer = document.querySelector('.decoria_mini_cart_open .total-price-container');
    if (!cartContainer) return;

    const observer = new MutationObserver(function() {
        // Small delay to let layout settle after price update
        setTimeout(function() {
            decoria_adjustMegaMenu();
            if (window.megaMenu) window.megaMenu.refresh();
        }, 100);
    });

    observer.observe(cartContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // Also watch the mini cart count badge
    const cartCount = document.querySelector('.mini-cart-icon');
    if (cartCount) {
        observer.observe(cartCount, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
}
 jQuery(document.body).on('wc_fragments_refreshed wc_fragments_loaded added_to_cart removed_from_cart', function() {
        setTimeout(function() {
            decoria_adjustMegaMenu();
            if (window.megaMenu) window.megaMenu.refresh();
            initCartUpdateObserver();
        }, 150);
    });


    // Menu Active Class
    function initMenuActiveClass() {
        const currentPath = window.location.pathname;
        const currentHash = window.location.hash;

        document.querySelectorAll('.navbar_nav').forEach(function(nav) {
            const menuItems = nav.querySelectorAll('li');

            menuItems.forEach(function(item) {
                if (!item.classList.contains('current-menu-item') && !item.classList.contains('current_page_item')) {
                    item.classList.remove('active');
                    const itemLink = item.querySelector('a');
                    if (itemLink) itemLink.classList.remove('active');
                }
            });

            const hasHashLinks = nav.querySelector('li > a[href^="#"]') !== null;

            if (hasHashLinks && currentHash) {
                const activeLink = nav.querySelector(`li > a[href="${currentHash}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                    activeLink.closest('li').classList.add('active');
                }

                if (!window.scrollHandlerAdded) {
                    window.scrollHandlerAdded = true;
                    window.addEventListener('scroll', handleScroll);
                    handleScroll();
                }
            } else {
                menuItems.forEach(function(item) {
                    const link = item.querySelector('a');
                    if (!link) return;

                    const href    = link.getAttribute('href');
                    if (!href) return;

                    const isMatch = href === currentPath ||
                                   (href !== '/' && href !== '#' && currentPath.startsWith(href));

                    if (isMatch) {
                        item.classList.add('active');
                        link.classList.add('active');
                    }

                    const subMenuLinks  = item.querySelectorAll('ul.sub-menu a');
                    let hasActiveChild  = false;

                    subMenuLinks.forEach(function(subLink) {
                        const subHref = subLink.getAttribute('href');
                        if (!subHref) return;

                        const isSubMatch = subHref === currentPath ||
                                          (subHref !== '/' && subHref !== '#' && currentPath.startsWith(subHref));

                        if (isSubMatch) {
                            subLink.closest('li').classList.add('active');
                            hasActiveChild = true;
                        }
                    });

                    if (hasActiveChild) {
                        item.classList.add('active');
                        if (link) link.classList.add('active');
                    }
                });
            }
        });
    }

    function handleScroll() {
        const sections = [];
        document.querySelectorAll('.navbar_nav a[href^="#"]').forEach(function(link) {
            const hash = link.getAttribute('href');
            if (hash === '#') return;
            const section = document.querySelector(hash);
            if (section) sections.push({ section: section, link: link });
        });

        if (sections.length === 0) return;

        const scrollPos = window.scrollY + 150;
        let activeSection = null;

        if (scrollPos < 300) {
            activeSection = sections[0];
        } else {
            for (let i = 0; i < sections.length; i++) {
                const current     = sections[i];
                const sectionTop  = current.section.offsetTop;
                const sectionHeight = current.section.offsetHeight;

                if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                    activeSection = current;
                    break;
                }
                if (i === sections.length - 1 && scrollPos >= sectionTop) {
                    activeSection = current;
                }
            }
        }

        if (activeSection) {
            const navbar = activeSection.link.closest('.navbar_nav');
            navbar.querySelectorAll('li').forEach(function(item) {
                item.classList.remove('active');
                const itemLink = item.querySelector('a');
                if (itemLink) itemLink.classList.remove('active');
            });
            activeSection.link.classList.add('active');
            activeSection.link.closest('li').classList.add('active');
        }
    }

    // Sticky Header
    function initStickyHeader() {
        var header = $('.sticky_header_area');
        if (!header.length) return;

        var win = $(window);

        var handleScroll = debounce(function() {
            var scroll = win.scrollTop();
            if (scroll < 200) {
                header.removeClass('fixed-header');
            } else {
                header.addClass('fixed-header');
            }
        }, 10);

        header.css({ 'transition': 'all 0.43s ease-in-out' });
        win.on('scroll', handleScroll);
    }

    jQuery(document).ready(function($) {
        initHeaderDropdown();
        initMobileMenu();
        initStickyHeader();
        initMenuActiveClass();
        initCartUpdateObserver();
        $(window).on('hashchange', function() {
            initMenuActiveClass();
        });
    });

    const ServiceHoverAnimation = {
        init: function() {
            this.setupHoverEffects();
            this.setupClickEffects();
        },

        setupHoverEffects: function() {
            const serviceCards          = document.querySelectorAll('.service_card');
            const backgroundContainer   = document.querySelector('.service_background_container');
            if (!serviceCards.length || !backgroundContainer) return;

            serviceCards.forEach((card, index) => {
                card.addEventListener('mouseenter', function() {
                    ServiceHoverAnimation.handleCardHover(this, index);
                });
            });
        },

        setupClickEffects: function() {
            const serviceCards = document.querySelectorAll('.service_card');
            serviceCards.forEach((card, index) => {
                card.addEventListener('click', function(e) {
                    if (e.target.tagName === 'A' || e.target.closest('a')) return;
                    ServiceHoverAnimation.handleCardHover(this, index);
                });
            });
        },

        handleCardHover: function(card, index) {
            const section         = card.closest('.service_on_hover_section');
            const transitionEffect = section.getAttribute('data-transition') || 'slide';
            const serviceIndex    = card.getAttribute('data-service-index');

            section.querySelectorAll('.service_card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            ServiceHoverAnimation.changeBackground(section, serviceIndex, transitionEffect);
        },

        changeBackground: function(section, serviceIndex, transitionEffect) {
            const backgrounds    = section.querySelectorAll('.service_background');
            const targetBackground = section.querySelector(`.service_background[data-service-index="${serviceIndex}"]`);
            if (!targetBackground) return;

            switch(transitionEffect) {
                case 'fade':  this.applyFadeTransition(backgrounds, targetBackground);  break;
                case 'slide': this.applySlideTransition(backgrounds, targetBackground); break;
                case 'zoom':  this.applyZoomTransition(backgrounds, targetBackground);  break;
                default:      this.applySlideTransition(backgrounds, targetBackground);
            }
        },

        applyFadeTransition: function(backgrounds, target) {
            backgrounds.forEach(bg => {
                if (bg !== target) {
                    gsap.to(bg, { opacity: 0, duration: 0.6, ease: 'power2.inOut',
                        onComplete: function() { bg.classList.remove('active'); }
                    });
                }
            });
            target.classList.add('active');
            gsap.to(target, { opacity: 1, duration: 0.6, ease: 'power2.inOut' });
        },

        applySlideTransition: function(backgrounds, target) {
            backgrounds.forEach(bg => {
                if (bg !== target) {
                    gsap.to(bg, { x: '-100%', opacity: 0, duration: 0.8, ease: 'power3.inOut',
                        onComplete: function() { bg.classList.remove('active'); gsap.set(bg, { x: '100%' }); }
                    });
                }
            });
            target.classList.add('active');
            gsap.fromTo(target, { x: '100%', opacity: 0 }, { x: '0%', opacity: 1, duration: 0.8, ease: 'power3.inOut' });
        },

        applyZoomTransition: function(backgrounds, target) {
            backgrounds.forEach(bg => {
                if (bg !== target) {
                    gsap.to(bg, { scale: 1.2, opacity: 0, duration: 0.7, ease: 'power2.inOut',
                        onComplete: function() { bg.classList.remove('active'); gsap.set(bg, { scale: 0.8 }); }
                    });
                }
            });
            target.classList.add('active');
            gsap.fromTo(target, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power2.inOut' });
        }
    };

    $(document).ready(function() {
        ServiceHoverAnimation.init();
    });

    $(window).on('resize', debounce(function() {
        decoria_adjustMegaMenu();
        initMenuActiveClass();
    }, 100));

    $(window).on('elementor/frontend/init', function() {
        elementorFrontend.hooks.addAction('frontend/element_ready/steelthemes-service-hover-v1.default', function($scope) {
            ServiceHoverAnimation.init();
        });
    });

})(jQuery);