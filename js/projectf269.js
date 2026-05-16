jQuery(document).ready(function ($) {

    $('.project_post_section').each(function () {

        var $container = $(this);
        var $grid      = $container.find('.project_container');
        var $btn       = $container.find('.load-more-btn');

        var currentCategory = '';
        var currentPage     = 1;
        var isotopeReady    = false;

        /* ===============================
         * ISOTOPE INIT
         * =============================== */
        function initIsotope() {
            $grid.isotope({
                itemSelector:      '.project-wrapper',
                layoutMode:        'fitRows',
                percentPosition:   true,
                transitionDuration: '0.4s',
                hiddenStyle:  { opacity: 0, transform: 'scale(0.95)' },
                visibleStyle: { opacity: 1, transform: 'scale(1)'   },
            });
            isotopeReady = true;
        }

        // Wait for images before first layout so nothing overlaps
        $grid.imagesLoaded(function () {
            initIsotope();
        });

        /* ===============================
         * CATEGORY FILTER (SERVER SIDE)
         * =============================== */
        $container.on('click', '.project_filter li', function (e) {
            e.preventDefault();

            var $this = $(this);
            currentCategory = $this.data('category') || '';
            currentPage = 1;

            $container.find('.project_filter li').removeClass('current');
            $this.addClass('current');

            if ($btn.length) {
                $btn.attr('data-page', 1).show();
            }

            loadProjects(1, true);
        });

        /* ===============================
         * LOAD MORE
         * =============================== */
        $container.on('click', '.load-more-btn', function (e) {
            e.preventDefault();

            if ($btn.hasClass('loading')) return;

            var maxPages = parseInt($btn.attr('data-max-pages'), 10) || 1;
            if (currentPage >= maxPages) {
                $btn.hide();
                return;
            }

            currentPage++;
            loadProjects(currentPage, false);
        });

        /* ===============================
         * AJAX CORE
         * =============================== */
        function loadProjects(page, replace) {

            $btn.addClass('loading').find('span').text('Loading...');

            // Use the localized object — falls back to WP default only as last resort
            var ajaxUrl   = (window.decoriaProjectAjax && decoriaProjectAjax.ajaxurl)
                            ? decoriaProjectAjax.ajaxurl
                            : '/wp-admin/admin-ajax.php';
            var nonceVal  = (window.decoriaProjectAjax && decoriaProjectAjax.nonce)
                            ? decoriaProjectAjax.nonce
                            : '';

            var cats = [];
            try {
                cats = JSON.parse($container.attr('data-categories') || '[]');
            } catch (err) {
                cats = [];
            }

            $.ajax({
                url:  ajaxUrl,
                type: 'POST',
                data: {
                    action:          'load_more_projects',
                    nonce:           nonceVal,
                    page:            page,
                    posts_per_page:  $container.data('posts-per-page'),
                    column_class:    $container.data('column'),
                    orderby:         $container.data('orderby'),
                    order:           $container.data('order'),
                    categories:      cats,
                    filter_category: currentCategory,
                    widget_id:       $container.data('widget-id'),
                    project_style:   $container.data('project-style'),
                    excerpt_mode:    $container.data('excerpt-enable'),
                    excerpt_count:   $container.data('excerpt-count'),
                    title_tag:       $container.data('title-tag'),
                    button_text:     $container.data('button-text'),
                    img_width:       $container.data('img-width'),
                    img_height:      $container.data('img-height'),
                    img_obj_fit:     $container.data('img-obj-fit'),
                },

                success: function (response) {

                    if (!response.success || !response.data.html) {
                        restoreButton();
                        $btn.hide();
                        return;
                    }

                    var $items = $(response.data.html);

                    if (replace) {
                        // Destroy isotope, wipe grid, re-init fresh with new items
                        if (isotopeReady) {
                            $grid.isotope('destroy');
                            isotopeReady = false;
                        }
                        $grid.empty();
                        $grid.append($items);

                        $grid.imagesLoaded(function () {
                            initIsotope();
                        });

                    } else {
                        // Load more — append then tell isotope about the new items
                        $grid.append($items);
                        $items.imagesLoaded(function () {
                            $grid.isotope('appended', $items);
                        });
                    }

                    $btn.attr('data-page', page);
                    $btn.attr('data-max-pages', response.data.max_pages);

                    if (page >= response.data.max_pages) {
                        $btn.hide();
                    } else {
                        restoreButton();
                    }
                },

                error: function () {
                    restoreButton();
                }
            });
        }

        /* ===============================
         * HELPERS
         * =============================== */
        function restoreButton() {
            $btn.removeClass('loading');
            var original = $btn.attr('data-original-html');
            if (original) {
                $btn.html(original);
            }
        }

        if ($btn.length) {
            $btn.attr('data-original-html', $btn.html());
        }

        /* ===============================
         * RESIZE: re-layout only
         * =============================== */
        var resizeTimer;
        $(window).on('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (isotopeReady) {
                    $grid.isotope('layout');
                }
            }, 250);
        });

    }); // end each

}); // end ready