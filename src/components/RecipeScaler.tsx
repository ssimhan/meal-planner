'use client';

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface RecipeScalerProps {
    markdownContent: string;
}

export default function RecipeScaler({ markdownContent }: RecipeScalerProps) {
    const [scale, setScale] = useState(1);

    const scaledContent = useMemo(() => {
        if (scale === 1) return markdownContent;

        const lines = markdownContent.split('\n');
        let inIngredients = false;

        return lines.map(line => {
            // Check for Ingredients section header
            if (line.trim().match(/^#{1,4}\s*Ingredients/i)) {
                inIngredients = true;
                return line;
            }
            // Check for end of Ingredients (next header)
            if (inIngredients && line.trim().match(/^#{1,4}\s/)) {
                inIngredients = false;
                return line;
            }

            // If in ingredients and is a list item, try to scale
            if (inIngredients && (line.trim().startsWith('-') || line.trim().startsWith('*'))) {
                return scaleLine(line, scale);
            }

            return line;
        }).join('\n');
    }, [markdownContent, scale]);

    return (
        <div>
            <div className="flex items-center gap-4 mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]">
                <span className="font-mono text-xs uppercase font-bold text-[var(--text-muted)] tracking-widest">Yield:</span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setScale(0.5)}
                        className={`px-3 py-1 text-sm font-bold rounded transition-colors ${scale === 0.5 ? 'bg-[var(--accent-sage)] text-white' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
                    >
                        0.5x
                    </button>
                    <button
                        onClick={() => setScale(1)}
                        className={`px-3 py-1 text-sm font-bold rounded transition-colors ${scale === 1 ? 'bg-[var(--accent-sage)] text-white' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
                    >
                        1x
                    </button>
                    <button
                        onClick={() => setScale(2)}
                        className={`px-3 py-1 text-sm font-bold rounded transition-colors ${scale === 2 ? 'bg-[var(--accent-sage)] text-white' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
                    >
                        2x
                    </button>
                </div>
            </div>

            <article className="prose prose-stone max-w-none bg-white p-8 rounded shadow-sm border border-[var(--border-subtle)]">
                <ReactMarkdown
                    components={{
                        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-8" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-4 mt-8 pb-2 border-b" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-xl font-bold mb-3 mt-6 text-[var(--accent-sage)] uppercase tracking-wide" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                        li: ({ node, ...props }) => <li className="text-[var(--text-primary)]" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                    }}
                >
                    {scaledContent}
                </ReactMarkdown>
            </article>
        </div>
    );
}

function scaleLine(line: string, factor: number): string {
    // Regex to find leading number/fraction
    // Matches: "1", "1.5", "1/2", "1 1/2", "1-1/2"
    // Capture groups:
    // 1: The whole number part (optional)
    // 2: The separator (space or dash) (optional)
    // 3: The numerator (optional)
    // 4: slash (optional)
    // 5: denominator (optional)

    // Simplified regex: Look for number at start of list item text (after space/bullet)
    const match = line.match(/^(\s*[-*]\s+)((\d+)?(?:\s?[\/\.]\s?)?(\d+(?:\/\d+)?)?)(.*)$/);
    if (!match) return line;

    // match[1]: bullet ("- ")
    // match[2]: quantity string ("1", "1 1/2", "1/2", "1.5")
    // match[5]: rest of line

    const bullet = match[1];
    const qtyStr = match[2];
    const rest = match[5];

    if (!qtyStr.trim()) return line;

    const val = parseQuantity(qtyStr);
    if (val === null) return line;

    const scaledVal = val * factor;
    const newQtyStr = formatQuantity(scaledVal);

    return `${bullet}${newQtyStr}${rest}`;
}

function parseQuantity(str: string): number | null {
    str = str.trim();
    if (!str) return null;

    // Check for mixed fraction "1 1/2"
    if (str.includes(' ')) {
        const parts = str.split(' ');
        if (parts.length === 2) {
            const whole = parseFloat(parts[0]);
            const frac = parseFraction(parts[1]);
            if (!isNaN(whole) && frac !== null) return whole + frac;
        }
    }

    // Check for simple fraction "1/2"
    if (str.includes('/')) {
        return parseFraction(str);
    }

    // Decimal/Integer
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

function parseFraction(str: string): number | null {
    const parts = str.split('/');
    if (parts.length !== 2) return null;
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    return num / den;
}

function formatQuantity(num: number): string {
    // Round to nearest reasonable fraction
    // If integer, return integer
    if (Math.abs(num - Math.round(num)) < 0.05) return Math.round(num).toString();

    // If .5, return 1/2
    const decimal = num - Math.floor(num);
    const whole = Math.floor(num);

    // Common fractions: .25, .33, .5, .66, .75
    let fraction = '';
    if (Math.abs(decimal - 0.25) < 0.1) fraction = '1/4';
    else if (Math.abs(decimal - 0.33) < 0.1) fraction = '1/3';
    else if (Math.abs(decimal - 0.5) < 0.1) fraction = '1/2';
    else if (Math.abs(decimal - 0.66) < 0.1) fraction = '2/3';
    else if (Math.abs(decimal - 0.75) < 0.1) fraction = '3/4';
    else fraction = decimal.toFixed(2).replace(/\.?0+$/, ''); // Fallback

    if (whole === 0) return fraction || '0';
    if (!fraction) return whole.toString();
    return `${whole} ${fraction}`;
}
