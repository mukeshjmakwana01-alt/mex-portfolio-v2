/* =====================================================
   MEX — INTERACTION SYSTEM
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {


    /* =================================================
       REVEAL SYSTEM
       ================================================= */

    function startReveal() {

        const revealItems =
            document.querySelectorAll(".reveal-item");

        if (!revealItems.length) {
            return;
        }

        const revealObserver =
            new IntersectionObserver(
                (entries) => {

                    entries.forEach((entry) => {

                        if (entry.isIntersecting) {

                            entry.target.classList.add("show");

                        }

                    });

                },
                {
                    threshold: 0.1,
                    rootMargin: "0px 0px -80px 0px"
                }
            );

        revealItems.forEach((item) => {

            revealObserver.observe(item);

        });

    }

    setTimeout(startReveal, 2500);

});