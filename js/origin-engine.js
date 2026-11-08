(() => {
    const section = document.querySelector("#origin.origin-section");
    const content = section?.querySelector(".origin-content");
    const greeting = section?.querySelector("[data-about-greeting]");

    if (!section || !content || !greeting) {
        return;
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobilePreference = window.matchMedia("(max-width: 700px), (pointer: coarse)");
    const rowElements = [...section.querySelectorAll(".origin-data-item")];
    let observer;
    let frameId = 0;
    let resizeHandler;
    let geometry;
    let startedAt = 0;
    let started = false;
    let finished = false;
    const TIME_SCALE = 1.5;
    const paths = [];
    const cursors = [];
    const anchors = [];

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
        class: "origin-swarm-layer",
        "aria-hidden": "true",
        focusable: "false"
    });

    function makePath(className) {
        const path = svg("path", { class: className });
        layer.append(path);
        paths.push(path);
        return path;
    }

    function makeCursor(name, className, drawShape) {
        const group = svg("g", {
            class: `origin-swarm-cursor ${className}`,
            "data-origin-cursor": name
        });
        drawShape(group);
        layer.append(group);
        const cursor = { group, keyframes: [], easing: cubic };
        cursors.push(cursor);
        return cursor;
    }

    const architect = makeCursor("Architect", "origin-cursor-architect", group => {
        group.append(
            svg("circle", { cx: 0, cy: 0, r: 8 }),
            svg("path", { d: "M-13 0H-5 M5 0H13 M0-13V-5 M0 5V13" }),
            svg("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 1.7 })
        );
    });
    const textBuilder = makeCursor("Text Builder", "origin-cursor-text-builder", group => {
        group.append(
            svg("path", { d: "M-9-8H9 M0-8V8 M-7 8H7" }),
            svg("path", { d: "M-12-11L-9-8 M12-11L9-8" })
        );
    });
    const railWelder = makeCursor("Rail Welder", "origin-cursor-rail-welder", group => {
        group.append(
            svg("polygon", { points: "0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3" }),
            svg("path", { d: "M0-15V-11 M15 0H11 M0 15V11 M-15 0H-11" })
        );
    });
    const dataScanner = makeCursor("Data Scanner", "origin-cursor-data-scanner", group => {
        group.append(
            svg("circle", { cx: 0, cy: 0, r: 7 }),
            svg("path", { d: "M-12 0H12 M0-12V12" }),
            svg("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 2 })
        );
    });
    const identityCalibrator = makeCursor(
        "Identity Calibrator",
        "origin-cursor-identity-calibrator",
        group => {
            group.append(
                svg("path", { d: "M-9 5V-9H5 M-4-4L9-9 M-4 4L-9 9" }),
                svg("circle", { cx: 0, cy: 0, r: 2 })
            );
        }
    );

    const topRail = makePath("origin-swarm-frame");
    const bottomRail = makePath("origin-swarm-frame");
    const leftRail = makePath("origin-swarm-frame");
    const rightRail = makePath("origin-swarm-frame");
    const greetingUnderline = makePath("origin-swarm-detail");
    const introAlignment = makePath("origin-swarm-detail");
    const rowDetails = rowElements.map(() => makePath("origin-swarm-row"));
    for (let index = 0; index < 4; index += 1) {
        const anchor = svg("circle", { class: "origin-swarm-anchor", r: 2.2 });
        layer.append(anchor);
        anchors.push(anchor);
    }
    section.append(layer);

    function setPath(path, d) {
        path.setAttribute("d", d);
        const length = path.getTotalLength();
        path.dataset.length = String(length);
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
    }

    function measure() {
        const sectionRect = section.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const greetingRect = greeting.getBoundingClientRect();
        const padding = mobilePreference.matches ? 10 : 18;
        const frame = {
            left: clamp(contentRect.left - sectionRect.left - padding, 6, sectionRect.width - 6),
            top: clamp(contentRect.top - sectionRect.top - padding, 6, sectionRect.height - 6),
            right: clamp(contentRect.right - sectionRect.left + padding, 6, sectionRect.width - 6),
            bottom: clamp(contentRect.bottom - sectionRect.top + padding, 6, sectionRect.height - 6)
        };
        const rows = rowElements.map(row => {
            const rect = row.getBoundingClientRect();
            return {
                left: rect.left - sectionRect.left,
                right: rect.right - sectionRect.left,
                y: rect.top - sectionRect.top + rect.height / 2
            };
        });
        const greetingLine = {
            left: greetingRect.left - sectionRect.left,
            right: greetingRect.right - sectionRect.left,
            y: greetingRect.bottom - sectionRect.top + 5
        };
        const introRect = section.querySelector(".origin-description")?.getBoundingClientRect();
        const intro = introRect
            ? {
                left: introRect.left - sectionRect.left,
                right: introRect.right - sectionRect.left,
                y: introRect.top - sectionRect.top + introRect.height + 8
            }
            : greetingLine;

        geometry = { width: sectionRect.width, height: sectionRect.height, frame, rows, greetingLine, intro };
        layer.setAttribute("viewBox", `0 0 ${sectionRect.width} ${sectionRect.height}`);
        setPath(topRail, `M${frame.left} ${frame.top}H${frame.right}`);
        setPath(bottomRail, `M${frame.right} ${frame.bottom}H${frame.left}`);
        setPath(leftRail, `M${frame.left} ${frame.bottom}V${frame.top}`);
        setPath(rightRail, `M${frame.right} ${frame.top}V${frame.bottom}`);
        setPath(greetingUnderline, `M${greetingLine.left} ${greetingLine.y}H${greetingLine.right}`);
        setPath(introAlignment, `M${intro.left} ${intro.y}h${Math.min(54, intro.right - intro.left)}`);
        rows.forEach((row, index) => {
            const mark = mobilePreference.matches ? 24 : 38;
            setPath(rowDetails[index], `M${row.left} ${row.y}h${mark} M${row.left} ${row.y - 5}v10`);
        });
        [ [frame.left, frame.top], [frame.right, frame.top], [frame.right, frame.bottom], [frame.left, frame.bottom] ]
            .forEach(([x, y], index) => {
                anchors[index].setAttribute("cx", String(x));
                anchors[index].setAttribute("cy", String(y));
            });
        setCursorPaths();
    }

    function key(time, x, y) {
        return { time, x, y };
    }

    function setCursorPaths() {
        const { frame, rows, greetingLine, intro } = geometry;
        const edge = mobilePreference.matches ? 16 : 48;
        const acrossRows = rows.length ? rows : [{ left: frame.left, right: frame.right, y: frame.bottom }];
        architect.keyframes = [
            key(0, frame.left - edge, frame.top - edge),
            key(0.75, frame.left, frame.top),
            key(1.2, frame.right, frame.top),
            key(1.75, frame.right, frame.bottom),
            key(2.2, frame.left, frame.bottom),
            key(2.7, frame.left, frame.top),
            key(3.2, frame.left - edge / 2, frame.bottom)
        ];
        architect.easing = cubic;
        textBuilder.keyframes = [
            key(0.55, greetingLine.left - edge, greetingLine.y - 12),
            key(1.05, greetingLine.left, greetingLine.y - 12),
            key(2.05, greetingLine.right, greetingLine.y - 12),
            key(2.65, intro.left + 18, intro.y),
            key(3.35, intro.right + edge / 2, intro.y)
        ];
        textBuilder.easing = smooth;
        railWelder.keyframes = [
            key(0.25, frame.right + edge, frame.top + 18),
            key(1.15, frame.left, frame.top),
            key(2.0, frame.right, frame.top),
            key(2.8, frame.right, frame.bottom),
            key(3.45, frame.left, frame.bottom),
            key(4.0, frame.left - edge, frame.bottom + 12)
        ];
        railWelder.easing = smooth;
        dataScanner.keyframes = [
            key(2.8, frame.right + edge, acrossRows[0].y),
            ...acrossRows.map((row, index) => key(3.1 + index * 0.42, row.right, row.y)),
            key(5.15, frame.left - edge, acrossRows[acrossRows.length - 1].y)
        ];
        dataScanner.easing = cubic;
        identityCalibrator.keyframes = [
            key(0.7, frame.left - edge, frame.bottom),
            key(3.7, intro.left, intro.y),
            key(4.2, intro.left + Math.min(54, intro.right - intro.left), intro.y),
            key(4.8, greetingLine.right, greetingLine.y),
            key(5.6, frame.right + edge, frame.top)
        ];
        identityCalibrator.easing = smooth;
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
                Math.min(clamp((elapsed - from.time) / 0.15), clamp((frames[frames.length - 1].time - elapsed) / 0.3))
            );
        }
    }

    function typeGreeting(elapsed) {
        const fullText = greeting.getAttribute("aria-label");
        const delay = mobilePreference.matches ? 43 : 56;
        const start = 1.1;
        const count = clamp(Math.floor((elapsed - start) * 1000 / delay), 0, fullText.length);
        const nextText = fullText.slice(0, count);
        if (greeting.textContent !== nextText) {
            greeting.textContent = nextText;
        }
    }

    function render(elapsed) {
        draw(topRail, elapsed, 1.15, 2.08, smooth);
        draw(bottomRail, elapsed, 2.78, 3.48, cubic);
        draw(leftRail, elapsed, 2.18, 3.05, cubic);
        draw(rightRail, elapsed, 2.36, 3.22, smooth);
        draw(greetingUnderline, elapsed, 1.05, 2.85, smooth);
        draw(introAlignment, elapsed, 3.72, 4.35, cubic);
        rowDetails.forEach((path, index) => {
            const start = 3.05 + index * 0.42;
            draw(path, elapsed, start, start + 0.28, smooth);
        });
        const anchorOpacity = clamp((elapsed - 0.72) / 0.2) * (1 - clamp((elapsed - 5.1) / 0.3));
        anchors.forEach(anchor => { anchor.style.opacity = String(anchorOpacity); });
        typeGreeting(elapsed);
        moveCursors(elapsed);
    }

    function completeStatic() {
        finished = true;
        section.classList.remove("origin-swarm-building");
        section.classList.add("origin-swarm-complete", "origin-swarm-static");
        greeting.textContent = greeting.getAttribute("aria-label");
        for (const path of paths) {
            path.style.strokeDashoffset = "0";
        }
        anchors.forEach(anchor => { anchor.style.opacity = "1"; });
        for (const cursor of cursors) {
            cursor.group.remove();
        }
    }

    function finish() {
        if (finished) {
            return;
        }
        finished = true;
        if (frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = 0;
        }
        window.removeEventListener("resize", resizeHandler);
        section.classList.remove("origin-swarm-building");
        section.classList.add("origin-swarm-complete");
        greeting.textContent = greeting.getAttribute("aria-label");
        for (const path of paths) {
            path.style.strokeDashoffset = "0";
        }
        anchors.forEach(anchor => { anchor.style.opacity = "1"; });
        for (const cursor of cursors) {
            cursor.group.remove();
        }
    }

    function tick(timestamp) {
        if (finished) {
            return;
        }
        const elapsed = (timestamp - startedAt) / (1000 * TIME_SCALE);
        render(elapsed);
        if (elapsed >= 6.2) {
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
        measure();
        if (motionPreference.matches) {
            completeStatic();
            return;
        }
        section.classList.add("origin-swarm-building");
        greeting.setAttribute("aria-label", greeting.textContent.replace(/\s+/g, " ").trim());
        greeting.textContent = "";
        resizeHandler = () => {
            if (!finished) {
                measure();
            }
        };
        window.addEventListener("resize", resizeHandler, { passive: true });
        startedAt = performance.now();
        frameId = window.requestAnimationFrame(tick);
    }

    if (motionPreference.matches) {
        greeting.setAttribute("aria-label", greeting.textContent.replace(/\s+/g, " ").trim());
        observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                start();
            }
        }, { threshold: 0.12 });
        observer.observe(section);
        return;
    }

    greeting.setAttribute("aria-label", greeting.textContent.replace(/\s+/g, " ").trim());
    observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            start();
        }
    }, { threshold: 0.12 });
    observer.observe(section);
})();
