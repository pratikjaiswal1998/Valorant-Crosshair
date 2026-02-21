/**
 * Renders a crosshair onto a canvas from a parsed config.
 *
 * All in-game pixel values are multiplied by SCALE so they are
 * clearly visible on the 200×200 preview canvas.
 */
class CrosshairRenderer {
    static SCALE = 2;

    static render(canvas, config, spread = 0) {
        const S = CrosshairRenderer.SCALE;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;

        ctx.clearRect(0, 0, W, H);

        const p = config.primary;
        const color = p.customColor || COLORS[p.color] || '#00ff00';

        // ── helpers ──────────────────────────────────────────────
        function rect(x, y, w, h) { ctx.fillRect(x, y, w, h); }

        function drawOutline(x, y, w, h) {
            if (!p.outlines) return;
            ctx.fillStyle = `rgba(0,0,0,${p.outlineOpacity})`;
            const ot = Math.max(1, p.outlineThickness) * S;
            rect(x - ot, y - ot, w + ot * 2, h + ot * 2);
        }

        function drawFill(x, y, w, h, opacity) {
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            rect(x, y, w, h);
            ctx.globalAlpha = 1;
        }

        function drawBar(x, y, w, h, opacity) {
            drawOutline(x, y, w, h);
            drawFill(x, y, w, h, opacity);
        }

        // ── lines helper ─────────────────────────────────────────
        function drawLines(cfg) {
            if (!cfg.show || cfg.opacity <= 0) return;

            const t = Math.max(1, cfg.thickness) * S;
            const l = cfg.length * S;
            const o = (cfg.offset + spread) * S;

            if (l <= 0) return;

            // Top
            drawBar(cx - t / 2, cy - o - l, t, l, cfg.opacity);
            // Bottom
            drawBar(cx - t / 2, cy + o, t, l, cfg.opacity);
            // Left
            drawBar(cx - o - l, cy - t / 2, l, t, cfg.opacity);
            // Right
            drawBar(cx + o, cy - t / 2, l, t, cfg.opacity);
        }

        // ── draw ─────────────────────────────────────────────────
        // 1. Outer lines (behind inner)
        drawLines(p.outerLines);

        // 2. Inner lines
        drawLines(p.innerLines);

        // 3. Center dot
        if (p.centerDot) {
            const s = Math.max(1, p.centerDotSize) * S;
            drawBar(cx - s / 2, cy - s / 2, s, s, p.centerDotOpacity);
        }
    }
}
