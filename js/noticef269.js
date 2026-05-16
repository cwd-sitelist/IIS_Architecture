jQuery(document).ready(function($) {  
    // Store state to prevent unnecessary updates
    var cartState = {
        lastUpdate: 0,
        pendingUpdate: false,
        updateTimeout: null,
        miniCartOpen: false,
        activeRequests: new Map(),
        quickShopOpen: false
    };
    
    // Debounce function to limit the rate at which a function can fire
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Throttle function to limit the number of times a function can be called
    function throttle(func, limit) {
        var inThrottle;
        return function() {
            var args = arguments;
            var context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() { 
                    inThrottle = false; 
                }, limit);
            }
        };
    }
    
    // Enhanced loading state management
    function setLoadingState($container, isLoading) {
        if (isLoading) {
            $container.addClass('loading cart-updating');
            
            // Disable all buttons in the container
            $container.find('.plus-btn, .minus-btn, .mini-cart-plus-btn, .mini-cart-minus-btn, .quantity-btn').prop('disabled', true);
            
            // Add visual loading indicator
            var $input = $container.find('.qty, .mini-cart-qty');
            if (!$container.find('.loading-spinner').length) {
                $input.after('<div class="loading-spinner" style="display:inline-block;position: absolute;top: 0;right: 0;left: 0;bottom: 0;margin: auto;width:16px;height:16px;border:2px solid var(--color-set-one-1);border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>');
                
                // Add CSS animation if not already present
                if (!$('#cart-loading-styles').length) {
                    $('head').append('<style id="cart-loading-styles">@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .cart-updating .qty, .cart-updating .mini-cart-qty { opacity: 0.7; } .loading .plus-btn, .loading .minus-btn, .loading .mini-cart-plus-btn, .loading .mini-cart-minus-btn { opacity: 0.5; cursor: not-allowed; }</style>');
                }
            }
            
            // Store original quantity for potential rollback
            var currentQuantity = parseInt($input.val()) || 0;
            $container.data('original-quantity', currentQuantity);
            
        } else {
            $container.removeClass('loading cart-updating');
            
            // Remove loading spinner
            $container.find('.loading-spinner').remove();
            
            // Re-enable buttons based on current state
            var currentQuantity = parseInt($container.find('.qty, .mini-cart-qty').val()) || 0;
            var maxStock = parseInt($container.data('max-stock')) || null;
            
            updateButtonStates($container, currentQuantity, maxStock);
        }
    }
    
    // Combined function to update all cart-related UI elements
    function updateCartUI(options) {
        var now = Date.now();
        
        // Default options
        var defaults = {
            updatePrice: true,
            updateCount: true,
            updateControls: true,
            updateMiniCart: false,
            force: false,
            context: null,
            updateArchiveControls: true
        };
        
        // Merge options with defaults
        options = options || {};
        var settings = {};
        for (var key in defaults) {
            settings[key] = options.hasOwnProperty(key) ? options[key] : defaults[key];
        }
        
        // Skip if update is too recent unless forced
        if (!settings.force && now - cartState.lastUpdate < 300) {
            if (!cartState.pendingUpdate) {
                cartState.pendingUpdate = true;
                clearTimeout(cartState.updateTimeout);
                cartState.updateTimeout = setTimeout(function() {
                    cartState.pendingUpdate = false;
                    var newSettings = {};
                    for (var key in settings) {
                        newSettings[key] = settings[key];
                    }
                    newSettings.force = true;
                    updateCartUI(newSettings);
                }, 300);
            }
            return;
        }
        
        cartState.lastUpdate = now;
        cartState.pendingUpdate = false;
        
        // Create a single AJAX request that returns all the data we need
        $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'get_cart_data',
                nonce: ajax_object.nonce,
                update_price: settings.updatePrice,
                update_count: settings.updateCount,
                update_controls: settings.updateControls,
                update_mini_cart: settings.updateMiniCart
            },
            success: function(response) {
                if (!response.success) {
                    console.error(ajax_object.i18n.console_error_updating || 'Error updating cart UI:', response.data ? response.data.message : '');
                    return;
                }
                
                var data = response.data;
                
                // Update cart total price if requested and available
                if (settings.updatePrice && data.total_price) {
                    $('.total-price-container').html('<span class="total-price">' + data.total_price + '</span>');
                }
                
                // Update mini cart count if requested and available
                if (settings.updateCount && data.cart_count !== undefined) {
                    $('.mini-cart-icon').text(data.cart_count);
                    // Also update other cart count elements that might exist
                    $('.cart-count, .cart-counter, .mini-cart-count').text(data.cart_count);
                }
                
                // Update quantity controls if requested and available
                if (settings.updateControls && data.cart_items) {
                    updateQuantityControlsFromData(data.cart_items, settings.context);
                }
                
                // Update archive page controls if requested
                if (settings.updateArchiveControls && data.cart_items) {
                    updateArchiveControls(data.cart_items);
                }
                
                // Update mini cart content if requested and available
                if (settings.updateMiniCart && data.mini_cart_html) {
                    var $miniCartContent = $('#mini_cart .widget_shopping_cart_content, #mini-cart-sidebar .widget_shopping_cart_content');
                    if ($miniCartContent.length) {
                        $miniCartContent.html(data.mini_cart_html);
                    }
                }
            },
            error: function(xhr, status, error) {
                console.error(ajax_object.i18n.ajax_error || 'AJAX Error:', status, error);
            }
        });
    }
    
    // Update archive page controls based on cart data
    function updateArchiveControls(cartItems) {
$('.simple-add-to-cart-button, .archive-quantity-controls, .custom-quantity-controls').each(function() {
            var $element = $(this);
            var $productItem = $element.closest('.product, li, .woocommerce-loop-product__link').parent();
            var productId = parseInt($element.data('product_id')) || parseInt($element.data('product-id')) ||
                           parseInt($productItem.find('[data-product_id]').data('product_id')) ||
                           parseInt($productItem.find('[data-product-id]').data('product-id'));
            
            if (!productId) return;
            
            var foundQuantity = 0;
            
            // Find matching cart item for simple products
            for (var i = 0; i < cartItems.length; i++) {
                var cartItem = cartItems[i];
                if (parseInt(cartItem.product_id) === productId && !cartItem.variation_id) {
                    foundQuantity = parseInt(cartItem.quantity) || 0;
                    break;
                }
            }
            
            if (foundQuantity > 0) {
                // Show quantity controls
                if ($element.hasClass('simple-add-to-cart-button')) {
                    var $replacement = $(
                        '<div class="archive-quantity-controls" data-product-id="' + productId + '" data-product-type="simple">' +
                            '<div class="quantity-buttons quantity_show">' +
                                '<button class="minus-btn">-</button>' +
                                '<input type="number" class="qty" value="' + foundQuantity + '" min="0" step="1" readonly>' +
                                '<button class="plus-btn">+</button>' +
                            '</div>' +
                        '</div>'
                    );
                    $element.replaceWith($replacement);
              } else if ($element.hasClass('archive-quantity-controls')) {
            $element.find('.qty').val(foundQuantity);
            $element.find('.quantity-buttons').addClass('quantity_show').show();
            updateButtonStates($element, foundQuantity, null);
}
       } else {
    // Show add to cart button
  if ($element.hasClass('archive-quantity-controls')) {
        var $replacement = $(
           '<button class="simple-add-to-cart-button theme-button-new nbutton-style-1" data-product_id="' + productId + '">' +
                '<i class="button-icon icon-before decorias-shopping-bag"></i> <span>' + (ajax_object.i18n.add_to_cart || 'Add to cart') + '</span>' +
            '</button>'
        );
        $element.replaceWith($replacement);
    }
}
        });
    }
    
    // Get variation data from form with improved quick view support
    function getVariationData($container) {
        var variationData = {};
        var variationId = 0;
        
        var $variationsForm = $container.closest('.variations_form');
        
        if (!$variationsForm.length) {
            var $parentModal = $container.closest('.quick-view-modal, .quick-view-inner, .quick-shop-content');
            if ($parentModal.length) {
                $variationsForm = $parentModal.find('.variations_form');
            }
        }
        
        if (!$variationsForm.length) {
            $variationsForm = $container.closest('.product, .woocommerce').find('.variations_form');
        }
        
        if ($variationsForm.length) {
            var $variationIdInput = $variationsForm.find('input[name="variation_id"], input.variation_id');
            if ($variationIdInput.length && $variationIdInput.val()) {
                variationId = parseInt($variationIdInput.val());
            }
            
            if (!variationId) {
                variationId = parseInt($container.data('variation-id')) || 0;
            }
            
            $variationsForm.find('.variations select, select[name^="attribute_"]').each(function() {
                var $select = $(this);
                var attributeName = $select.attr('name');
                var selectedValue = $select.val() || '';
                
                if (attributeName && attributeName !== 'variation_id') {
                    variationData[attributeName] = selectedValue;
                }
            });
        }
        
        return {
            variationData: variationData,
            variationId: variationId
        };
    }
    
    // Validate variation selection
    function validateVariationSelection($container) {
        var $variationsForm = $container.closest('.variations_form');
        
        if (!$variationsForm.length) {
            var $parentModal = $container.closest('.quick-view-modal, .quick-view-inner, .quick-shop-content');
            if ($parentModal.length) {
                $variationsForm = $parentModal.find('.variations_form');
            }
        }
        
        if (!$variationsForm.length) {
            return { isValid: true, message: '' };
        }
        
        var variationInfo = getVariationData($container);
        
        if (!variationInfo.variationId || variationInfo.variationId === 0) {
            return { 
                isValid: false, 
                message: ajax_object.i18n.select_variation || 'Please select product options.' 
            };
        }
        
        return { isValid: true, message: '' };
    }
    
    // Update quantity controls based on cart data with context support
    function updateQuantityControlsFromData(cartItems, context) {
        var $searchContext = context ? $(context) : $(document);
        
        $searchContext.find('.custom-quantity-controls, .mini-cart-quantity-controls').each(function() {
            var $container = $(this);
            
            // Skip if currently loading to prevent conflicts
            if ($container.hasClass('loading')) {
                return;
            }
            
            var productId = parseInt($container.data('product-id'));
            var variationId = parseInt($container.data('variation-id')) || 0;
            var cartItemKey = $container.data('cart-item-key') || '';
            var variationDataAttr = $container.data('variation-data');
            
            // Parse variation data if it exists
            var variationDataFromAttr = {};
            if (variationDataAttr) {
                try {
                    if (typeof variationDataAttr === 'string') {
                        variationDataFromAttr = JSON.parse(variationDataAttr);
                    } else if (typeof variationDataAttr === 'object') {
                        variationDataFromAttr = variationDataAttr;
                    }
                } catch (e) {
                    console.log('Error parsing variation data:', e);
                }
            }
            
            if (!productId) {
                var $productContext = $container.closest('.product, .quick-view-inner, .quick-shop-content, [data-product_id], [data-product-id]');
                if ($productContext.length) {
                    productId = parseInt($productContext.data('product_id')) || parseInt($productContext.data('product-id'));
                    if (productId) {
                        $container.data('product-id', productId);
                    }
                }
            }
            
            if (!productId) {
                return;
            }
            
            // If we have cart item key, try to match by that first (most reliable for cart page)
            var foundQuantity = 0;
            var maxStock = null;
            var matchedItem = null;
            
            if (cartItemKey) {
                // Direct match by cart item key (cart page)
                for (var i = 0; i < cartItems.length; i++) {
                    var cartItem = cartItems[i];
                    if (cartItem.cart_item_key === cartItemKey) {
                        matchedItem = cartItem;
                        break;
                    }
                }
            } else {
                // Match by product and variation (product pages, quick view)
                var currentVariation = getVariationData($container);
                var currentVariationId = variationId || currentVariation.variationId;
                
                for (var i = 0; i < cartItems.length; i++) {
                    var cartItem = cartItems[i];
                    
                    if (parseInt(cartItem.product_id) !== productId) {
                        continue;
                    }
                    
                    // For simple products (no variation)
                    if (!currentVariationId && !cartItem.variation_id) {
                        matchedItem = cartItem;
                        break;
                    }
                    
                    // For variable products
                    if (currentVariationId && parseInt(cartItem.variation_id) === currentVariationId) {
                        var cartAttributes = cartItem.variation_attributes || {};
                        var currentAttributes = variationDataFromAttr;
                        
                        // If no variation data from attribute, get from form
                        if (Object.keys(currentAttributes).length === 0) {
                            currentAttributes = currentVariation.variationData;
                        }
                        
                        var attributesMatch = true;
                        
                        if (Object.keys(currentAttributes).length > 0) {
                            for (var key in currentAttributes) {
                                var currentValue = currentAttributes[key];
                                var cartValue = cartAttributes[key] || '';
                                
                                if (currentValue && currentValue !== cartValue) {
                                    attributesMatch = false;
                                    break;
                                }
                            }
                        }
                        
                        if (attributesMatch) {
                            matchedItem = cartItem;
                            break;
                        }
                    }
                }
            }
            
            if (matchedItem) {
                foundQuantity = parseInt(matchedItem.quantity) || 0;
                maxStock = matchedItem.max_stock;
            }
            
            var $input = $container.find('.qty, .mini-cart-qty');
            var currentInputValue = parseInt($input.val()) || 0;
            
            // Only update if value has actually changed to prevent cursor jumping
            if (currentInputValue !== foundQuantity) {
                $input.val(foundQuantity);
                // Also update quantity display in mini cart
                var $quantitySpan = $container.closest('li').find('.quantity');
                if ($quantitySpan.length && matchedItem) {
                    // Extract price from existing content or use product data
                    var currentText = $quantitySpan.text();
                    var priceMatch = currentText.match(/×\s*(.+)$/);
                    if (priceMatch) {
                        $quantitySpan.html(foundQuantity + ' × ' + priceMatch[1]);
                    }
                }
            }
            
            updateButtonStates($container, foundQuantity, maxStock);
        });
    }
    
    // Update button states based on quantity and stock
    function updateButtonStates($container, quantity, maxStock) {
        var $minusBtn = $container.find('.minus-btn, .mini-cart-minus-btn');
        var $plusBtn = $container.find('.plus-btn, .mini-cart-plus-btn');
        
        // Don't update button states if currently loading
        if ($container.hasClass('loading')) {
            return;
        }
        
        $minusBtn.prop('disabled', quantity <= 0);
        
        // Enable/disable plus button based on stock
        if (maxStock && quantity >= maxStock) {
            $plusBtn.prop('disabled', true);
        } else {
            $plusBtn.prop('disabled', false);
        }
    }
    
    // Throttled version of updateCartUI to prevent multiple rapid calls
    var throttledUpdateCartUI = throttle(updateCartUI, 300);
    
    // Handle quantity button clicks - ENHANCED WITH PROPER LOADING STATES
    $(document).on('click', '.plus-btn, .minus-btn, .mini-cart-plus-btn, .mini-cart-minus-btn, .quantity-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var $button = $(this);
        var $container = $button.closest('.custom-quantity-controls, .archive-quantity-controls, .mini-cart-quantity-controls');
        var $input = $container.find('.qty, .mini-cart-qty');
        
        // Prevent double clicks and check if already loading
        if ($container.hasClass('loading') || $button.prop('disabled')) {
            return false;
        }
        
        var productId = parseInt($container.data('product-id'));
        var variationId = parseInt($container.data('variation-id')) || 0;
        var cartItemKey = $container.data('cart-item-key') || '';
        var variationDataAttr = $container.data('variation-data');
        var maxStock = parseInt($container.data('max-stock')) || null;
        
        // Parse variation data if it exists
        var variationDataFromAttr = {};
        if (variationDataAttr) {
            try {
                if (typeof variationDataAttr === 'string') {
                    variationDataFromAttr = JSON.parse(variationDataAttr);
                } else if (typeof variationDataAttr === 'object') {
                    variationDataFromAttr = variationDataAttr;
                }
            } catch (e) {
                console.log('Error parsing variation data:', e);
            }
        }
        
        if (!productId) {
            console.error(ajax_object.i18n.product_not_found || 'Product ID not found');
            return;
        }
        
        var currentQuantity = parseInt($input.val()) || 0;
        var isIncrease = $button.hasClass('plus-btn') || $button.hasClass('mini-cart-plus-btn') || $button.data('action') === 'increase';
        var newQuantity = isIncrease ? currentQuantity + 1 : Math.max(0, currentQuantity - 1);
        
        // Check stock limits before making request
        if (maxStock && newQuantity > maxStock) {
            showNotification('Maximum stock quantity reached: ' + maxStock, 'warning');
            return;
        }
        
        // Set loading state BEFORE making any changes
        setLoadingState($container, true);
        
        // DON'T update input immediately - wait for server response
        // This prevents the flickering issue you described
        
        // Use mini cart update for items with cart item key
        if (cartItemKey) {
            updateMiniCartItem(productId, variationId, cartItemKey, newQuantity, $container);
        } else {
            // For non-mini cart items
            var variationInfo = { variationId: variationId, variationData: variationDataFromAttr };
            var validation = { isValid: true, message: '' };
            
            // For non-cart pages (product pages, archive), get variation data from form
            if ($container.hasClass('custom-quantity-controls') && !cartItemKey) {
                var formVariationInfo = getVariationData($container);
                validation = validateVariationSelection($container);
                
                if (!validation.isValid) {
                    showNotification(validation.message, 'error');
                    setLoadingState($container, false);
                    return;
                }
                
                // Use form variation data if no data attributes
                if (!variationId && formVariationInfo.variationId) {
                    variationInfo.variationId = formVariationInfo.variationId;
                }
                if (Object.keys(variationInfo.variationData).length === 0) {
                    variationInfo.variationData = formVariationInfo.variationData;
                }
            }
            
            updateCart($container, newQuantity, productId, variationInfo.variationId, variationInfo.variationData);
        }
    });
    
    // Handle simple add to cart button clicks
    $(document).on('click', '.simple-add-to-cart-button', function(e) {
        e.preventDefault();
        
        var $button = $(this);
        var productId = parseInt($button.data('product_id'));
        
        if (!productId) {
            console.error('Product ID not found');
            return;
        }
        
        var originalHTML = $button.html();
        $button.html('<i class="decorias-shopping-bag mr-5"></i> <span>' + (ajax_object.i18n.loading || 'Loading...') + '</span>').prop('disabled', true);
        
        $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'simple_add_to_cart',
                product_id: productId,
                nonce: ajax_object.nonce
            },
            success: function(response) {
                if (response.success) {
                    showNotification(response.data.message, 'success', response.data.product_image);
                    
                    var $replacement = $(
                        '<div class="archive-quantity-controls" data-product-id="' + productId + '" data-product-type="simple">' +
                            '<div class="quantity-buttons quantity_show">' +
                                '<button class="minus-btn">-</button>' +
                                '<input type="number" class="qty" value="1" min="0" step="1" readonly>' +
                                '<button class="plus-btn">+</button>' +
                            '</div>' +
                        '</div>'
                    );
                    $button.replaceWith($replacement);
                    
                    setTimeout(function() {
                        updateCartUI({
                            updateControls: true,
                            updateCount: true,
                            updatePrice: true,
                            updateArchiveControls: true,
                            updateMiniCart: true, // Added to update mini-cart
                            force: true
                        });
                    }, 300); // Increased timeout to 300ms
                    
                    triggerCartUpdates();
                    
                } else {
                    showNotification(response.data.message || 'Error adding to cart', 'error');
                    $button.html(originalHTML).prop('disabled', false);
                }
            },
            error: function() {
                showNotification('Network error occurred', 'error');
                $button.html(originalHTML).prop('disabled', false);
            }
        });
    });
    
    $(document).on('click', '.quick-shop-button', function(e) {
        e.preventDefault();
        
        var $button = $(this);
        var productId = parseInt($button.data('product_id'));
        
        if (!productId) {
            console.error('Product ID not found');
            return;
        }
        
        if (cartState.quickShopOpen) {
            return;
        }
        
        // Store original HTML content instead of just text
        var originalHTML = $button.html();
        
        // Update only the span text, keep the icon
        var $span = $button.find('span');
        if ($span.length) {
            $span.text(ajax_object.i18n.loading || 'Loading...');
        } else {
            // Fallback: if no span found, replace all content but preserve structure
            $button.html('<i class="decorias-shopping-bag mr-5"></i> <span>' + (ajax_object.i18n.loading || 'Loading...') + '</span>');
        }
        
        $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'load_variable_product_popup',
                product_id: productId,
                nonce: ajax_object.nonce
            },
            success: function(response) {
                if (response.success) {
                    openQuickShop(response.data.html);
                } else {
                    showNotification(response.data.message || 'Error loading product', 'error');
                }
            },
            error: function() {
                showNotification('Network error occurred', 'error');
            },
            complete: function() {
                // Restore original HTML content
                $button.html(originalHTML);
            }
        });
    });
    
    // Open Quick Shop Modal
    function openQuickShop(html) {
        var $modal = $('#quick-shop-modal');
        if (!$modal.length) {
            $('body').append('<div id="quick-shop-modal" class="quick-shop-modal"><div class="quick-shop-overlay"></div><div class="quick-shop-wrapper"></div></div>');
            $modal = $('#quick-shop-modal');
        }
        
        $modal.find('.quick-shop-wrapper').html(html);
        $modal.fadeIn(300);
        cartState.quickShopOpen = true;
        
        setTimeout(function() {
            $modal.find('.variations_form').each(function() {
                $(this).wc_variation_form();
            });
            
            updateCartUI({
                updateControls: true,
                force: true,
                context: $modal.find('.quick-shop-content'),
                updateArchiveControls: false
            });
        }, 100);
        
        $(document.body).trigger('quick-view-opened', [$modal.find('.quick-shop-content'), $modal.find('[data-product-id]').data('product-id')]);
    }
    
    // Close Quick Shop Modal
    function closeQuickShop() {
        var $modal = $('#quick-shop-modal');
        $modal.fadeOut(300);
        cartState.quickShopOpen = false;
    }
    
    // Quick Shop modal event handlers
    $(document).on('click', '.quick-shop-overlay, .close-quick-shop', function(e) {
        e.preventDefault();
        closeQuickShop();
    });
    
    $(document).on('keydown', function(e) {
        if (e.keyCode === 27 && cartState.quickShopOpen) {
            closeQuickShop();
        }
    });
    
    // Handle gallery thumbnail clicks in quick shop
    $(document).on('click', '.quick-shop-content .gallery-thumb', function() {
        var $thumb = $(this);
        var $mainImage = $thumb.closest('.product-gallery').find('.main-product-image');
        var largeImage = $thumb.data('large-image');
        
        if (largeImage) {
            $mainImage.attr('src', largeImage);
            $mainImage.attr('data-image-id', $thumb.data('image-id'));
            // Update active thumbnail
            $thumb.siblings('.gallery-thumb').removeClass('active');
            $thumb.addClass('active');
        }
    });
    
    // Update cart function with proper variation handling and loading state
    function updateCart($container, quantity, productId, variationId, variationData) {
        variationData = variationData || {};
        
        if (!productId) {
            setLoadingState($container, false);
            return;
        }
        
        var requestKey = productId + '_' + variationId;
        
        if (cartState.activeRequests.has(requestKey)) {
            cartState.activeRequests.get(requestKey).abort();
        }
        
        var xhr = $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'update_cart_quantity',
                product_id: productId,
                variation_id: variationId,
                quantity: quantity,
                variation: variationData,
                nonce: ajax_object.nonce
            },
            beforeSend: function(jqXHR) {
                cartState.activeRequests.set(requestKey, jqXHR);
            },
            success: function(response) {
                if (!response || typeof response !== 'object') {
                    console.error('Invalid response type:', typeof response, response);
                    showNotification('Invalid response from server', 'error');
                    return;
                }
                
                if (response.success) {
                    var data = response.data || {};
                    
                    // Update the input with the actual server response
                    $container.find('.qty, .mini-cart-qty').val(data.updated_quantity || 0);
                    updateButtonStates($container, data.updated_quantity || 0, data.max_stock || null);
                    
                    triggerCartUpdates();
                    
                    if (data.stock_exceeded) {
                        showNotification(data.error_message || 'Stock exceeded', 'error');
                    } else if (data.error_message) {
                        showNotification(data.error_message, 'warning');
                    } else {
                        var productName = data.product_name || 'Product';
                        var updatedQuantity = data.updated_quantity || 0;
                        if (updatedQuantity > 0) {
                            showNotification(productName + ' updated. Quantity: ' + updatedQuantity, 'success', data.product_image || '');
                        } else {
                            showNotification(productName + ' removed from cart', 'success');
                        }
                    }
                    
                    setTimeout(function() {
                        updateCartUI({
                            updateControls: true,
                            updateCount: true,
                            updatePrice: true,
                            updateArchiveControls: true,
                            updateMiniCart: true,
                            force: true
                        });
                    }, 100);
                    
                } else {
                    console.error('Cart update failed. Full response:', response);
                    
                    var errorMessage = 'Error updating cart';
                    if (response.data) {
                        if (typeof response.data === 'string') {
                            errorMessage = response.data;
                        } else if (response.data.message) {
                            errorMessage = response.data.message;
                        }
                    }
                    
                    showNotification(errorMessage, 'error');
                    
                    // Reset the input value on error to original value
                    var originalQuantity = parseInt($container.data('original-quantity')) || 0;
                    $container.find('.qty, .mini-cart-qty').val(originalQuantity);
                }
            },
            error: function(xhr, status, error) {
                if (status !== 'abort') {
                    console.error('AJAX Error:', status, error);
                    showNotification('Network error occurred', 'error');
                    
                    // Reset the input value on error to original value
                    var originalQuantity = parseInt($container.data('original-quantity')) || 0;
                    $container.find('.qty, .mini-cart-qty').val(originalQuantity);
                }
            },
            complete: function() {
                setLoadingState($container, false);
                cartState.activeRequests.delete(requestKey);
            }
        });
    }
    
    // Improved notification function
    function showNotification(message, type, image) {
        image = image || '';
        
        $('.cart-notification').stop(true, true).remove();
        
        if (!message) {
            return;
        }
        
        var $notification = $('<div class="cart-notification"></div>');
        var backgroundColor;
        
        switch(type) {
            case 'success':
                backgroundColor = '#4CAF50';
                break;
            case 'error':
                backgroundColor = '#F44336';
                break;
            case 'warning':
                backgroundColor = '#FFA500';
                break;
            default:
                backgroundColor = '#2196F3';
        }
        
        var content = '';
        
        if (image) {
            content += '<img src="' + image + '" alt="Product" style="width:50px; height:50px; margin-right:10px; float:left;">';
        }
        
        if (message) {
            var cleanMessage = (typeof message === 'string') ? message.replace(/(\* .+?)(\1)+/g, '$1') : String(message);
            content += '<p style="margin:0;">' + cleanMessage + '</p>';
            
            if (type === 'success') {
                content += '<a href="' + ajax_object.cart_url + '" style="color:#fff; text-decoration:underline;">' + (ajax_object.i18n.view_cart || 'View Cart') + '</a> | ';
                content += '<a href="' + ajax_object.checkout_url + '" style="color:#fff; text-decoration:underline;">' + (ajax_object.i18n.checkout || 'Checkout') + '</a>';
            }
        }
        
        $notification.html(content)
            .css({
                'background-color': backgroundColor,
                'color': '#fff',
                'opacity': '0',
                'position': 'fixed',
                'bottom': '20px',
                'right': '20px',
                'max-width': '300px',
                'padding': '15px',
                'border-radius': '5px',
                'z-index': '9999',
                'transition': 'opacity 0.3s ease-in-out',
                'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)'
            })
            .appendTo('body');
        
        $notification.animate({opacity: 1}, 300);
        
        setTimeout(function() {
            if ($notification.length) {
                $notification.animate({opacity: 0}, 300, function() {
                    $(this).remove();
                });
            }
        }, 4000);
    }
    
    // Update mini cart item function - ENHANCED WITH LOADING STATE
    function updateMiniCartItem(productId, variationId, cartItemKey, quantity, $container) {
        var requestKey = 'mini_' + productId + '_' + variationId + '_' + cartItemKey;
        
        if (cartState.activeRequests.has(requestKey)) {
            cartState.activeRequests.get(requestKey).abort();
        }
        
        var xhr = $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'update_mini_cart_item',
                product_id: productId,
                variation_id: variationId,
                cart_item_key: cartItemKey,
                quantity: quantity,
                nonce: ajax_object.nonce
            },
            beforeSend: function(jqXHR) {
                cartState.activeRequests.set(requestKey, jqXHR);
            },
            success: function(response) {
                if (response.success) {
                    var data = response.data || {};
                    
                    // Update the input value with the actual updated quantity from server
                    $container.find('.mini-cart-qty').val(data.updated_quantity || 0);
                    
                    // Update button states
                    updateButtonStates($container, data.updated_quantity || 0, data.max_stock || null);
                    
                    // Update quantity display in mini cart item
                    var $quantityDisplay = $container.closest('.woocommerce-mini-cart-item').find('.quantity');
                    if ($quantityDisplay.length) {
                        var currentText = $quantityDisplay.html();
                        var priceMatch = currentText.match(/&times;\s*(.+)$/);
                        if (priceMatch) {
                            $quantityDisplay.html(data.updated_quantity + ' &times; ' + priceMatch[1]);
                        }
                    }
                    
                    // Trigger WooCommerce events
                    triggerCartUpdates();
                    
                    // Update all cart UI elements
                    setTimeout(function() {
                        updateCartUI({
                            updateMiniCart: true,
                            updateControls: true,
                            updateCount: true,
                            updatePrice: true,
                            updateArchiveControls: true,
                            force: true
                        });
                    }, 100);
                    
                    // Show appropriate notifications
                    if (data.stock_exceeded) {
                        showNotification(data.error_message, 'error');
                    } else if (data.error_message) {
                        showNotification(data.error_message, 'warning');
                    } else if (quantity === 0) {
                        showNotification(
                            (ajax_object.i18n.product_removed || '%s removed from cart').replace('%s', data.product_name),
                            'success'
                        );
                    } else {
                        showNotification(
                            (ajax_object.i18n.product_updated || '%s updated. Quantity: %d').replace('%s', data.product_name).replace('%d', data.updated_quantity),
                            'success'
                        );
                    }
                } else {
                    console.error('Mini cart update failed:', response);
                    showNotification(response.data ? response.data.message : 'Error updating cart', 'error');
                    
                    // Rollback to original quantity
                    var originalQuantity = parseInt($container.data('original-quantity')) || 0;
                    $container.find('.mini-cart-qty').val(originalQuantity);
                    updateButtonStates($container, originalQuantity, null);
                }
            },
            error: function(xhr, status, error) {
                if (status !== 'abort') {
                    console.error('AJAX Error updating mini cart:', status, error);
                    showNotification('Network error occurred', 'error');
                    
                    // Rollback to original quantity
                    var originalQuantity = parseInt($container.data('original-quantity')) || 0;
                    $container.find('.mini-cart-qty').val(originalQuantity);
                    updateButtonStates($container, originalQuantity, null);
                }
            },
            complete: function() {
                setLoadingState($container, false);
                cartState.activeRequests.delete(requestKey);
            }
        });
    }
    
   // Variation form event handlers
$(document).on('hide_variation', '.variations_form', function() {
    var $form = $(this);
    var $container = $form.find('.custom-quantity-controls'); 
   
    $container.data('variation-id', ''); 
    $container.find('.qty').val(0);
    updateButtonStates($container, 0, null);
});

$(document).on('show_variation', '.variations_form', function(event, variation) {
    var $form = $(this);
    var $container = $form.find('.custom-quantity-controls');
    
    if (variation && variation.variation_id) {
        $container.data('variation-id', variation.variation_id);
        
        // Show the entire custom-quantity-controls container
        $container.show().addClass('quantity_show'); 
        
        // Update main image when variation changes
        var $quickShopContent = $form.closest('.quick-shop-content');
        if ($quickShopContent.length) {
            var $mainImage = $quickShopContent.find('.main-product-image');
            var variationImagesData = $quickShopContent.find('.variation-images-data').length 
                ? JSON.parse($quickShopContent.find('.variation-images-data').text()) 
                : {};
            
            if (variationImagesData[variation.variation_id] && variationImagesData[variation.variation_id].src) {
                $mainImage.attr('src', variationImagesData[variation.variation_id].src);
                $mainImage.attr('data-image-id', variationImagesData[variation.variation_id].attachment_id || variation.image_id);
                
                // Update active thumbnail
                var $thumbnails = $quickShopContent.find('.gallery-thumbnails .gallery-thumb');
                $thumbnails.removeClass('active');
                $thumbnails.each(function() {
                    if ($(this).data('large-image') === variationImagesData[variation.variation_id].src) {
                        $(this).addClass('active');
                    }
                });
            }
        }
        
        setTimeout(function() {
            updateCartUI({
                updateControls: true, 
                updatePrice: false, 
                updateCount: false,
                updateMiniCart: false,
                updateArchiveControls: false,
                force: true,
                context: $form.closest('.quick-view-modal, .quick-shop-content, .product, .woocommerce')
            });
        }, 50);
        
        setTimeout(function() {
            updateCartUI({
                updateControls: true,
                updateArchiveControls: false,
                force: true,
                context: $form.closest('.quick-view-modal, .quick-shop-content, .product, .woocommerce')
            });
        }, 200);
    } else {
        // Hide container if no valid variation
        $container.hide().removeClass('quantity_show'); 
        $container.find('.qty').val(0);
        updateButtonStates($container, 0, null);
    }
});
    $(document).on('change', '.variations_form .variations select', function() {
        var $form = $(this).closest('.variations_form');
        var $container = $form.find('.custom-quantity-controls');
        
        setTimeout(function() {
            var $variationIdInput = $form.find('input[name="variation_id"]');
            var variationId = $variationIdInput.val();
            
            if (variationId && variationId !== '0') {
                $container.data('variation-id', variationId);
                
                updateCartUI({ 
                    updateControls: true,
                    updateArchiveControls: false,
                    force: true,
                    context: $form.closest('.quick-view-modal, .quick-shop-content, .product, .woocommerce')
                });
            } else {
                $container.find('.qty').val(0);
                updateButtonStates($container, 0, null); 
            }
        }, 100);
    });
    
    $(document).on('woocommerce_variation_has_changed', '.variations_form', function() {
        var $form = $(this); 
        setTimeout(function() {
            updateCartUI({ 
                updateControls: true,
                updateArchiveControls: false,
                force: true,
                context: $form.closest('.quick-view-modal, .quick-shop-content, .product, .woocommerce')
            });
        }, 150);
    });
    
    // Quick view specific event handlers
    $(document.body).on('quick-view-opened', function(event, $content, productId) {
        setTimeout(function() {
            updateCartUI({
                updateControls: true,
                updateArchiveControls: false,
                force: true,
                context: $content
            });
        }, 300);
    });
    
    // Mini cart handlers
    $(document).on('click', '.decoria_mini_cart_open', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var isCartOpen = $('.mini-cart-sidebar').hasClass('cart-open');
        
        if (!isCartOpen) {
            $('.mini-cart-sidebar').removeAttr('style').addClass('cart-open');
            $('.cart-overlay').fadeIn();
            cartState.miniCartOpen = true;
            
            updateCartUI({
                updateMiniCart: true,
                updateControls: false,
                updateArchiveControls: false,
                force: true
            });
        }
    });
    
    $(document).on('click', '.close-cart, .cart-overlay', function(e) {
        if (e.target === this || $(this).hasClass('close-cart')) {
            e.preventDefault();
            $('.mini-cart-sidebar').removeAttr('style').removeClass('cart-open');
            $('.cart-overlay').fadeOut();
            cartState.miniCartOpen = false;
        }
    });

    $(document).on('keydown', function(e) {
        if (e.keyCode === 27 && cartState.miniCartOpen) {
            $('.mini-cart-sidebar').removeAttr('style').removeClass('cart-open');
            $('.cart-overlay').fadeOut();
            cartState.miniCartOpen = false;
        }
    });
    
    // Trigger WooCommerce cart update events
    function triggerCartUpdates() {
        $(document.body).trigger('wc_fragment_refresh');
        $(document.body).trigger('update_checkout');
        $(document.body).trigger('wc_update_cart');
        $(document.body).trigger('wc_fragments_refreshed');
        $(document.body).trigger('updated_cart_totals');
        
        try {
            if (typeof wc !== 'undefined') {
                if (wc.blocksCheckout && typeof wc.blocksCheckout.refreshCheckoutOrCartPage === 'function') {
                    wc.blocksCheckout.refreshCheckoutOrCartPage();
                } else if (wc.blocks && wc.blocks.refreshCart && typeof wc.blocks.refreshCart === 'function') {
                    wc.blocks.refreshCart();
                }
            }
            
            if (typeof window.wp !== 'undefined' && window.wp.data) {
                var cartStore = window.wp.data.select('wc/store/cart');
                var cartDispatch = window.wp.data.dispatch('wc/store/cart');
                
                if (cartDispatch && typeof cartDispatch.invalidateResolutionForStore === 'function') {
                    cartDispatch.invalidateResolutionForStore();
                }
            }
        } catch (error) {
            console.log('WooCommerce Blocks refresh attempt encountered an issue:', error);
        }
    }
    
    // Consolidated event handlers for cart updates
    $(document.body).on('updated_cart_totals updated_checkout added_to_cart removed_from_cart wc_fragments_refreshed wc_fragments_loaded', function(event) {
      //  console.log('WooCommerce cart event triggered:', event.type);
        setTimeout(function() {
            throttledUpdateCartUI({
                updateMiniCart: true,
                updateControls: true,
                updateCount: true,
                updatePrice: true,
                updateArchiveControls: true,
                force: true
            });
        }, 100);
    });
    
    // Page visibility change handler
    $(document).on('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(function() {
                updateCartUI({ force: true });
            }, 500);
        }
    });
    
    // Initial cart UI updates
    setTimeout(function() {
        updateCartUI({ force: true });
    }, 100);
    
    setTimeout(function() {
        updateCartUI({ force: true });
    }, 1000);

    // Make updateCartUI available globally for external use
    window.updateCartUI = updateCartUI;
    
});