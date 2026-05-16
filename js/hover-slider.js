jQuery(document).ready(function($) {
    
    function initHoverSlider($container) {
        $container = $container || $(document);
        
        $container.find('.product-hover-image').each(function() {
            const $img = $(this);
            const images = $img.data('images');
            let index = 0;
            let interval;

            // Prevent double-binding
            $img.closest('.hover-gallery-container')
                .off('mouseenter.hoverslider mouseleave.hoverslider')
                .on('mouseenter.hoverslider', function() {
                    if (!images || images.length <= 1) return;
                    interval = setInterval(() => {
                        index = (index + 1) % images.length;
                        $img.attr('src', images[index]);
                        $(this).find('.image-dot').removeClass('active').eq(index).addClass('active');
                    }, 1000);
                })
                .on('mouseleave.hoverslider', function() {
                    clearInterval(interval);
                    index = 0;
                    $img.attr('src', $img.data('main-image'));
                    $(this).find('.image-dot').removeClass('active').eq(0).addClass('active');
                });
        });
    }

    // Init on page load
    initHoverSlider();

    // Re-init when quick view opens
    $(document.body).on('quick-view-opened', function(e, $content) {
        initHoverSlider($content);
    });

});