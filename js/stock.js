jQuery(document).ready(function($) {
    window.updateStockStatus = function() {
        // Cache the variations_form selector
        const $variationForms = $('form.variations_form');
        if ($variationForms.length > 0) {
            $variationForms.each(function() {
                const $form = $(this);
                const productId = $form.data('product_id');
                const $statusElement = $('.product_get_status[data-product-id="' + productId + '"]');
                
                // Handle variation changes
                $form.on('found_variation', function(event, variation) {
                    let stockHtml = '';

                    if (typeof decoriaStockConfig !== 'undefined' && decoriaStockConfig.debug) {
                        console.log('Variation found:', variation);
                    }

                    if (variation.is_on_backorder) {
                        stockHtml = '<div class="product-status backorder font-xs mb_10">' + 
                            (variation.backorders === 'notify' ? decoriaStockText.backorder_notify : decoriaStockText.backorder) + 
                            '</div>';
                    } else if (variation.manage_stock === true) {
                        if (variation.is_in_stock) {
                            stockHtml = '<div class="product-status ' + 
                                (variation.max_qty !== undefined && variation.max_qty > 0 ? 'danger' : 'safe') + 
                                ' font-xs mb_10">' + 
                                (variation.max_qty !== undefined && variation.max_qty > 0 
                                    ? decoriaStockText.only.replace('%s', variation.max_qty) 
                                    : decoriaStockText.in_stock) + 
                                '</div>';
                        } else {
                            stockHtml = '<div class="product-status out-of-stock font-xs mb_10">' + decoriaStockText.out_stock + '</div>';
                        }
                    } else if (variation.parent_manages_stock === true) {
                        if (variation.parent_is_on_backorder) {
                            stockHtml = '<div class="product-status backorder font-xs mb_10">' + 
                                (variation.parent_backorders === 'notify' ? decoriaStockText.backorder_notify : decoriaStockText.backorder) + 
                                '</div>';
                        } else {
                            const parentStockQty = parseInt(variation.parent_stock_qty, 10);
                            stockHtml = '<div class="product-status ' + 
                                (!isNaN(parentStockQty) && parentStockQty > 0 ? 'danger' : 
                                variation.parent_stock_status === 'instock' ? 'safe' : 'out-of-stock') + 
                                ' font-xs mb_10">' + 
                                (!isNaN(parentStockQty) && parentStockQty > 0 
                                    ? decoriaStockText.only.replace('%s', parentStockQty) 
                                    : variation.parent_stock_status === 'instock' ? decoriaStockText.in_stock : decoriaStockText.out_stock) + 
                                '</div>';
                        }
                    } else {
                        const $parentStockElement = $form.closest('.product').find('#parent_stock_status').length > 0 
                            ? $form.closest('.product').find('#parent_stock_status') 
                            : $('#parent_stock_status');
                        
                        const parentIsOnBackorder = $parentStockElement.data('on-backorder') === 'yes';
                        const parentBackorders = $parentStockElement.data('backorders');
                        const parentManagesStock = $parentStockElement.data('manages-stock') === 'yes';
                        const parentStockStatus = $parentStockElement.data('stock-status');
                        const parentStockQty = parseInt($parentStockElement.data('stock-qty'), 10);

                        stockHtml = '<div class="product-status ' + 
                            (parentIsOnBackorder ? 'backorder' : 
                            parentManagesStock && !isNaN(parentStockQty) && parentStockQty > 0 ? 'danger' : 
                            parentStockStatus === 'instock' ? 'safe' : 'out-of-stock') + 
                            ' font-xs mb_10">' + 
                            (parentIsOnBackorder 
                                ? (parentBackorders === 'notify' ? decoriaStockText.backorder_notify : decoriaStockText.backorder) 
                                : parentManagesStock && !isNaN(parentStockQty) && parentStockQty > 0 
                                ? decoriaStockText.only.replace('%s', parentStockQty) 
                                : parentStockStatus === 'instock' ? decoriaStockText.in_stock : decoriaStockText.out_stock) + 
                            '</div>';
                    }

                    if ($statusElement.length > 0) {
                        $statusElement.html(stockHtml);
                    }
                });

                // Reset stock status on variation reset
                $form.on('reset_data', function() {
                    let stockHtml = '';
                    const $parentStockElement = $form.closest('.product').find('#parent_stock_status').length > 0 
                        ? $form.closest('.product').find('#parent_stock_status') 
                        : $('#parent_stock_status');
                    
                    const parentIsOnBackorder = $parentStockElement.data('on-backorder') === 'yes';
                    const parentBackorders = $parentStockElement.data('backorders');
                    const parentManagesStock = $parentStockElement.data('manages-stock') === 'yes';
                    const parentStockStatus = $parentStockElement.data('stock-status');
                    const parentStockQty = parseInt($parentStockElement.data('stock-qty'), 10);

                    stockHtml = '<div class="product-status ' + 
                        (parentIsOnBackorder ? 'backorder' : 
                        parentManagesStock && !isNaN(parentStockQty) && parentStockQty > 0 ? 'danger' : 
                        parentStockStatus === 'instock' ? 'safe' : 'out-of-stock') + 
                        ' font-xs mb_10">' + 
                        (parentIsOnBackorder 
                            ? (parentBackorders === 'notify' ? decoriaStockText.backorder_notify : decoriaStockText.backorder) 
                            : parentManagesStock && !isNaN(parentStockQty) && parentStockQty > 0 
                            ? decoriaStockText.only.replace('%s', parentStockQty) 
                            : parentStockStatus === 'instock' ? decoriaStockText.in_stock : decoriaStockText.out_stock) + 
                        '</div>';

                    if ($statusElement.length > 0) {
                        $statusElement.html(stockHtml);
                    }
                });
            });
        }

        // For any product display on the page (mini-cart, quick view, etc.)
        $(document.body).on('updated_wc_div', function() {
            initVariationForms();
        });

        // Reinitialize when quick view or other modal is opened
        $(document.body).on('quick_view_opened wc_quick_view_loaded', function() {
            setTimeout(function() {
                initVariationForms();
            }, 100);
        });
    };

    // Helper function to initialize forms after Ajax content loads
    function initVariationForms() {
        const $variationForms = $('form.variations_form');
        if ($variationForms.length > 0) {
            $variationForms.each(function() {
                const $form = $(this);
                if (typeof $.fn.wc_variation_form === 'function') {
                    $form.wc_variation_form();
                }
            });
        }
    }

    // Initial call
    updateStockStatus();

    // For Ajax-loaded content or dynamic page updates
    $(document).ajaxComplete(function(event, xhr, settings) {
        if (settings.url && (
            settings.url.indexOf('wc-ajax') !== -1 || 
            settings.url.indexOf('cart') !== -1 || 
            settings.url.indexOf('product') !== -1
        )) {
            setTimeout(function() {
                updateStockStatus();
            }, 200);
        }
    });
});