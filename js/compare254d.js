jQuery(document).ready(function($) {
    const Compare = {
        cacheBustUrl(url) {
            const base = url.split('#')[0].split('?')[0];
            return base + '?_=' + Date.now();
        },

        isComparePage() {
            if (compareData.comparePageId === '#') return false;
            const current = window.location.href.split('#')[0].split('?')[0].replace(/\/$/, '');
            const target = compareData.comparePageId.replace(/\/$/, '');
            return current === target || current + '/' === target;
        },

        isShopPage() {
            return window.location.href.includes(compareData.shopUrl);
        },

        refreshNonce() {
            return $.post(compareData.ajax_url, {
                action: 'refresh_compare_nonce',
                security: compareData.compare_nonce
            }).then(res => {
                if (res.success && res.data.nonce) {
                    compareData.compare_nonce = res.data.nonce;
                }
            });
        },

        init() {
            this.bindEvents();
            this.syncCount();
        },

        bindEvents() {
            $(document).on('click', '.compare-button', (e) => this.handleToggle(e));
            $(document).on('click', '.remove-compare-button', (e) => this.handleRemove(e));
            $(document).on('click', '.clear-compare-list', (e) => this.handleClear(e));
        },

        syncCount() {
            $.post(compareData.ajax_url, {
                action: 'get_compare_count',
                security: compareData.compare_nonce
            }).done(res => {
                if (res.success) {
                    $('.compare-count-display, #compare-count').text(res.data.count);
                    $('.compare-count, .compare-count-only').attr('data-count', res.data.count);
                }
            });
        },

        handleToggle(e) {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            if ($btn.hasClass('processing') || $btn.hasClass('disabled')) return;

            const productId = Number($btn.data('product-id'));
            if (!productId) return;

            $btn.addClass('processing').find('span').text(compareData.processingText);

            this.refreshNonce().then(() => {
                $.post(compareData.ajax_url, {
                    action: 'add_to_compare',
                    product_id: productId,
                    security: compareData.compare_nonce
                }).done(res => {
                    if (res.success) {
                        Swal.fire({
                            title: res.data.action === 'added' ? compareData.successTitle : compareData.removedTitle,
                            html: `<p>${res.data.message} ${res.data.compare_link || ''}</p>`,
                            icon: res.data.action === 'added' ? 'success' : 'info',
                            timer: res.data.action === 'added' ? 3000 : 2000,
                            confirmButtonText: compareData.okButtonText
                        });

                        $('.compare-count-display, #compare-count').text(res.data.count);
                        $('.compare-count, .compare-count-only').attr('data-count', res.data.count);

                        const isAdded = res.data.action === 'added';
                        $btn.toggleClass('added', isAdded)
                            .find('span').text(isAdded ? compareData.viewCompareText : compareData.addToCompareText);

                        if (this.isComparePage()) {
                            setTimeout(() => {
                                window.location.href = this.cacheBustUrl(window.location.href);
                            }, 1500);
                        }
                    } else {
                        if (res.data && res.data.message && res.data.message.includes('Maximum')) {
                            Swal.fire({
                                title: compareData.maxProductsTitle.replace('%d', compareData.maxProducts),
                                html: compareData.compareLimitMessage.replace('%d', compareData.maxProducts) + '<br><br>' + compareData.compareLimitRemoveMessage,
                                icon: 'warning',
                                confirmButtonText: compareData.okButtonText,
                                showCancelButton: true,
                                cancelButtonText: compareData.viewCompareListText
                            }).then(result => {
                                if (result.dismiss === Swal.DismissReason.cancel && compareData.comparePageId !== '#') {
                                    window.location.href = compareData.comparePageId;
                                }
                            });
                        } else {
                            Swal.fire({
                                title: compareData.errorTitle,
                                text: res.data?.message || compareData.unknownErrorMessage,
                                icon: 'error',
                                confirmButtonText: compareData.okButtonText
                            });
                        }
                    }
                }).always(() => {
                    $btn.removeClass('processing')
                        .find('span').text($btn.hasClass('added') ? compareData.viewCompareText : compareData.addToCompareText);
                });
            });
        },

        handleRemove(e) {
    e.preventDefault();
    const $btn = $(e.currentTarget);
    if ($btn.hasClass('processing')) return;

    const productId = Number($btn.data('product-id'));
    if (!productId) return;

    $btn.addClass('processing').find('span').text(compareData.removingText);

    this.refreshNonce().then(() => {
        $.post(compareData.ajax_url, {
            action: 'remove_from_compare',
            product_id: productId,
            security: compareData.compare_nonce
        }).done(res => {
            if (res.success) {
                Swal.fire({
                    title: compareData.removedTitle,
                    text: res.data.message,
                    icon: 'success',
                    timer: 2000,
                    confirmButtonText: compareData.okButtonText
                });

                $('.compare-count-display, #compare-count').text(res.data.count);

                if (this.isComparePage()) {
                    setTimeout(() => {
                        window.location.href = this.cacheBustUrl(window.location.href);
                    }, 800);
                }
            }
        }).always(() => {
            $btn.removeClass('processing').find('span').text(compareData.removeText || 'Remove');
        });
    });
},

        handleClear(e) {
            e.preventDefault();
            Swal.fire({
                title: compareData.confirmClearTitle,
                text: compareData.confirmClearText,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: compareData.confirmClearButton,
                cancelButtonText: compareData.cancelButtonText
            }).then(result => {
                if (!result.isConfirmed) return;

                const $btn = $(e.currentTarget);
                $btn.addClass('processing').text(compareData.clearingText);

                this.refreshNonce().then(() => {
                    $.post(compareData.ajax_url, {
                        action: 'clear_compare_list',
                        security: compareData.compare_nonce
                    }).done(res => {
                        if (res.success) {
                            Swal.fire({
                                title: compareData.clearedTitle,
                                text: res.data.message,
                                icon: 'success',
                                timer: 2000,
                                confirmButtonText: compareData.okButtonText
                            });

                            $('.compare-count-display, #compare-count').text('0');
                            $('.compare-count, .compare-count-only').attr('data-count', '0');

                            if (this.isComparePage()) {
                                setTimeout(() => {
                                    window.location.href = this.cacheBustUrl(window.location.href);
                                }, 800);
                            }
                        }
                    }).always(() => {
                        $btn.removeClass('processing').text('Clear Compare List');
                    });
                });
            });
        }
    };

    Compare.init();
});