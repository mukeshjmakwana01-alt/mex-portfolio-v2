(() => {
    const projectsSection = document.querySelector("#projects.projects-section");
    const stickyViewport = projectsSection?.querySelector(".projects-sticky");
    const cards = [...(projectsSection?.querySelectorAll(".projects-track > .project-card") || [])];

    if (!stickyViewport || cards.length === 0) {
        return;
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const activeEngines = new Set();
    let frameId = 0;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const ease = {
        smooth: value => value * value * (3 - 2 * value),
        cubic: value => 1 - Math.pow(1 - value, 3),
        quint: value => value < 0.5
            ? 16 * Math.pow(value, 5)
            : 1 - Math.pow(-2 * value + 2, 5) / 2
    };

    const teams = [
        {
            roles: ["Frame Architect", "Inventory Mapper", "Stock Welder", "Ledger Scanner", "Signal Calibrator"],
            colors: ["cyan", "amber", "violet", "lime", "white"],
            mode: "inventory",
            delay: [0, 0.35, 0.75, 1.15, 1.55],
            span: [2.7, 2.45, 2.65, 2.25, 2.4],
            total: 4.3
        },
        {
            roles: ["Neural Architect", "Prompt Weaver", "Signal Bridge", "Context Scanner", "Response Calibrator"],
            colors: ["violet", "lime", "cyan", "white", "amber"],
            mode: "network",
            delay: [0, 0.5, 0.9, 1.35, 1.8],
            span: [2.9, 2.5, 2.8, 2.45, 2.55],
            total: 4.7
        },
        {
            roles: ["Task Architect", "Queue Builder", "Progress Welder", "Flow Scanner", "Focus Calibrator"],
            colors: ["lime", "white", "amber", "violet", "cyan"],
            mode: "checklist",
            delay: [0, 0.28, 0.7, 1.1, 1.5],
            span: [2.55, 2.4, 2.85, 2.3, 2.5],
            total: 4.35
        },
        {
            roles: ["Venture Architect", "Blueprint Builder", "Launch Welder", "Horizon Scanner", "Scale Calibrator"],
            colors: ["white", "cyan", "lime", "amber", "violet"],
            mode: "blueprint",
            delay: [0, 0.55, 1.0, 1.45, 1.9],
            span: [3.05, 2.75, 2.65, 2.7, 2.55],
            total: 4.8
        }
    ];

    function makeSvg(tag, attributes = {}) {
        const element = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attributes)) {
            element.setAttribute(name, String(value));
        }
        return element;
    }

    function addPath(layer, className, d) {
        const path = makeSvg("path", { class: className, d });
        layer.append(path);
        const length = path.getTotalLength();
        path.dataset.length = String(length);
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        return path;
    }

    function addCursor(layer, role, color, shapeIndex) {
        const group = makeSvg("g", {
            class: `project-swarm-cursor cursor-${color}`,
            "data-project-cursor": role,
            "aria-hidden": "true"
        });

        const shapes = [
            target => target.append(
                makeSvg("circle", { cx: 0, cy: 0, r: 7 }),
                makeSvg("path", { d: "M-12 0H-5 M5 0H12 M0-12V-5 M0 5V12" }),
                makeSvg("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 1.5 })
            ),
            target => target.append(
                makeSvg("polygon", { points: "0,-9 3,-3 9,0 3,3 0,9 -3,3 -9,0 -3,-3" }),
                makeSvg("path", { d: "M0-14V-10 M14 0H10 M0 14V10 M-14 0H-10" })
            ),
            target => target.append(
                makeSvg("polygon", { points: "0,-9 9,0 0,9 -9,0" }),
                makeSvg("circle", { class: "cursor-fill", cx: 0, cy: 0, r: 1.8 })
            ),
            target => target.append(
                makeSvg("path", { d: "M-8 5V-8H5 M-3-3L8-8 M-3 3L-8 8" }),
                makeSvg("circle", { cx: 0, cy: 0, r: 2 })
            ),
            target => target.append(
                makeSvg("circle", { cx: 0, cy: 0, r: 7 }),
                makeSvg("circle", { cx: 0, cy: 0, r: 2 }),
                makeSvg("path", { d: "M0-12V-9 M12 0H9 M0 12V9 M-12 0H-9" })
            )
        ];

        shapes[shapeIndex](group);
        layer.append(group);
        return group;
    }

    function cardLocalRect(element, cardRect) {
        const rect = element.getBoundingClientRect();
        return {
            left: rect.left - cardRect.left,
            right: rect.right - cardRect.left,
            top: rect.top - cardRect.top,
            bottom: rect.bottom - cardRect.top,
            width: rect.width,
            height: rect.height,
            centerX: rect.left - cardRect.left + rect.width / 2,
            centerY: rect.top - cardRect.top + rect.height / 2
        };
    }

    function buildConstructionPaths(index, width, height, visual, info, top, bottom, tech) {
        const inset = mobile.matches ? 10 : 16;
        const left = inset;
        const right = Math.max(left + 20, width - inset);
        const upper = inset;
        const lower = Math.max(upper + 20, height - inset);
        const short = mobile.matches ? 9 : 14;
        const visualInset = mobile.matches ? 7 : 12;

        const cornerBrackets = [
            `M${left + short} ${upper}H${left}V${upper + short}`,
            `M${right - short} ${upper}H${right}V${upper + short}`,
            `M${right} ${lower - short}V${lower}H${right - short}`,
            `M${left + short} ${lower}H${left}V${lower - short}`
        ].join(" ");
        const innerVisual = [
            `M${visual.left + visualInset} ${visual.top + visualInset}H${visual.right - visualInset}`,
            `M${visual.right - visualInset} ${visual.top + visualInset}V${visual.bottom - visualInset}`,
            `M${visual.right - visualInset} ${visual.bottom - visualInset}H${visual.left + visualInset}`,
            `M${visual.left + visualInset} ${visual.bottom - visualInset}V${visual.top + visualInset}`
        ].join(" ");
        const infoX = info.left + (mobile.matches ? 4 : 8);
        const infoRight = Math.min(info.right - 4, infoX + (mobile.matches ? 36 : 58));
        const rowY = top.bottom + Math.max(6, (bottom.top - top.bottom) / 2);
        const techY = tech.top - (mobile.matches ? 5 : 8);

        if (index === 0) {
            return [
                `${cornerBrackets} M${left} ${upper + short * 2}V${rowY}H${visual.left - 10} M${visual.right + 8} ${visual.centerY}H${right}`,
                `M${left} ${upper}H${right} M${left} ${lower}H${right}`,
                innerVisual,
                `M${infoX} ${info.top + 10}H${infoRight} M${infoX} ${info.top + 22}H${infoRight - 10} M${infoX} ${info.top + 34}H${infoRight - 5}`,
                `M${tech.left} ${techY}V${lower}H${right - short} M${right - short} ${lower}V${lower - short}`
            ];
        }

        if (index === 1) {
            return [
                `${cornerBrackets} M${left} ${rowY}H${visual.left - 8}L${visual.centerX} ${visual.centerY}H${right}`,
                `M${info.left} ${info.top + 12}H${infoX + short}L${infoX} ${info.top + 12 + short} M${infoX} ${info.top + 12 + short}H${infoRight} M${infoX} ${info.top + 24 + short}H${infoRight - 8}`,
                `${innerVisual} M${visual.centerX - 8} ${visual.centerY}H${visual.centerX + 8} M${visual.centerX} ${visual.centerY - 8}V${visual.centerY + 8}`,
                `M${left} ${lower - short}H${infoX}L${infoX + short} ${lower}H${right} M${visual.left} ${visual.top - 6}H${visual.right}`,
                `M${top.left} ${top.bottom}H${left + short} M${right - short} ${bottom.top}H${bottom.right}`
            ];
        }

        if (index === 2) {
            return [
                `${cornerBrackets} M${infoX} ${info.top + 8}V${techY} M${infoX - 4} ${info.top + 12}H${infoX + 4} M${infoX - 4} ${info.top + 24}H${infoX + 4}`,
                `M${infoX + 10} ${info.top + 8}H${infoRight} M${infoX + 10} ${info.top + 20}H${infoRight - 8} M${infoX + 10} ${info.top + 32}H${infoRight - 14}`,
                `${innerVisual} M${visual.left + 5} ${visual.centerY}H${visual.right - 5}`,
                `M${left} ${rowY}H${infoX} M${infoX} ${rowY - 5}V${rowY + 5} M${tech.left} ${techY}H${right - short}`,
                `M${visual.right} ${visual.centerY}H${right}V${lower - short}H${right - short} M${left} ${upper + short}V${rowY}`
            ];
        }

        return [
            `M${left + short} ${upper}H${right - short}L${right} ${upper + short}V${lower - short}L${right - short} ${lower}H${left + short}L${left} ${lower - short}V${upper + short}Z`,
            `M${left + short} ${rowY}H${visual.left - 8}L${visual.centerX} ${visual.top - 8}H${visual.right} M${visual.centerX} ${visual.top - 8}V${visual.bottom + 8}`,
            `${innerVisual} M${visual.left + visualInset} ${visual.top + visualInset}L${visual.right - visualInset} ${visual.bottom - visualInset} M${visual.right - visualInset} ${visual.top + visualInset}L${visual.left + visualInset} ${visual.bottom - visualInset}`,
            `M${infoX} ${info.top + 8}H${infoRight} M${infoX} ${info.top + 20}H${infoRight - 9} M${infoX} ${info.top + 32}H${infoRight - 4} M${tech.left} ${techY}V${lower}`,
            `M${top.left} ${top.bottom}H${right - short}L${right} ${top.bottom + short} M${left} ${bottom.top - short}V${bottom.top}H${bottom.right} M${left + short} ${lower - short}L${left} ${lower}`
        ];
    }

    function createCardEngine(card, index) {
        const team = teams[index % teams.length];
        const layer = makeSvg("svg", {
            class: "project-card-swarm-layer",
            "aria-hidden": "true",
            focusable: "false"
        });
        const cursorNodes = [];
        card.append(layer);
        card.classList.add("project-swarm-building");
        card.dataset.projectSwarmState = "building";

        const cardRect = card.getBoundingClientRect();
        const width = card.clientWidth;
        const height = card.clientHeight;
        const visual = cardLocalRect(card.querySelector(".project-visual"), cardRect);
        const info = cardLocalRect(card.querySelector(".project-info"), cardRect);
        const top = cardLocalRect(card.querySelector(".project-top"), cardRect);
        const bottom = cardLocalRect(card.querySelector(".project-bottom"), cardRect);
        const tech = cardLocalRect(card.querySelector(".project-tech"), cardRect);
        layer.setAttribute("viewBox", `0 0 ${width} ${height}`);

        const pathNodes = buildConstructionPaths(index, width, height, visual, info, top, bottom, tech)
            .map(d => addPath(layer, "project-swarm-construction", d));
        pathNodes.forEach((path, roleIndex) => {
            const cursor = addCursor(
                layer,
                team.roles[roleIndex],
                team.colors[roleIndex],
                (roleIndex + index) % 5
            );
            cursorNodes.push(cursor);
        });

        return {
            card,
            paths: pathNodes,
            cursors: cursorNodes,
            team,
            index,
            startedAt: 0,
            elapsed: 0,
            finished: false
        };
    }

    function renderEngine(engine, elapsed) {
        const { team, paths, cursors } = engine;
        let allDone = elapsed >= team.total;

        paths.forEach((path, index) => {
            const start = team.delay[index];
            const duration = team.span[index];
            const progress = ease[index % 2 === 0 ? "smooth" : "cubic"](
                clamp((elapsed - start) / duration)
            );
            const length = Number(path.dataset.length || 0);
            path.style.strokeDashoffset = `${length * (1 - progress)}`;
            if (progress < 1) {
                allDone = false;
            }

            const cursor = cursors[index];
            if (elapsed < start || elapsed > start + duration) {
                cursor.style.opacity = "0";
                return;
            }

            const point = path.getPointAtLength(length * progress);
            cursor.setAttribute("transform", `translate(${point.x} ${point.y})`);
            cursor.style.opacity = String(Math.min(
                clamp((elapsed - start) / 0.18),
                clamp((start + duration - elapsed) / 0.22)
            ));
        });

        if (allDone) {
            completeEngine(engine);
        }
    }

    function completeEngine(engine) {
        if (engine.finished) {
            return;
        }
        engine.finished = true;
        engine.card.classList.remove("project-swarm-building");
        engine.card.classList.add("project-swarm-complete");
        engine.card.dataset.projectSwarmState = "complete";
        engine.paths.forEach(path => { path.style.strokeDashoffset = "0"; });
        engine.cursors.forEach(cursor => cursor.remove());
        activeEngines.delete(engine);
        if (activeEngines.size === 0 && frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }

    function tick(timestamp) {
        frameId = 0;
        for (const engine of [...activeEngines]) {
            engine.elapsed = (timestamp - engine.startedAt) / 1000;
            renderEngine(engine, engine.elapsed);
        }
        if (activeEngines.size > 0) {
            frameId = window.requestAnimationFrame(tick);
        }
    }

    function startCard(card, index) {
        if (card.dataset.projectSwarmState) {
            return;
        }
        const observer = cardObservers.get(card);
        observer?.disconnect();

        if (reducedMotion.matches) {
            const engine = createCardEngine(card, index);
            completeEngine(engine);
            return;
        }

        const engine = createCardEngine(card, index);
        engine.startedAt = performance.now();
        activeEngines.add(engine);
        if (!frameId) {
            frameId = window.requestAnimationFrame(tick);
        }
    }

    const cardObservers = new Map();
    const threshold = 0.5;

    cards.forEach((card, index) => {
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= threshold)) {
                startCard(card, index);
            }
        }, {
            root: null,
            threshold: [threshold]
        });
        cardObservers.set(card, observer);
        observer.observe(card);
    });
})();
