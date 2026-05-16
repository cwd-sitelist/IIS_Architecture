/**
 * iis Popup System JavaScript
 */
(function($) {
    'use strict';
    
    var iisPopup = {
        settings: window.iisPopupSettings || {},
        overlay: null,
        content: null,
        isShown: false,
        isTriggered: false,
        
        init: function() {
            this.overlay = $('#iis-popup-overlay');
            this.content = this.overlay.find('.iis-popup-content');
            
            if (this.overlay.length === 0) {
                return;
            }
            
            this.bindEvents();
            this.initTrigger();
        },
        
        bindEvents: function() {
            var self = this;
            
            // Close button click
            this.overlay.on('click', '.iis-popup-close', function(e) {
                e.preventDefault();
                self.close();
            });
           
            
            // ESC key
            $(document).on('keydown', function(e) {
                if (e.keyCode === 27 && self.isShown) {
                    self.close();
                }
            });
        },
        
        initTrigger: function() {
            var self = this;
            
            switch (this.settings.trigger) {
                case 'page_load':
                    this.show();
                    break;
                    
                case 'time_delay':
                    setTimeout(function() {
                        self.show();
                    }, this.settings.delay * 1000);
                    break;
                    
                case 'scroll_percentage':
                    this.initScrollTrigger();
                    break;
                    
                case 'exit_intent':
                    this.initExitIntentTrigger();
                    break;
            }
        },
        
        initScrollTrigger: function() {
            var self = this;
            var targetPercentage = this.settings.scrollPercentage;
            
            $(window).on('scroll', function() {
                if (self.isTriggered) return;
                
                var scrollTop = $(window).scrollTop();
                var docHeight = $(document).height();
                var winHeight = $(window).height();
                var scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;
                
                if (scrollPercent >= targetPercentage) {
                    self.isTriggered = true;
                    self.show();
                }
            });
        },
        
        initExitIntentTrigger: function() {
            var self = this;
            var hasTriggered = false;
            
            $(document).on('mouseleave', function(e) {
                if (hasTriggered || self.isTriggered) return;
                
                if (e.clientY <= 0) {
                    hasTriggered = true;
                    self.isTriggered = true;
                    self.show();
                }
            });
            
            // Mobile exit intent simulation (back button or tab switch)
            if (this.isMobileDevice()) {
                var startTime = Date.now();
                
                $(window).on('blur', function() {
                    if (hasTriggered || self.isTriggered) return;
                    
                    // Only trigger if user has been on page for at least 5 seconds
                    if (Date.now() - startTime > 5000) {
                        hasTriggered = true;
                        self.isTriggered = true;
                        
                        setTimeout(function() {
                            if (document.hasFocus()) {
                                self.show();
                            }
                        }, 100);
                    }
                });
            }
        },
        
        show: function() {
            if (this.isShown) return;
            
            var self = this;
            this.isShown = true;
            
            // Add animation class
            var animationClass = 'iis-popup-' + this.settings.animation.replace('_', '-');
            this.content.addClass(animationClass);
            
            // Show overlay with fade effect
            this.overlay.fadeIn(300, function() {
                // Focus management for accessibility
                self.content.attr('tabindex', '-1').focus();
                
                // Trap focus within popup
                self.trapFocus();
            });
            
            // Auto close if enabled
            if (this.settings.autoClose) {
                setTimeout(function() {
                    self.close();
                }, this.settings.autoCloseTime * 1000);
            }
            
            // Add body class to prevent scrolling
            $('body').addClass('iis-popup-open');
        },
        
        close: function() {
            if (!this.isShown) return;
            
            var self = this;
            this.isShown = false;
            
            // Remove animation class
            var animationClass = 'iis-popup-' + this.settings.animation.replace('_', '-');
            this.content.removeClass(animationClass);
            
            this.overlay.fadeOut(300, function() {
                // Remove body class
                $('body').removeClass('iis-popup-open');
                
                // Return focus to trigger element or document
                self.returnFocus();
            });
            
            // Set cookie via AJAX
            $.ajax({
                url: this.settings.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'iis_popup_close',
                    nonce: this.settings.nonce
                },
                timeout: 5000,
                error: function() {
                    // Silently fail if AJAX request fails
                    console.log('Popup close request failed');
                }
            });
        },
        
        trapFocus: function() {
            var self = this;
            var focusableElements = this.content.find('a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])');
            var firstElement = focusableElements.first();
            var lastElement = focusableElements.last();
            
            this.content.on('keydown.popup-focus', function(e) {
                if (e.keyCode === 9) { // Tab key
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement[0]) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement[0]) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            });
        },
        
        returnFocus: function() {
            // Remove focus trap
            this.content.off('keydown.popup-focus');
            
            // Return focus to body if no other suitable element
            $('body').focus();
        },
        
        isMobileDevice: function() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth <= 768);
        },
        
        // Public method to manually show popup
        manualShow: function() {
            this.show();
        },
        
        // Public method to manually close popup
        manualClose: function() {
            this.close();
        },
        
        // Public method to check if popup is currently shown
        isVisible: function() {
            return this.isShown;
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        iisPopup.init();
    });
    
    // Make available globally for manual triggering
    window.iisPopup = {
        show: function() {
            iisPopup.manualShow();
        },
        close: function() {
            iisPopup.manualClose();
        },
        isVisible: function() {
            return iisPopup.isVisible();
        }
    };
    
})(jQuery);