jQuery(document).ready(function($) {
    const Wishlist = {
        // Add timestamp to URL to bust any cache
        cacheBustUrl(url) {
            const base = url.split('#')[0].split('?')[0];
            return base + '?_=' + Date.now();
        },

        // Check if current page is the wishlist page
        isWishlistPage() {
            if (wishlistData.wishlistPageId === '#' || !wishlistData.wishlistPageId) return false;
            const current = window.location.href.split('#')[0].split('?')[0].replace(/\/$/, '');
            const target = wishlistData.wishlistPageId.replace(/\/$/, '');
            return current === target || current + '/' === target;
        },

        // Refresh nonce if needed (helps with security errors)
        refreshNonce() {
            return $.post(wishlistData.ajax_url, {
                action: 'refresh_wishlist_nonce',
                security: wishlistData.wishlist_nonce
            }).then(res => {
                if (res.success && res.data.nonce) {
                    wishlistData.wishlist_nonce = res.data.nonce;
                }
            });
        },

        // Initial setup
        init() {
            this.bindEvents();
            this.syncCount(); // Update count on page load
            this.initShareButtons();
        },

        // Bind all click events
        bindEvents() {
            $(document).on('click', '.wishlist-button', (e) => this.handleToggle(e));
            $(document).on('click', '.remove-wishlist-button', (e) => this.handleRemove(e));
            $(document).on('click', '.clear-wishlist-list', (e) => this.handleClear(e));
        },

        // Initialize share buttons
        initShareButtons() {
            $(document).on('click', '.wishlist-share-button', (e) => this.handleShare(e));
            $(document).on('click', '.generate-shareable-link', (e) => this.generateShareableLink(e));
        },

        // ✅ NEW: Generate a unique shareable link
        generateShareableLink(e) {
            e.preventDefault();
            
            Swal.fire({
                title: wishlistData.generatingLinkText,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            this.refreshNonce().then(() => {
                $.post(wishlistData.ajax_url, {
                    action: 'generate_shareable_wishlist',
                    security: wishlistData.wishlist_nonce
                }).done(res => {
                    if (res.success && res.data.share_url) {
                        Swal.fire({
                            title: wishlistData.shareableLinkTitle,
                            html: `
                                <p>${wishlistData.shareableLinkMessage}</p>
                                <div style="margin: 20px 0;">
                                    <input type="text" id="shareable-link-input" value="${res.data.share_url}" 
                                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" readonly />
                                </div>
                            `,
                            icon: 'success',
                            confirmButtonText: wishlistData.copyLinkText,
                            showCancelButton: true,
                            cancelButtonText: wishlistData.okButtonText
                        }).then((result) => {
                            if (result.isConfirmed) {
                                this.copyToClipboard(res.data.share_url);
                                Swal.fire({
                                    title: wishlistData.linkCopiedText,
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        });
                        
                        // Auto-select the text for easy copying
                        setTimeout(() => {
                            $('#shareable-link-input').select();
                        }, 100);
                    } else {
                        Swal.fire({
                            title: wishlistData.errorTitle,
                            text: res.data?.message || wishlistData.unknownErrorMessage,
                            icon: 'error',
                            confirmButtonText: wishlistData.okButtonText
                        });
                    }
                }).fail(() => {
                    Swal.fire({
                        title: wishlistData.errorTitle,
                        text: wishlistData.unknownErrorMessage,
                        icon: 'error',
                        confirmButtonText: wishlistData.okButtonText
                    });
                });
            });
        },

        // Handle social sharing (will use generated link when available)
        handleShare(e) {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const platform = $btn.data('sharer');
            const title = $btn.data('title');
            let url = $btn.data('url');
            
            // If there's a share parameter in current URL, use that
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('share')) {
                url = window.location.href;
            }

            const shareUrls = {
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
                telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
                linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
                whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
                email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
            };

            if (shareUrls[platform]) {
                window.open(shareUrls[platform], '_blank', 'width=600,height=400');
            } else {
                // For unsupported platforms, copy to clipboard
                this.copyToClipboard(url);
                Swal.fire({
                    title: wishlistData.copiedTitle,
                    text: wishlistData.copiedMessage,
                    icon: 'success',
                    timer: 2000,
                    confirmButtonText: wishlistData.okButtonText
                });
            }
        },

        // Copy text to clipboard
        copyToClipboard(text) {
            // Try modern clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).catch(() => {
                    this.fallbackCopyToClipboard(text);
                });
            } else {
                this.fallbackCopyToClipboard(text);
            }
        },

        // Fallback copy method
        fallbackCopyToClipboard(text) {
            const $temp = $('<input>');
            $('body').append($temp);
            $temp.val(text).select();
            document.execCommand('copy');
            $temp.remove();
        },

        // Sync wishlist count from server
        syncCount() {
            $.post(wishlistData.ajax_url, {
                action: 'get_wishlist_count',
                security: wishlistData.wishlist_nonce
            }).done(res => {
                if (res.success) {
                    $('.wishlist-count-display, #wishlist-count').text(res.data.count);
                    $('.wishlist-count, .wishlist-count-only').attr('data-count', res.data.count);
                }
            });
        },

        // Handle Add/Remove from product page or anywhere
        handleToggle(e) {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            if ($btn.hasClass('processing') || $btn.hasClass('disabled')) return;

            if (wishlistData.loginRequired === '1' && wishlistData.isUserLoggedIn !== '1') {
                Swal.fire({
                    title: wishlistData.loginRequiredTitle,
                    text: wishlistData.loginRequiredMessage,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: wishlistData.loginButtonText,
                    cancelButtonText: wishlistData.cancelButtonText
                }).then(result => {
                    if (result.isConfirmed) {
                        window.location.href = wishlistData.loginUrl;
                    }
                });
                return;
            }

            const productId = Number($btn.data('product-id'));
            if (!productId) return;

            $btn.addClass('processing').find('span').text(wishlistData.processingText);

            this.refreshNonce().then(() => {
                $.post(wishlistData.ajax_url, {
                    action: 'add_to_wishlist',
                    product_id: productId,
                    security: wishlistData.wishlist_nonce
                }).done(res => {
                    if (res.success) {
                        Swal.fire({
                            title: res.data.action === 'added' ? wishlistData.addedTitle : wishlistData.removedTitle,
                            html: `<p>${res.data.message} ${res.data.wishlist_link || ''}</p>`,
                            icon: res.data.action === 'added' ? 'success' : 'info',
                            timer: res.data.action === 'added' ? 3000 : 2000,
                            confirmButtonText: wishlistData.okButtonText
                        });

                        // Update count everywhere
                        $('.wishlist-count-display, #wishlist-count').text(res.data.count);
                        $('.wishlist-count, .wishlist-count-only').attr('data-count', res.data.count);

                        // Update button state
                        const isAdded = res.data.action === 'added';
                        $btn.toggleClass('added', isAdded)
                            .find('span').text(isAdded ? wishlistData.viewWishlistText : wishlistData.addToWishlistText);

                        // If on wishlist page, force refresh with cache busting
                        if (this.isWishlistPage()) {
                            setTimeout(() => {
                                window.location.href = this.cacheBustUrl(window.location.href);
                            }, 1500);
                        }
                    } else {
                        // Handle max limit or other errors
                        if (res.data && res.data.message && res.data.message.includes('Maximum')) {
                            Swal.fire({
                                title: wishlistData.maxProductsTitle.replace('%d', wishlistData.maxProducts),
                                html: wishlistData.maxProductsMessage.replace('%d', wishlistData.maxProducts) + '<br><br>' + wishlistData.wishlistLimitRemoveMessage,
                                icon: 'warning',
                                confirmButtonText: wishlistData.okButtonText,
                                showCancelButton: true,
                                cancelButtonText: wishlistData.viewWishlistText
                            }).then(result => {
                                if (result.dismiss === Swal.DismissReason.cancel && wishlistData.wishlistPageId !== '#') {
                                    window.location.href = wishlistData.wishlistPageId;
                                }
                            });
                        } else {
                            Swal.fire({
                                title: wishlistData.errorTitle,
                                text: res.data?.message || wishlistData.unknownErrorMessage,
                                icon: 'error',
                                confirmButtonText: wishlistData.okButtonText
                            });
                        }
                    }
                }).always(() => {
                    $btn.removeClass('processing')
                        .find('span').text($btn.hasClass('added') ? wishlistData.viewWishlistText : wishlistData.addToWishlistText);
                });
            });
        },

        // Handle remove from wishlist table
        // Handle remove from wishlist table
handleRemove(e) {
    e.preventDefault();
    const $btn = $(e.currentTarget);
    if ($btn.hasClass('processing')) return;

    const productId = Number($btn.data('product-id'));
    if (!productId) return;

    $btn.addClass('processing').find('span').text(wishlistData.removingText);

    this.refreshNonce().then(() => {
        $.post(wishlistData.ajax_url, {
            action: 'remove_from_wishlist',
            product_id: productId,
            security: wishlistData.wishlist_nonce
        }).done(res => {
            if (res.success) {
                Swal.fire({
                    title: wishlistData.removedTitle,
                    text: res.data.message,
                    icon: 'success',
                    timer: 2000,
                    confirmButtonText: wishlistData.okButtonText
                });

                $('.wishlist-count-display, #wishlist-count').text(res.data.count);
                $('.wishlist-count, .wishlist-count-only').attr('data-count', res.data.count);

                if (this.isWishlistPage()) {
                    setTimeout(() => {
                        window.location.href = this.cacheBustUrl(window.location.href);
                    }, 800);
                }
            } else {
                Swal.fire({
                    title: wishlistData.errorTitle,
                    text: res.data?.message || wishlistData.removeProductFailedMessage,
                    icon: 'error',
                    confirmButtonText: wishlistData.okButtonText
                });
            }
        }).fail(() => {
            Swal.fire({
                title: wishlistData.errorTitle,
                text: wishlistData.removeProductFailedMessage,
                icon: 'error',
                confirmButtonText: wishlistData.okButtonText
            });
        }).always(() => {
            $btn.removeClass('processing').find('span').text(wishlistData.removeText || 'Remove');
        });
    });
},

        // Handle clear entire wishlist
        handleClear(e) {
            e.preventDefault();

            Swal.fire({
                title: wishlistData.confirmClearTitle,
                text: wishlistData.confirmClearText,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: wishlistData.confirmClearButton,
                cancelButtonText: wishlistData.cancelButtonText
            }).then(result => {
                if (!result.isConfirmed) return;

                const $btn = $(e.currentTarget);
                $btn.addClass('processing').text(wishlistData.clearingText);

                this.refreshNonce().then(() => {
                    $.post(wishlistData.ajax_url, {
                        action: 'clear_wishlist_list',
                        security: wishlistData.wishlist_nonce
                    }).done(res => {
                        if (res.success) {
                            Swal.fire({
                                title: wishlistData.clearedTitle,
                                text: res.data.message,
                                icon: 'success',
                                timer: 2000,
                                confirmButtonText: wishlistData.okButtonText
                            });

                            $('.wishlist-count-display, #wishlist-count').text('0');
                            $('.wishlist-count, .wishlist-count-only').attr('data-count', '0');

                            if (this.isWishlistPage()) {
                                setTimeout(() => {
                                    window.location.href = this.cacheBustUrl(window.location.href);
                                }, 800);
                            }
                        } else {
                            Swal.fire({
                                title: wishlistData.errorTitle,
                                text: res.data?.message || wishlistData.clearWishlistFailedMessage,
                                icon: 'error',
                                confirmButtonText: wishlistData.okButtonText
                            });
                        }
                    }).fail(() => {
                        Swal.fire({
                            title: wishlistData.errorTitle,
                            text: wishlistData.clearWishlistFailedMessage,
                            icon: 'error',
                            confirmButtonText: wishlistData.okButtonText
                        });
                    }).always(() => {
                        $btn.removeClass('processing').text('Clear Wishlist List');
                    });
                });
            });
        }
    };

    // Start the wishlist
    Wishlist.init();
});