
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