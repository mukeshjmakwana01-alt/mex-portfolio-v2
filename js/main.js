/* =====================================================
   MEX — PROMAX
   MAIN SYSTEM
   ===================================================== */

const enterBtn = document.getElementById("enter-btn");
const entrySection = document.getElementById("entry");
const mainContent = document.getElementById("main-content");


/* =========================
   ENTER JOURNEY
   ========================= */

if (enterBtn) {

    enterBtn.addEventListener("click", function () {

        // Button temporarily disabled
        enterBtn.disabled = true;

        // Change button text
        enterBtn.innerHTML = "INITIALIZING...";

        // Small delay for system effect
        setTimeout(function () {

            enterBtn.innerHTML = "ACCESS GRANTED";

        }, 900);


        // Reveal main website
        setTimeout(function () {

           entrySection.style.opacity = "0";
        entrySection.style.transform = "scale(1.03)";

        }, 1500);


        // Remove entry screen
        setTimeout(function () {

            entrySection.style.display = "none";

            mainContent.style.display = "block";

        setTimeout(function () {
        mainContent.classList.add("system-active");
        window.scrollTo(0, 0);
            }, 50);

            

        }, 2200);

    });

}