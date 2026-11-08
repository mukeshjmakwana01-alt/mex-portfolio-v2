/* =====================================================
   MEX — PROJECTS HORIZONTAL SCROLL
   Sticky Lock → Horizontal Movement
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const projectsSection = document.querySelector(".projects-section");
    const projectsTrack = document.querySelector(".projects-track");

    if (!projectsSection || !projectsTrack) {
        console.log("Projects scroll elements not found.");
        return;
    }

    const LOCK_OFFSET = 80;

    let ticking = false;

    function updateProjects() {

        const sectionTop = projectsSection.offsetTop;
        const sectionHeight = projectsSection.offsetHeight;
        const viewportHeight = window.innerHeight;

        /*
         * Horizontal movement starts only AFTER
         * the Projects screen has moved slightly upward.
         */
        const startPoint = sectionTop + LOCK_OFFSET;

        const horizontalDistance =
            sectionHeight - viewportHeight - LOCK_OFFSET;

        if (horizontalDistance <= 0) {
            return;
        }

        let progress =
            (window.scrollY - startPoint) / horizontalDistance;

        /*
         * Don't move cards before the screen locks.
         */
        progress = Math.max(0, Math.min(1, progress));

        const maxHorizontalMove =
            projectsTrack.scrollWidth -
            projectsSection.clientWidth;

        const translateX =
            progress * maxHorizontalMove;

        projectsTrack.style.transform =
            `translate3d(-${translateX}px, 0, 0)`;

        ticking = false;
    }

    function requestUpdate() {

        if (!ticking) {
            window.requestAnimationFrame(updateProjects);
            ticking = true;
        }

    }

    window.addEventListener("scroll", requestUpdate, {
        passive: true
    });

    window.addEventListener("resize", requestUpdate);

    updateProjects();
});