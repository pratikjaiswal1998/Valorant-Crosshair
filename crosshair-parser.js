/**
 * Parses a Valorant Profile Code into a configuration object.
 *
 * The code format is semicolon-delimited tokens:
 *   0;s;1;P;c;5;h;0;...;S;c;4;o;1
 *
 * - The first token is always '0' (profile version).
 * - 'P' is a standalone section marker for the PRIMARY crosshair.
 * - 'S' is a standalone section marker for the SNIPER (ADS) crosshair.
 * - 's' takes one value (e.g. s;1).
 * - All other tokens come in key;value pairs.
 *
 * IMPORTANT: 'P' and 'S' do NOT consume a value — they are single tokens.
 *            The old parser assumed every token consumed a value (i += 2),
 *            which caused every key after 'P' to be misaligned.
 */

const COLORS = {
    0: '#ffffff',
    1: '#00ff00',
    2: '#7fff00',
    3: '#ffff00',
    4: '#00ffff',
    5: '#ff00ff',
    6: '#ff0000',
    7: '#000000',
};

function defaultProfile() {
    return {
        color: 0,
        customColor: '',
        outlines: true,
        outlineOpacity: 0.5,
        outlineThickness: 1,
        centerDot: false,
        centerDotOpacity: 1,
        centerDotSize: 2,
        overrideFiringErrorMultiplier: false,
        firingErrorMultiplier: 1,
        innerLines: {
            show: true,
            opacity: 0.8,
            length: 6,
            thickness: 2,
            offset: 3,
            movementError: false,
            firingError: true,
        },
        outerLines: {
            show: true,
            opacity: 0.35,
            length: 2,
            thickness: 2,
            offset: 10,
            movementError: true,
            firingError: true,
        }
    };
}

class CrosshairParser {
    static parse(code) {
        const primary = defaultProfile();
        const tokens = code.split(';');

        // First token must be '0'
        if (tokens[0] !== '0') return { primary };

        let section = null; // null | 'P' | 'S'
        let i = 1;

        while (i < tokens.length) {
            const tok = tokens[i];

            // Section markers — standalone, no value
            if (tok === 'P') {
                section = 'P';
                i++;
                continue;
            }
            if (tok === 'S') {
                section = 'S';
                i++;
                continue;
            }

            // 's' takes one value (sniper scope multiplier or similar)
            if (tok === 's') {
                i += 2; // skip 's' and its value
                continue;
            }

            // Everything else is key;value
            const key = tok;
            const val = tokens[i + 1];
            i += 2;

            // We only care about primary section
            if (section !== 'P') continue;
            if (val === undefined) continue;

            const num = parseFloat(val);
            const inner = primary.innerLines;
            const outer = primary.outerLines;

            switch (key) {
                // General
                case 'c': primary.color = parseInt(val); break;
                case 'u': primary.customColor = val.startsWith('#') ? val : `#${val}`; break;
                case 'h': primary.outlines = val !== '0'; break;  // h;0 = outlines ON, counterintuitive but correct: 'h' = 'has outlines', 0=no
                case 'o': primary.outlineOpacity = num; break;
                case 't': primary.outlineThickness = num; break;
                case 'd': primary.centerDot = val === '1'; break;
                case 'a': primary.centerDotOpacity = num; break;
                case 'z': primary.centerDotSize = num; break;
                case 'm': primary.overrideFiringErrorMultiplier = val === '1'; break;
                case 'f': primary.firingErrorMultiplier = num; break;

                // Inner lines (prefix '0')
                case '0b': inner.show = val !== '0'; break;
                case '0t': inner.thickness = num; break;
                case '0l': inner.length = num; break;
                case '0o': inner.offset = num; break;
                case '0a': inner.opacity = num; break;
                case '0m': inner.movementError = val === '1'; break;
                case '0f': inner.firingError = val === '1'; break;

                // Outer lines (prefix '1')
                case '1b': outer.show = val !== '0'; break;
                case '1t': outer.thickness = num; break;
                case '1l': outer.length = num; break;
                case '1o': outer.offset = num; break;
                case '1a': outer.opacity = num; break;
                case '1m': outer.movementError = val === '1'; break;
                case '1f': outer.firingError = val === '1'; break;
            }
        }

        return { primary };
    }
}
