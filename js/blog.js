jQuery(document).ready(function($) {
    $('.decorialike-button').on('click', function(e) {
        e.preventDefault();
        
        var button = $(this);
        
        // Check if login is required
        if (button.hasClass('login-required')) {
            var loginUrl = button.data('login-url');
            if (confirm('Please log in to like posts. Would you like to log in now?')) {
                window.location.href = loginUrl;
            }
            return;
        }
        
        var postID = button.data('post-id');
        
        $.ajax({
            url: decoriaAjax.ajax_url,
            type: 'POST',
            data: {
                action: 'decoria_post_like_toggle',
                post_id: postID,
                nonce: decoriaAjax.nonce
            },
            success: function(response) {
                if (response.success) {
                    button.find('.decorialike-count').text(response.data.text);
                    button.toggleClass('liked', response.data.liked);
                } else {
                    if (response.data.code === 'login_required') {
                        if (confirm(response.data.message + ' Would you like to log in now?')) {
                            window.location.href = response.data.redirect_url;
                        }
                    } else {
                        alert(response.data.message || 'Error processing your request.');
                    }
                }
            },
            error: function() {
                alert('Error processing your request. Please try again.');
            }
        });
    });
});