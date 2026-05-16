/**
 * Steel Variation Swatches JavaScript
 */
(function($) {
    'use strict';
    
    /**
     * SteelSwatches Class
     */
    var SteelSwatches = function() {
        // Store references to commonly used elements
        this.$document = $(document);
        this.$body = $(document.body);
        
        // Initialize a flag to track if we've already initialized
        this.initialized = false;
        
        this.init();
    };
    
    SteelSwatches.prototype = {
        /**
         * Initialize the swatches functionality
         */
        init: function() {
            // Prevent multiple initializations
            if (this.initialized) {
                return;
            }
            
            this.initialized = true;
            this.initSwatches();
            this.initEvents();
            this.initArchiveSwatches();
        },
        
        /**
         * Throttle function to limit how often a function can be called
         * 
         * @param {Function} func - Function to throttle
         * @param {number} wait - Time to wait in milliseconds
         * @return {Function} - Throttled function
         */
        throttle: function(func, wait) {
            var timeout;
            var lastRun = 0;
            
            return function() {
                var context = this;
                var args = arguments;
                var elapsed = Date.now() - lastRun;
                
                var execute = function() {
                    lastRun = Date.now();
                    func.apply(context, args);
                };
                
                if (timeout) {
                    clearTimeout(timeout);
                }
                
                if (elapsed > wait) {
                    execute();
                } else {
                    timeout = setTimeout(execute, wait - elapsed);
                }
            };
        },
        
        /**
         * Setup swatches on page load
         */
        initSwatches: function() {
            // Hide the default select boxes when swatches are available
            $('.steel-swatches').each(function() {
                var $swatchContainer = $(this);
                var $selectBox = $swatchContainer.find('select');
                
                // Hide the select box
                $selectBox.addClass('steel-hidden-select');
                
                // Mark selected swatches
                var selectedValue = $selectBox.val();
                if (selectedValue) {
                    $swatchContainer.find('.steel-swatch[data-value="' + selectedValue + '"]')
                        .addClass('selected');
                }
            });
            
            // Initialize swatch availability
            this.updateSwatchAvailability();
        },
        
        /**
         * Setup all event handlers - with improved delegation
         */
        initEvents: function() {
            // Use event delegation for better performance
            this.$document
                // Swatch click event
                .on('click', '.steel-swatch', this.handleSwatchClick.bind(this))
                // Reset variations event
                .on('click', '.reset_variations', this.resetSwatches)
                // After variation has been found
                .on('found_variation', this.afterFoundVariation)
                // Add to cart from archive
                .on('click', '.steel-archive-add-to-cart-button', this.archiveAddToCart)
                // Handle variation selection change
                .on('change', '.variations select', this.onVariationChange);
                
            // Throttled event handlers for better performance
            this.$document
                // Update swatch availability when the form is shown
                .on('wc_variation_form', this.throttle(this.updateSwatchAvailability.bind(this), 100))
                // Update swatches when variation changes
                .on('woocommerce_update_variation_values', this.throttle(this.updateSwatchAvailability.bind(this), 100));
                
            // Handle reset for archive
            this.$document.on('reset_data', '.steel-archive-swatches', this.archiveReset);
        },
        
        /**
         * Initialize archive page swatches
         */
        initArchiveSwatches: function() {
            // Cache selector for performance
            var $archiveSwatches = $('.steel-archive-swatches');
            
            if (!$archiveSwatches.length) {
                return;
            }
            
            $archiveSwatches.each(function() {
                var $container = $(this);
                $container.find('select').first().trigger('change');
            });
        },
        
        /**
         * Handle swatch click
         * 
         * @param {object} e - Event object
         */
        handleSwatchClick: function(e) {
            e.preventDefault();
            
            var $swatch = $(e.currentTarget);
            
            // Do nothing if already selected or disabled
            if ($swatch.hasClass('selected') || $swatch.hasClass('disabled')) {
                return;
            }
            
            // Cache selectors for better performance
            var $swatchContainer = $swatch.closest('.steel-swatches');
            var $selectBox = $swatchContainer.find('select');
            var value = $swatch.data('value');
            
            // Update select box value
            $selectBox.val(value).trigger('change');
            
            // Update swatch selection (single DOM operation)
            $swatchContainer.find('.steel-swatch.selected').removeClass('selected');
            $swatch.addClass('selected');
            
            // Use requestAnimationFrame for better performance
            requestAnimationFrame(this.updateOtherSwatches.bind(this, $swatchContainer));
            
            // Trigger custom event for other scripts
            this.$document.trigger('steel_swatch_selected', [$selectBox.attr('name'), value]);
        },
        
        /**
         * Update other swatches based on current selection
         * 
         * @param {object} $currentContainer - Current swatch container
         */
        updateOtherSwatches: function($currentContainer) {
            // Check if other attributes need to be updated (for disabled states)
            $('.steel-swatches').each(function() {
                var $container = $(this);
                // Skip the current container
                if ($container.is($currentContainer)) {
                    return;
                }
                
                var $otherSelect = $container.find('select');
                var $swatches = $container.find('.steel-swatch');
                
                // Batch DOM operations for better performance
                var enableSwatches = [];
                var disableSwatches = [];
                
                $swatches.each(function() {
                    var $otherSwatch = $(this);
                    var termValue = $otherSwatch.data('value');
                    
                    // Check if this option is available in the current selection
                    var $option = $otherSelect.find('option[value="' + termValue + '"]');
                    if ($option.length && !$option.prop('disabled')) {
                        enableSwatches.push($otherSwatch[0]);
                    } else {
                        disableSwatches.push($otherSwatch[0]);
                    }
                });
                
                // Apply DOM changes in batches
                $(enableSwatches).removeClass('disabled');
                $(disableSwatches).addClass('disabled');
            });
        },
        
        /**
         * Reset swatches when reset button is clicked
         */
        resetSwatches: function() {
            $('.steel-swatches .steel-swatch.selected').removeClass('selected');
            $('.steel-swatches .steel-swatch.disabled').removeClass('disabled');
            $('.steel-variation-label .selected-value').remove();
        },
        
        /**
         * Update swatch availability based on current selections - optimized
         */
        updateSwatchAvailability: function() {
            var self = this;
            
            $('.variations_form').each(function() {
                var $form = $(this);
                var variationData = $form.data('product_variations');
                
                if (!variationData) {
                    return;
                }
                
                // Get currently selected values (do this once per form)
                var selectedValues = {};
                $form.find('.variations select').each(function() {
                    var attributeName = $(this).attr('name');
                    var value = $(this).val();
                    if (value) {
                        selectedValues[attributeName] = value;
                    }
                });
                
                // Process all attributes at once
                self.processFormAttributes($form, selectedValues, variationData);
            });
        },
        
        /**
         * Process all attributes in a form - extracted for performance
         * 
         * @param {object} $form - The variation form
         * @param {object} selectedValues - Currently selected attribute values
         * @param {array} variationData - Product variations data
         */
        processFormAttributes: function($form, selectedValues, variationData) {
            var self = this;
            
            $form.find('.variations select').each(function() {
                var $select = $(this);
                var attributeName = $select.attr('name');
                var $swatchContainer = $('.steel-swatches[data-attribute="' + attributeName + '"]');
                
                if (!$swatchContainer.length) {
                    return;
                }
                
                // Create a copy of the selected values without this attribute
                var otherSelectedValues = $.extend({}, selectedValues);
                delete otherSelectedValues[attributeName];
                
                // Get all values from the select (do this once)
                var availableValues = [];
                $select.find('option').each(function() {
                    var value = $(this).val();
                    if (value) {
                        availableValues.push(value);
                    }
                });
                
                // Pre-calculate available variations for this attribute (performance optimization)
                var attributeVariations = self.getAttributeVariations(
                    variationData, 
                    attributeName, 
                    otherSelectedValues
                );
                
                // Batch DOM operations
                var $swatches = $swatchContainer.find('.steel-swatch');
                var enableSwatches = [];
                var disableSwatches = [];
                
                $swatches.each(function() {
                    var $swatch = $(this);
                    var swatchValue = $swatch.data('value');
                    
                    // Skip if the value is not in the available values
                    if (availableValues.indexOf(swatchValue) === -1) {
                        disableSwatches.push($swatch[0]);
                        return;
                    }
                    
                    // Use pre-calculated variations
                    if (attributeVariations[swatchValue]) {
                        enableSwatches.push($swatch[0]);
                    } else {
                        disableSwatches.push($swatch[0]);
                    }
                });
                
                // Apply changes in batches
                $(enableSwatches).removeClass('disabled');
                $(disableSwatches).addClass('disabled');
            });
        },
        
        /**
         * Get available variations for an attribute - extracted for performance
         * 
         * @param {array} variationData - All product variations
         * @param {string} attributeName - Current attribute name
         * @param {object} otherSelectedValues - Other selected attribute values
         * @return {object} - Map of available attribute values
         */
        getAttributeVariations: function(variationData, attributeName, otherSelectedValues) {
            var result = {};
            
            // Loop through variations only once
            for (var i = 0; i < variationData.length; i++) {
                var variation = variationData[i];
                
                // Skip if variation is not available
                if (!variation.is_in_stock || !variation.is_purchasable) {
                    continue;
                }
                
                // Check if this variation matches selected attributes
                var isMatch = true;
                for (var attr in otherSelectedValues) {
                    if (variation.attributes[attr] !== '' && 
                        variation.attributes[attr] !== otherSelectedValues[attr]) {
                        isMatch = false;
                        break;
                    }
                }
                
                // If matched, mark this attribute value as available
                if (isMatch) {
                    var attrValue = variation.attributes[attributeName];
                    if (attrValue === '') {
                        // This variation is available for any value of the current attribute
                        return variationData.reduce(function(acc, variation) {
                            if (variation.attributes[attributeName]) {
                                acc[variation.attributes[attributeName]] = true;
                            }
                            return acc;
                        }, {});
                    } else {
                        result[attrValue] = true;
                    }
                }
            }
            
            return result;
        },
        
        /**
         * Update UI after a variation is found
         * 
         * @param {object} e - Event object
         * @param {object} variation - Variation data
         */
        afterFoundVariation: function(e, variation) {
            var $form = $(e.target);
            
            // If it's an archive swatch container
            if ($form.hasClass('steel-archive-swatches')) {
                var $product = $form.closest('.product');
                var $button = $form.find('.steel-archive-add-to-cart-button');
                var $image = $product.find('.woocommerce-loop-product__link img');
                var $price = $product.find('.price');
                
                // Update button
                if (!variation.is_purchasable || !variation.is_in_stock) {
                    $button.text(steel_swatches_params.i18n.select_options)
                           .addClass('disabled');
                } else {
                    $button.text(steel_swatches_params.i18n.add_to_cart)
                           .removeClass('disabled')
                           .data('variation-id', variation.variation_id)
                           .data('variation', JSON.stringify(variation.attributes));
                }
                
                // Update image if available
                if (variation.image && variation.image.src) {
                    // Save original image if not yet saved
                    if (!$image.data('original-src')) {
                        $image.data('original-src', $image.attr('src'));
                    }
                    if (!$image.data('original-srcset') && $image.attr('srcset')) {
                        $image.data('original-srcset', $image.attr('srcset'));
                    }
                    
                    // Set new image
                    $image.attr('src', variation.image.src);
                    if (variation.image.srcset) {
                        $image.attr('srcset', variation.image.srcset);
                    } else {
                        $image.removeAttr('srcset');
                    }
                }
                
                // Update price if available
                if (variation.price_html) {
                    // Save original price if not yet saved
                    if (!$price.data('original-html')) {
                        $price.data('original-html', $price.html());
                    }
                    
                    // Set new price
                    $price.html(variation.price_html);
                }
            }
            
            // Add selected values to labels - do this as a batch operation
            var $labels = $();
            var selectedTexts = [];
            
            $form.find('.variations select').each(function() {
                var $select = $(this);
                var attributeName = $select.attr('name');
                var selectedValue = $select.val();
                var $label = $form.find('label[for="' + $select.attr('id') + '"], .steel-variation-label').first();
                
                // Add to collection for batch processing
                $labels = $labels.add($label.find('.selected-value'));
                
                // If we have a value, prepare the text
                if (selectedValue) {
                    var selectedText = $select.find('option:selected').text();
                    $label.data('selected-text', ': ' + selectedText);
                } else {
                    $label.data('selected-text', '');
                }
            });
            
            // Batch remove existing values
            $labels.remove();
            
            // Batch add new values
            $form.find('label[for], .steel-variation-label').each(function() {
                var $label = $(this);
                var selectedText = $label.data('selected-text');
                
                if (selectedText) {
                    $label.append('<span class="selected-value">' + selectedText + '</span>');
                }
            });
        },
        
        /**
         * Handle variation change from select boxes
         */
        onVariationChange: function() {
            var $select = $(this);
            var value = $select.val();
            var $swatchContainer = $select.closest('.variations')
                                        .find('.steel-swatches[data-attribute="' + $select.attr('name') + '"]');
            
            if (!$swatchContainer.length) {
                return;
            }
            
            // Update swatch selection
            $swatchContainer.find('.steel-swatch.selected').removeClass('selected');
            
            if (value) {
                $swatchContainer.find('.steel-swatch[data-value="' + value + '"]').addClass('selected');
            }
        },
        
        /**
         * Handle archive page add to cart - with debounce
         */
        archiveAddToCart: function(e) {
            e.preventDefault();
            
            var $button = $(this);
            
            // Prevent multiple clicks
            if ($button.hasClass('disabled') || $button.hasClass('loading') || $button.data('processing')) {
                return;
            }
            
            // Mark as processing to prevent double-clicks
            $button.data('processing', true);
            
            var $form = $button.closest('.steel-archive-swatches');
            var productId = $form.data('product_id');
            var variationId = $button.data('variation-id');
            var variation = $button.data('variation');
            
            if (!productId || !variationId) {
                $button.data('processing', false);
                return;
            }
            
            $button.addClass('loading');
            
            $.ajax({
                type: 'POST',
                url: steel_swatches_params.ajax_url,
                data: {
                    action: 'steel_add_to_cart_variation',
                    nonce: steel_swatches_params.nonce,
                    product_id: productId,
                    variation_id: variationId,
                    variation: JSON.stringify(variation),
                    quantity: 1
                },
                success: function(response) {
                    if (response.success) {
                        $button.removeClass('loading').addClass('added');
                        
                        // Trigger WooCommerce events
                        $(document.body).trigger('added_to_cart', [
                            response.data.fragments,
                            response.data.cart_hash,
                            $button
                        ]);
                    } else {
                        $button.removeClass('loading');
                    }
                    $button.data('processing', false);
                },
                error: function() {
                    $button.removeClass('loading');
                    $button.data('processing', false);
                }
            });
        },
        
        /**
         * Handle reset for archive page
         * 
         * @param {object} e - Event object
         */
        archiveReset: function(e) {
            var $form = $(e.target);
            
            if (!$form.hasClass('steel-archive-swatches')) {
                return;
            }
            
            var $product = $form.closest('.product');
            var $button = $form.find('.steel-archive-add-to-cart-button');
            var $image = $product.find('.woocommerce-loop-product__link img');
            var $price = $product.find('.price');
            
            // Reset button
            $button.text(steel_swatches_params.i18n.select_options)
                   .addClass('disabled')
                   .removeData('variation-id')
                   .removeData('variation');
            
            // Reset image
            if ($image.data('original-src')) {
                $image.attr('src', $image.data('original-src'));
                
                if ($image.data('original-srcset')) {
                    $image.attr('srcset', $image.data('original-srcset'));
                } else {
                    $image.removeAttr('srcset');
                }
            }
            
            // Reset price
            if ($price.data('original-html')) {
                $price.html($price.data('original-html'));
            }
        }
    };
    
    // Initialize on document ready - with single instance pattern
    var instance = null;
    $(document).ready(function() {
        if (!instance) {
            instance = new SteelSwatches();
        }
    });
    
    // Initialize when WooCommerce loads variation forms
    $(document).on('wc_variation_form', function() {
        if (!instance) {
            instance = new SteelSwatches();
        }
    });
    
})(jQuery); 