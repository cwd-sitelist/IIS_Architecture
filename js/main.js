
        const serviceSelect = document.getElementById("serviceSelect");
        const rateInput = document.getElementById("rate");
        const costInput = document.getElementById("cost");

        serviceSelect.addEventListener("change", function () {

            const value = this.value;

            if (value) {

                const data = value.split("|");

                rateInput.value = "£" + data[0];
                costInput.value = "£" + data[1];

            } else {

                rateInput.value = "";
                costInput.value = "";
            }

        });


         const openPopup = document.getElementById("openPopup");
        const closePopup = document.getElementById("closePopup");
        const popupForm = document.getElementById("popupForm");

        openPopup.addEventListener("click", () => {
            popupForm.classList.add("active");
        });

        closePopup.addEventListener("click", () => {
            popupForm.classList.remove("active");
        });

        window.addEventListener("click", (e) => {
            if (e.target === popupForm) {
                popupForm.classList.remove("active");
            }
        });


const menuCloseBtn = document.getElementById("menuCloseBtn");
    const mobileMenu = document.querySelector(".mobile_menu_area");

    menuCloseBtn.addEventListener("click", () => {
        mobileMenu.classList.remove("active");
    });


    jQuery(document).ready(function () {
            jQuery("#contactform").on("submit", function (event) {
                event.preventDefault(); // Prevent the form from submitting the default way

                // Clear previous messages
                jQuery("#responseMessage").text("");
                jQuery("#errorMessage").text("");

                // Prepare form data for AJAX
                var formData = new FormData(this);

                // Make the AJAX request
                jQuery.ajax({
                    url: "sendmail.php", // Replace with your server-side script
                    type: "POST",
                    data: formData,
                    contentType: false, // Important for file upload
                    processData: false, // Prevent jQuery from processing the data
                    success: function (response) {
                        jQuery("#responseMessage").text(response); // Display success message
                    },

                    error: function (jqXHR, textStatus, errorThrown) {
                        jQuery("#errorMessage").text("Error occurred: " + textStatus + " - " + errorThrown);
                    },
                });
            });
        });


const heroVideo = document.getElementById("heroVideo");

heroVideo.addEventListener("loadedmetadata", () => {
  heroVideo.playbackRate = 0.5;  // 0.5 = slower, 0.3 = cinematic slow, 1 = normal
});



 function getDataDelay(element, defaultDelay) {
                const delay = element.dataset.delay;
                return delay !== undefined ? parseFloat(delay) || 0 : defaultDelay;
            }

            document.querySelectorAll(".animate-left").forEach((element) => {
                gsap.from(element, {
                    x: -100,
                    opacity: 0,
                    duration: 0.8,
                    delay: getDataDelay(element, 0),
                });
            });

            document.querySelectorAll(".animate-bottom").forEach((element) => {
                gsap.from(element, {
                    y: 100,
                    opacity: 0,
                    duration: 0.8,
                    delay: getDataDelay(element, 0.3),
                });
            });

            document.querySelectorAll(".animate-right").forEach((element) => {
                gsap.from(element, {
                    x: 100,
                    opacity: 0,
                    duration: 0.8,
                    delay: getDataDelay(element, 0.6),
                });
            });