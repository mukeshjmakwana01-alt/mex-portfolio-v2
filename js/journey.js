(() => {
    const journey = document.querySelector("#journey.journey-section");

    if (!journey) {
        return;
    }

    const timeline = journey.querySelector(".journey-list");
    const milestones = [...journey.querySelectorAll(".journey-milestone")];

    if (!timeline || milestones.length === 0) {
        return;
    }

    journey.classList.add("journey-pending");

    let started = false;

    function startJourney() {
        if (started) {
            return;
        }

        started = true;
        journey.classList.remove("journey-pending");

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            milestones.forEach(milestone => milestone.classList.add("is-revealed"));
            timeline.style.setProperty("--journey-progress", "1");
            return;
        }

        const revealDelay = 760;
        let index = 0;

        function revealNextMilestone() {
            const milestone = milestones[index];
            milestone.classList.add("is-revealed");

            if (index > 0) {
                timeline.style.setProperty("--journey-progress", String(index / (milestones.length - 1)));
            }

            index += 1;

            if (index < milestones.length) {
                window.setTimeout(revealNextMilestone, revealDelay);
            }
        }

        revealNextMilestone();
    }

    if (!("IntersectionObserver" in window)) {
        function checkJourneyVisibility() {
            const bounds = journey.getBoundingClientRect();

            if (bounds.top < window.innerHeight && bounds.bottom > 0) {
                window.removeEventListener("scroll", checkJourneyVisibility);
                window.removeEventListener("resize", checkJourneyVisibility);
                startJourney();
            }
        }

        window.addEventListener("scroll", checkJourneyVisibility, { passive: true });
        window.addEventListener("resize", checkJourneyVisibility);
        checkJourneyVisibility();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            startJourney();
        }
    }, { threshold: 0.15 });

    observer.observe(journey);
})();
