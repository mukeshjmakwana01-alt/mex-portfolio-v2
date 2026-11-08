(() => {
    const section = document.querySelector("#skills.skills-section");
    const content = section?.querySelector(".skills-content");
    const grid = section?.querySelector(".skills-grid");
    const heading = section?.querySelector("[data-skills-heading]");
    const cards = [...(section?.querySelectorAll(".skill-card") || [])];

    if (!section || !content || !grid || !heading || cards.length !== 4) {
        return;
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobilePreference = window.matchMedia("(max-width: 700px), (pointer: coarse)");
    const paths = [];
    const cursors = [];
    let observer;
    let frameId = 0;
    let resizeHandler;
    let geometry;
    let startedAt = 0;
    let started = false;
    let finished = false;
    const TIME_SCALE = 1.5;
    const HEADING_CHARACTER_DELAY = 51;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const smooth = value => value * value * (3 - 2 * value);
    const cubic = value => 1 - Math.pow(1 - value, 3);

    function svg(tag, attributes = {}) {
        const element = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, String(value));
        }
        return element;
    }

    const layer = svg("svg", {
        class: "capabilities-swarm-layer",
        "aria-hidden": "true",
        focusable: "false"
    });

    function makePath(className) {
        const path = svg("path", { class: className });
        layer.append(path);
        paths.push(path);
        return path;
    }

    function makeCursor(name, className, shape) {
        const group = svg("g", {
            class: `capabilities-swarm-cursor ${className}`,
            "data-capability-cursor": name
        });
        shape(group);
        layer.append(group);
        const cursor = { group, keyframes: [], easing: cubic };
        cursors.push(cursor);
        return cursor;
    }

    const architect = makeCursor("Architect", "capability-cursor-architect", group => {
        group.append(
            svg("circle", { cx: 0, cy: 0, r: 8 }),
            svg("path", { d: "M-13 0H-5 M5 0H13 M0-13V-5 M0 5V13" }),
            svg("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 1.7 })
        );
    });
    const htmlBuilder = makeCursor("HTML Builder", "capability-cursor-html", group => {
        group.append(
            svg("path", { d: "M-9-8L-3 0L-9 8 M9-8L3 0L9 8" }),
            svg("path", { d: "M-2 10L2-10" })
        );
    });
    const cssBuilder = makeCursor("CSS Builder", "capability-cursor-css", group => {
        group.append(
            svg("polygon", { points: "0,-11 10,-5 10,5 0,11 -10,5 -10,-5" }),
            svg("path", { d: "M-5 0H5 M0-5V5" })
        );
    });
    const javascriptBuilder = makeCursor(
        "JavaScript Builder",
        "capability-cursor-javascript",
        group => {
            group.append(
                svg("path", { d: "M2-11L-7 1H0L-2 11L8-3H1Z" }),
                svg("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 1.4 })
            );
        }
    );
    const aiBuilder = makeCursor("AI Builder", "capability-cursor-ai", group => {
        group.append(
            svg("circle", { cx: 0, cy: 0, r: 3 }),
            svg("circle", { cx: -9, cy: -7, r: 2 }),
            svg("circle", { cx: 9, cy: -7, r: 2 }),
            svg("circle", { cx: -9, cy: 7, r: 2 }),
            svg("circle", { cx: 9, cy: 7, r: 2 }),
            svg("path", { d: "M-7-5L-2-2 M7-5L2-2 M-7 5L-2 2 M7 5L2 2" })
        );
    });

    const mapPath = makePath("capabilities-swarm-map");
    const cardPaths = [
        makePath("capabilities-swarm-card-path capability-card-html"),
        makePath("capabilities-swarm-card-path capability-card-css"),
        makePath("capabilities-swarm-card-path capability-card-javascript"),
        makePath("capabilities-swarm-card-path capability-card-ai")
    ];
    section.append(layer);

    function getSectionRect(rect, sectionRect) {
        return {
            left: rect.left - sectionRect.left,
            right: rect.right - sectionRect.left,
            top: rect.top - sectionRect.top,
            bottom: rect.bottom - sectionRect.top,
            width: rect.width,
            height: rect.height,
            centerX: rect.left - sectionRect.left + rect.width / 2,
            centerY: rect.top - sectionRect.top + rect.height / 2
        };
    }

    function setPath(path, d) {
        path.setAttribute("d", d);
        const length = path.getTotalLength();
        path.dataset.length = String(length);
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
    }

    function measure() {
        const sectionRect = section.getBoundingClientRect();
        const gridRect = getSectionRect(grid.getBoundingClientRect(), sectionRect);
        const cardRects = cards.map(card => getSectionRect(card.getBoundingClientRect(), sectionRect));
        const inset = mobilePreference.matches ? 5 : 10;

        geometry = {
            width: sectionRect.width,
            height: sectionRect.height,
            grid: gridRect,
            cards: cardRects
        };
        layer.setAttribute("viewBox", `0 0 ${sectionRect.width} ${sectionRect.height}`);
        setPath(
            mapPath,
            `M${gridRect.left - inset} ${gridRect.top - inset}H${gridRect.right + inset}V${gridRect.bottom + inset}H${gridRect.left - inset}Z`
        );

        cardRects.forEach((rect, index) => {
            const corner = mobilePreference.matches ? 8 : 13;
            const cardPath = [
                `M${rect.left + corner} ${rect.top}H${rect.right - corner}`,
                `M${rect.right} ${rect.top + corner}V${rect.bottom - corner}`,
                `M${rect.right - corner} ${rect.bottom}H${rect.left + corner}`,
                `M${rect.left} ${rect.bottom - corner}V${rect.top + corner}`
            ].join(" ");
            setPath(cardPaths[index], cardPath);
        });

        setCursorPaths();
    }

    function key(time, x, y) {
        return { time, x, y };
    }

    function setCursorPaths() {
        const { grid: bounds, cards: rects } = geometry;
        const edge = mobilePreference.matches ? 14 : 42;
        const mapY = bounds.top - (mobilePreference.matches ? 8 : 16);
        architect.keyframes = [
            key(0, bounds.left - edge, bounds.top - edge),
            key(0.55, bounds.left, bounds.top),
            key(0.78, bounds.right, mapY),
            key(1.03, bounds.right, bounds.top),
            key(1.35, bounds.right, bounds.bottom),
            key(1.68, bounds.left, bounds.bottom),
            key(1.95, bounds.left - edge, bounds.top)
        ];
        architect.easing = cubic;

        const cardRoute = (rect, start, entry) => {
            const positions = {
                top: [
                    key(start, rect.left - edge, rect.top - edge),
                    key(start + 0.22, rect.left, rect.top),
                    key(start + 0.5, rect.right, rect.top),
                    key(start + 0.76, rect.right, rect.bottom),
                    key(start + 1.02, rect.left, rect.bottom),
                    key(start + 1.24, rect.left - edge, rect.bottom + edge / 2)
                ],
                right: [
                    key(start, rect.right + edge, rect.top - edge),
                    key(start + 0.22, rect.right, rect.top),
                    key(start + 0.5, rect.right, rect.bottom),
                    key(start + 0.76, rect.left, rect.bottom),
                    key(start + 1.02, rect.left, rect.top),
                    key(start + 1.24, rect.left - edge, rect.top - edge)
                ],
                bottom: [
                    key(start, rect.left - edge, rect.bottom + edge),
                    key(start + 0.22, rect.left, rect.bottom),
                    key(start + 0.5, rect.right, rect.bottom),
                    key(start + 0.76, rect.right, rect.top),
                    key(start + 1.02, rect.left, rect.top),
                    key(start + 1.24, rect.left + edge / 2, rect.top - edge)
                ],
                left: [
                    key(start, rect.left - edge, rect.bottom),
                    key(start + 0.22, rect.left, rect.bottom),
                    key(start + 0.5, rect.left, rect.top),
                    key(start + 0.76, rect.right, rect.top),
                    key(start + 1.02, rect.right, rect.bottom),
                    key(start + 1.24, rect.right + edge, rect.bottom + edge / 2)
                ]
            };
            return positions[entry];
        };

        htmlBuilder.keyframes = cardRoute(rects[0], 1.45, "top");
        htmlBuilder.easing = smooth;
        cssBuilder.keyframes = cardRoute(rects[1], 2.2, "right");
        cssBuilder.easing = cubic;
        javascriptBuilder.keyframes = cardRoute(rects[2], 2.95, "bottom");
        javascriptBuilder.easing = smooth;
        aiBuilder.keyframes = cardRoute(rects[3], 3.7, "left");
        aiBuilder.easing = cubic;
    }

    function draw(path, elapsed, start, end, easing = smooth) {
        const length = Number(path.dataset.length || 0);
        const progress = easing(clamp((elapsed - start) / (end - start)));
        path.style.strokeDashoffset = `${length * (1 - progress)}`;
    }

    function moveCursors(elapsed) {
        for (const cursor of cursors) {
            const frames = cursor.keyframes;
            let segment = 0;
            while (segment < frames.length - 2 && elapsed > frames[segment + 1].time) {
                segment += 1;
            }
            const from = frames[segment];
            const to = frames[segment + 1];
            const progress = cursor.easing(clamp((elapsed - from.time) / (to.time - from.time)));
            cursor.group.setAttribute(
                "transform",
                `translate(${from.x + (to.x - from.x) * progress} ${from.y + (to.y - from.y) * progress})`
            );
            cursor.group.style.opacity = String(
                Math.min(clamp((elapsed - from.time) / 0.14), clamp((frames[frames.length - 1].time - elapsed) / 0.28))
            );
        }
    }

    function splitHeading() {
        const accent = heading.querySelector("span");
        if (!accent) {
            return 0;
        }
        const leadText = [...heading.childNodes]
            .filter(node => node !== accent && node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join(" ");
        const accentText = accent.textContent.replace(/\s+/g, " ").trim();
        const fullText = `${leadText} ${accentText}`.trim();
        heading.setAttribute("aria-label", fullText);
        let index = 0;

        const addCharacters = (parent, text) => {
            for (const character of text) {
                const span = document.createElement("span");
                span.className = "skills-heading-character";
                span.setAttribute("aria-hidden", "true");
                span.style.setProperty("--character-delay", `${index * HEADING_CHARACTER_DELAY}ms`);
                span.textContent = character === " " ? "\u00a0" : character;
                parent.append(span);
                index += 1;
            }
        };

        heading.replaceChildren();
        addCharacters(heading, leadText);
        heading.append(document.createTextNode("\u00a0"));
        index += 1;
        accent.textContent = "";
        heading.append(accent);
        addCharacters(accent, accentText);
        return index;
    }

    function buildCard(index, elapsed) {
        const starts = [1.45, 2.2, 2.95, 3.7];
        const duration = 1.02;
        const progress = smooth(clamp((elapsed - starts[index]) / duration));
        draw(cardPaths[index], elapsed, starts[index] + 0.22, starts[index] + 1.02, cubic);
        if (elapsed >= starts[index] + 0.88) {
            cards[index].classList.add("capability-card-built");
        }
        if (progress === 1) {
            cardPaths[index].style.strokeDashoffset = "0";
        }
    }

    function render(elapsed) {
        draw(mapPath, elapsed, 0.35, 1.72, cubic);
        cards.forEach((_, index) => buildCard(index, elapsed));
        moveCursors(elapsed);
    }

    function finish(staticMode = false) {
        if (finished) {
            return;
        }
        finished = true;
        if (frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = 0;
        }
        window.removeEventListener("resize", resizeHandler);
        section.classList.remove("capabilities-swarm-building");
        section.classList.add("capabilities-swarm-complete");
        if (staticMode) {
            section.classList.add("capabilities-swarm-static");
        }
        heading.querySelectorAll(".skills-heading-character").forEach(character => {
            character.style.opacity = "1";
        });
        cards.forEach(card => card.classList.add("capability-card-built"));
        paths.forEach(path => { path.style.strokeDashoffset = "0"; });
        cursors.forEach(cursor => cursor.group.remove());
    }

    function tick(timestamp) {
        if (finished) {
            return;
        }
        const elapsed = (timestamp - startedAt) / (1000 * TIME_SCALE);
        render(elapsed);
        if (elapsed >= 5.15) {
            finish();
            return;
        }
        frameId = window.requestAnimationFrame(tick);
    }

    function start() {
        if (started || finished) {
            return;
        }
        started = true;
        observer.disconnect();
        splitHeading();
        measure();
        if (motionPreference.matches) {
            finish(true);
            return;
        }
        section.classList.add("capabilities-swarm-building");
        resizeHandler = () => {
            if (!finished) {
                measure();
            }
        };
        window.addEventListener("resize", resizeHandler, { passive: true });
        startedAt = performance.now();
        frameId = window.requestAnimationFrame(tick);
    }

    observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            start();
        }
    }, { threshold: 0.12 });
    observer.observe(section);
})();
