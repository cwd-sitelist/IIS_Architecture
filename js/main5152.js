(function($) {
    "use strict";
    
    $(document).ready(function() {
        var form = $('form[name="post-search"]'),
            searchCache = {},
            debounceTimeout = null,
            currentRequest = null;

        function debounce(func, wait) {
            return function(...args) {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        // Toggle search sidebar
        $('.enableluxsearch').on('click', function(e) {
            e.preventDefault();
            $('.search_sidebar').addClass('active');
        });

        $('.close-btn, .menu-backdrop').on('click', function(e) {
            e.preventDefault();
            $('.search_sidebar').removeClass('active');
        });

        form.each(function() {
            var currentForm = $(this);
            var search = currentForm.find('.search');
            var resultsContainer = currentForm.next('.iis_search-results');
            var currentQuery = '';

            // Input event with debounce
            search.on('input', debounce(function() {
                var query = $(this).val().trim();
                if (query !== currentQuery) {
                    currentQuery = query;
                    searchPostsPages(currentForm, resultsContainer, query);
                }
            }, 300));

            // Clear results when search is cleared
            search.on('keyup', function(e) {
                if (e.keyCode === 27) { // ESC key
                    $(this).val('');
                    resultsContainer.html('').removeClass('active');
                    currentQuery = '';
                }
            });
        });

        function searchPostsPages(form, resultsContainer, query) {
            // Cancel previous request if it exists
            if (currentRequest && currentRequest.readyState !== 4) {
                currentRequest.abort();
            }

            resultsContainer.html('').removeClass('active success');
            query = query.trim();

            if (query.length >= 3) {
                // Validate query length and content
                if (query.length > 100) {
                    displayError(resultsContainer, 'Search query too long');
                    return;
                }

                resultsContainer.removeClass('empty');
                form.find('.search').addClass('loading');

                var nonce = form.find('input[name="search_nonce"]').val() || opt.nonce;
                
                var cacheKey = query;

                if (searchCache[cacheKey]) {
                    displayResults(searchCache[cacheKey], resultsContainer, form);
                } else {
                    currentRequest = $.ajax({
                        url: opt.ajaxUrl,
                        type: 'POST',
                        timeout: 10000, // 10 second timeout
                        data: {
                            action: 'search_all_posts_pages',
                            keyword: query,
                            nonce: nonce
                        },
                        success: function(data) {
                            // Cache successful results
                            searchCache[cacheKey] = data;
                            displayResults(data, resultsContainer, form);
                        },
                        error: function(xhr, status, error) {
                            form.find('.search').removeClass('loading');
                            
                            if (status !== 'abort') {
                                var errorMessage = opt.noResults;
                                
                                if (status === 'timeout') {
                                    errorMessage = 'Search timed out. Please try again.';
                                } else if (xhr.responseJSON && xhr.responseJSON.data) {
                                    errorMessage = xhr.responseJSON.data;
                                }
                                
                                displayError(resultsContainer, errorMessage);
                            }
                        },
                        complete: function() {
                            currentRequest = null;
                        }
                    });
                }
            } else if (query.length > 0 && query.length < 3) {
                form.find('.search').removeClass('loading');
                displayError(resultsContainer, 'Please enter at least 3 characters');
            } else {
                form.find('.search').removeClass('loading');
                resultsContainer.empty().removeClass('active').addClass('empty');
            }
        }

        function displayResults(data, resultsContainer, form) {
            form.find('.search').removeClass('loading');
            
            if (!resultsContainer.hasClass('empty')) {
                if (data && data.length > 0 && !data.includes('no_result') && !data.includes('error')) {
                    resultsContainer.html('<div class="search_inner_box">' + data + '</div>').addClass('active success');
                    
                    // Limit cache size to prevent memory issues
                    var cacheKeys = Object.keys(searchCache);
                    if (cacheKeys.length > 50) {
                        delete searchCache[cacheKeys[0]];
                    }
                } else {
                    displayNoResults(resultsContainer);
                }
            }
        }

        function displayNoResults(resultsContainer) {
            resultsContainer.html('<div class="no_result">' + opt.noResults + '</div>').addClass('active');
        }

        function displayError(resultsContainer, message) {
            resultsContainer.html('<div class="error">' + message + '</div>').addClass('active');
        }

        // Close search results when clicking outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.search_sidebar, .box-header-search').length) {
                $('.search_sidebar').removeClass('active');
                $('.iis_search-results').removeClass('active');
            }
        });

        // Prevent form submission
        form.on('submit', function(e) {
            e.preventDefault();
            return false;
        });

        // Clear cache periodically (every 5 minutes)
        setInterval(function() {
            searchCache = {};
        }, 300000);
    });

})(jQuery);