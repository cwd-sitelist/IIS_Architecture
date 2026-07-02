const width = document.getElementById("width");
const height = document.getElementById("height");
const cost = document.getElementById("cost");

function calculateArea() {
    const w = parseFloat(width.value) || 0;
    const h = parseFloat(height.value) || 0;

    const area = w * h * 15;

    cost.value = `£${area.toFixed(2)}`;
}

width.addEventListener("input", calculateArea);
height.addEventListener("input", calculateArea);


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