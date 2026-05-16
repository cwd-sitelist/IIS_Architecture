jQuery(($) => {
    const $modal = $('.quick-view-modal');
    const $overlay = $('.quick-view-overlay');
    const $content = $('.quick-view-inner');
    const $loader = $('.quick-view-loader');
    const $closeBtn = $('.quick-view-close');
    let isRequestPending = false;

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const initializeSwiper = ($container = $content) => {
        const $mainSlider = $container.find('.single-product-slider');
        const $thumbsSlider = $container.find('.single-product-thumbs');

        if ($thumbsSlider.length) {
            const thumbsSwiper = new Swiper($thumbsSlider[0], {
                spaceBetween: 10,
                slidesPerView: 4,
                freeMode: true,
                watchSlidesProgress: true,
                navigation: {
                    nextEl: $thumbsSlider.find('.swiper-button-next')[0],
                    prevEl: $thumbsSlider.find('.swiper-button-prev')[0]
                },
                breakpoints: {
                    0: { slidesPerView: 3, spaceBetween: 5 },
                    480: { slidesPerView: 4, spaceBetween: 8 },
                    768: { slidesPerView: 4, spaceBetween: 10 },
                    1024: { slidesPerView: 5, spaceBetween: 10 }
                }
            });

            $thumbsSlider.data('thumbsSwiper', thumbsSwiper);
        }

        if ($mainSlider.length) {
            const mainSwiper = new Swiper($mainSlider[0], {
                spaceBetween: 10,
                slidesPerView: 1,
                thumbs: $thumbsSlider.data('thumbsSwiper') ? { swiper: $thumbsSlider.data('thumbsSwiper') } : null,
                navigation: {
                    nextEl: $mainSlider.find('.swiper-button-next')[0],
                    prevEl: $mainSlider.find('.swiper-button-prev')[0]
                },
                pagination: {
                    el: $mainSlider.find('.swiper-pagination')[0],
                    clickable: true,
                    type: 'bullets'
                }
            });

            $mainSlider.data('mainSwiper', mainSwiper);
            $thumbsSlider.on('click', '.swiper-slide', function() {
                mainSwiper.slideTo($(this).index());
            });
        }
    };

    const initializeVariationForm = () => {
        const $form = $modal.find('.variations_form');
        if (!$form.length) return;

        $form.wc_variation_form();
        $form.on('show_variation', (event, variation) => {
            const $container = $form.find('.custom-quantity-controls');
            $container.data('variation-id', variation.variation_id);
            $container.find('.plus-btn').prop('disabled', !variation.is_in_stock || variation.max_qty === 0);
        });
    };

    const initializeQuantityControls = ($container) => {
        if ($container.find('.quantity-buttons').length) return;

        const $controls = $(`
            <div class="quantity-buttons">
                <button type="button" class="minus-btn" aria-label="Decrease quantity">-</button>
                <input type="number" class="qty" value="0" min="0" step="1" aria-label="Quantity">
                <button type="button" class="plus-btn" aria-label="Increase quantity">+</button>
            </div>
        `);
        $container.append($controls);
    };

    const updateCartUI = () => {
        if (typeof window.updateCartUI === 'function') {
            window.updateCartUI({ updateControls: true, force: true });
        }
    };

    const closeModal = () => {
        const currentRequest = $modal.data('current-request');
        if (currentRequest) currentRequest.abort();
        
        $modal.removeClass('open loading');
        $content.empty();
        isRequestPending = false;
        $(document.body).trigger('quick-view-closed');
    };

    $(document).on('click', '.quick-view-button', function(e) {
        e.preventDefault();
        if (isRequestPending) return;

        isRequestPending = true;
        const $button = $(this);
        const productId = $button.data('product_id');

        $loader.fadeIn(200);
        $modal.addClass('loading');
        $button.addClass('loading');

        const request = $.ajax({
            url: my_quick_view_params.ajax_url,
            type: 'POST',
            data: {
                action: 'my_quick_view',
                product_id: productId,
                nonce: my_quick_view_params.nonce
            },
            success: (response) => {
                $content.html(response);
                $loader.fadeOut(200);
                $modal.removeClass('loading').addClass('open');
                initializeSwiper();
                initializeVariationForm();
                initializeQuantityControls($content.find('.custom-quantity-controls'));
                updateCartUI();
                $(document.body).trigger('quick-view-opened', [$content, productId]);
            },
            error: () => {
                $content.html('<div class="error-message">Failed to load product. Please try again.</div>');
                $modal.removeClass('loading');
                setTimeout(closeModal, 3000);
            },
            complete: () => {
                isRequestPending = false;
                $button.removeClass('loading');
            }
        });

        $modal.data('current-request', request);
    });

    $overlay.add($closeBtn).on('click', closeModal);
    $(document).on('keydown', (e) => {
        if (e.key === 'Escape' && $modal.hasClass('open')) closeModal();
    });

    $(window).on('resize', debounce(() => {
        $('.single-product-slider, .single-product-thumbs').each(function() {
            if (this.swiper) this.swiper.update();
        });
    }, 250));

    $(document.body).on('updated_cart_totals added_to_cart removed_from_cart', () => {
        if ($modal.hasClass('open')) updateCartUI();
    });
});