jQuery(($) => {
    let requestInProgress = false;
    let lastRequestTime = 0;

    const showError = (title, text, retryCallback = null) => {
        const options = {
            icon: 'error',
            title,
            text,
            confirmButtonText: checkout_params.confirm_button_text,
        };
        if (retryCallback) {
            options.showCancelButton = true;
            options.cancelButtonText = checkout_params.cancel_button_text || 'Cancel';
            options.confirmButtonText = checkout_params.retry_button_text || 'Retry';
            options.preConfirm = () => {
                retryCallback();
                return false;
            };
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire(options);
        } else {
            alert(`${title}\n\n${text}`);
            if (retryCallback && confirm(`${title}\n\n${text}\n\nRetry?`)) {
                retryCallback();
            }
        }
    };

    const handleAjaxError = (xhr, status, retryCallback) => {
        const { rate_limit_title, rate_limit_text, error_title, error_text } = checkout_params;
        let title = error_title;
        let message = error_text;

        if (xhr.status === 403) {
            title = checkout_params.permission_denied_title || 'Permission Denied';
            message = checkout_params.permission_denied_text || 'Unable to process request. Please try logging in or refreshing the page.';
        } else if (xhr.status === 429) {
            title = rate_limit_title;
            message = rate_limit_text;
        } else if (status === 'timeout') {
            title = checkout_params.request_timeout_title;
            message = checkout_params.request_timeout_text;
        } else if (xhr.responseJSON?.message) {
            message = xhr.responseJSON.message;
        } else if (xhr.status === 0) {
            title = checkout_params.network_error_title || 'Network Error';
            message = checkout_params.network_error_text || 'Check your internet connection and try again.';
        }

        console.error('Buy Now AJAX Error:', {
            status: xhr.status,
            response: xhr.responseText,
            statusText: xhr.statusText
        });

        showError(title, message, xhr.status === 429 || xhr.status === 403 ? retryCallback : null);
    };

    const redirectToCheckout = (productId, quantity, variationId) => {
        try {
            const { checkout_url, checkout_url_error } = checkout_params;
            if (!checkout_url) throw new Error(checkout_url_error);
            let url = `${checkout_url}?add-to-cart=${encodeURIComponent(productId)}&quantity=${encodeURIComponent(quantity)}`;
            if (variationId > 0) url += `&variation_id=${encodeURIComponent(variationId)}`;
            window.location.href = url;
        } catch (error) {
            showError(checkout_params.redirect_error_title, checkout_params.redirect_error_text);
            console.error('Checkout redirect error:', error);
        }
    };

    const processBuyNow = ($button) => {
        if (requestInProgress) return;

        const now = Date.now();
        if (now - lastRequestTime < checkout_params.rate_limit_duration) {
            showError(checkout_params.rate_limit_title, checkout_params.rate_limit_text, () => processBuyNow($button));
            return;
        }

        requestInProgress = true;
        lastRequestTime = now;
        const $form = $button.closest('form.cart, .product, .wishlist-box, .compare-box');
        const productId = parseInt($button.data('product_id')) || 0;
        let variationId = parseInt($button.data('variation_id')) || 0;
        let quantity = 1;

        if ($form.length) {
            variationId = parseInt($form.find('input[name="variation_id"]').val()) || variationId;
            quantity = parseInt($form.find('.quantity .qty').val()) || 1;
        }

        if (!productId) {
            showError(checkout_params.product_not_found_title, checkout_params.product_not_found_text);
            requestInProgress = false;
            return;
        }

        if (quantity <= 0 || quantity > 999) {
            showError(checkout_params.invalid_quantity_title, checkout_params.invalid_quantity_text);
            requestInProgress = false;
            return;
        }

        const originalText = $button.text();
        $button.addClass('loading').prop('disabled', true).text(checkout_params.loading_text);

        $.ajax({
            type: 'POST',
            url: checkout_params.ajax_url,
            data: {
                action: 'check_product_stock',
                product_id: productId,
                quantity,
                variation_id: variationId,
                nonce: checkout_params.nonce,
            },
            timeout: 15000,
            success(response) {
                console.log('AJAX Success Response:', response);
                
                if (response.success && response.data) {
                    switch (response.data.stock_status) {
                        case 'available':
                            redirectToCheckout(productId, quantity, variationId);
                            break;
                        case 'exceeded':
                            showError(
                                checkout_params.stock_exceeded_title, 
                                checkout_params.stock_exceeded_text.replace('{stock}', response.data.stock_quantity)
                            );
                            break;
                        case 'out_of_stock':
                            showError(checkout_params.out_of_stock_title, checkout_params.out_of_stock_text);
                            break;
                        default:
                            showError(checkout_params.product_not_found_title, checkout_params.product_not_found_text);
                    }
                } else {
                    const errorMessage = response.data?.message || checkout_params.error_text;
                    showError(checkout_params.error_title, errorMessage);
                }
            },
            error(xhr, status) {
                handleAjaxError(xhr, status, () => processBuyNow($button));
            },
            complete() {
                $button.removeClass('loading').prop('disabled', false).text(originalText);
                requestInProgress = false;
            },
        });
    };

    $(document).on('click', '.buy-now-button:not(.disabled)', (e) => {
        e.preventDefault();
        processBuyNow($(e.currentTarget));
    });

    $(document).on('show_variation', 'form.variations_form', (event, variation) => {
        console.log('show_variation triggered', variation);
        if (variation?.variation_id) {
            $(event.target).find('.buy-now-button')
                .removeClass('disabled wc-variation-selection-needed')
                .attr('data-variation_id', variation.variation_id);
        }
    });

    $(document).on('change', 'form.variations_form select, .steel-swatches .steel-swatch', () => {
        const $form = $('form.variations_form');
        const variationId = parseInt($form.find('input[name="variation_id"]').val()) || 0;
        console.log('Variation changed, variation_id:', variationId);
        if (variationId) {
            $form.find('.buy-now-button')
                .removeClass('disabled wc-variation-selection-needed')
                .attr('data-variation_id', variationId);
        }
    });

    $(document).on('hide_variation reset_data', 'form.variations_form', (event) => {
        console.log('hide_variation or reset_data triggered');
        $(event.target).find('.buy-now-button')
            .addClass('disabled wc-variation-selection-needed')
            .attr('data-variation_id', '');
    });

    $(document).on('keydown', '.buy-now-button', (e) => {
        if ([13, 32].includes(e.which)) {
            e.preventDefault();
            $(e.target).trigger('click');
        }
    });

    $(document).on('visibilitychange', () => {
        if (document.hidden) requestInProgress = false;
    });
});