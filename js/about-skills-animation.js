(() => {
    const about = document.querySelector("#origin");
    const skills = document.querySelector("#skills");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 600px)").matches;
    const typingSpeed = mobile ? 24 : 38;

    if (!about && !skills) {
        return;
    }

    function typeText(element, text) {
        element.setAttribute("aria-label", text);
        element.textContent = "";
        element.classList.add("is-typing");

        return new Promise(resolve => {
            let index = 0;

            function typeNextCharacter() {
                if (index >= text.length) {
                    element.classList.remove("is-typing");
                    resolve();
                    return;
                }

                const character = text.charAt(index);
                element.append(character);
                index += 1;
                const punctuationPause = /[.,!?]/.test(character) ? 110 : 0;
                window.setTimeout(typeNextCharacter, typingSpeed + punctuationPause);
            }

            typeNextCharacter();
        });
    }

    function revealAboutImmediately() {
        const greeting = about.querySelector("[data-about-greeting]");
        const introduction = about.querySelector(".origin-description");
        if (greeting) {
            greeting.setAttribute("aria-label", greeting.textContent.trim());
        }
        if (introduction) {
            introduction.setAttribute(
                "aria-label",
                introduction.textContent.replace(/\s+/g, " ").trim()
            );
        }
    }

    async function animateAbout() {
        const greeting = about.querySelector("[data-about-greeting]");
        const introduction = about.querySelector(".origin-description");
        if (!greeting || !introduction) {
            return;
        }

        const greetingText = greeting.textContent.replace(/\s+/g, " ").trim();
        const introductionText = introduction.textContent.replace(/\s+/g, " ").trim();

        if (reducedMotion.matches) {
            greeting.setAttribute("aria-label", greetingText);
            greeting.textContent = greetingText;
            introduction.setAttribute("aria-label", introductionText);
            introduction.textContent = introductionText;
            return;
        }

        await typeText(greeting, greetingText);
        await new Promise(resolve => window.setTimeout(resolve, 220));
        await typeText(introduction, introductionText);
    }

    function makeHeadingCharacters() {
        const heading = skills.querySelector("[data-skills-heading]");
        if (!heading) {
            return { heading: null, characterCount: 0 };
        }

        const accent = heading.querySelector("span");
        if (!accent) {
            return { heading, characterCount: 0 };
        }

        const prefix = [...heading.childNodes]
            .filter(node => node !== accent && node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join(" ");
        const accentText = accent.textContent.replace(/\s+/g, " ").trim();
        const fullText = `${prefix} ${accentText}`.trim();
        heading.setAttribute("aria-label", fullText);
        accent.textContent = "";

        let characterIndex = 0;
        const appendCharacters = (parent, text) => {
            for (const character of text) {
                const characterElement = document.createElement("span");
                characterElement.className = "skills-typing-character";
                characterElement.setAttribute("aria-hidden", "true");
                characterElement.style.setProperty("--character-index", String(characterIndex));
                characterElement.textContent = character === " " ? "\u00a0" : character;
                parent.append(characterElement);
                characterIndex += 1;
            }
        };

        heading.replaceChildren();
        appendCharacters(heading, prefix);
        const separator = document.createElement("span");
        separator.className = "skills-typing-character";
        separator.setAttribute("aria-hidden", "true");
        separator.style.setProperty("--character-index", String(characterIndex));
        separator.textContent = "\u00a0";
        heading.append(separator, accent);
        characterIndex += 1;
        appendCharacters(accent, accentText);

        return { heading, characterCount: characterIndex };
    }

    function revealSkillsImmediately() {
        const heading = skills.querySelector("[data-skills-heading]");
        const cards = skills.querySelectorAll(".skill-card");
        if (heading) {
            heading.setAttribute(
                "aria-label",
                heading.textContent.replace(/\s+/g, " ").trim()
            );
        }
        cards.forEach(card => card.classList.add("is-built"));
    }

    function animateSkills() {
        const cards = [...skills.querySelectorAll(".skill-card")];
        const { heading, characterCount } = makeHeadingCharacters();

        if (reducedMotion.matches) {
            if (heading) {
                heading.classList.remove("skills-heading-typing");
            }
            revealSkillsImmediately();
            return;
        }

        if (heading) {
            heading.classList.add("skills-heading-typing");
            window.setTimeout(() => {
                heading.classList.remove("skills-heading-typing");
            }, characterCount * 38 + 100);
        }

        const grid = skills.querySelector(".skills-grid");
        if (!grid) {
            return;
        }

        grid.classList.add("skills-card-constructing");
        const headingDuration = characterCount * 38 + 250;
        cards.forEach((card, index) => {
            window.setTimeout(() => card.classList.add("is-built"), headingDuration + index * 180);
        });
    }

    if (reducedMotion.matches && about) {
        revealAboutImmediately();
    }

    const observedSections = [about, skills].filter(Boolean);
    if (reducedMotion.matches) {
        if (skills) {
            revealSkillsImmediately();
        }
        return;
    }

    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                continue;
            }

            observer.unobserve(entry.target);
            if (entry.target === about) {
                animateAbout();
            } else if (entry.target === skills) {
                animateSkills();
            }
        }
    }, { threshold: 0.2 });

    observedSections.forEach(section => observer.observe(section));
})();
