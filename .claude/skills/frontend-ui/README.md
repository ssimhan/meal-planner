# Frontend UI

A Claude Code skill for creating aesthetically pleasing, visually distinctive frontend interfaces using research-backed prompting strategies.

## What is This?

This skill helps Claude create frontend UIs that avoid generic "AI slop" patterns by applying best practices from Anthropic's frontend aesthetics research. It provides specific guidance on typography, color, motion, and backgrounds to produce distinctive, memorable designs.

## The Problem This Solves

Without explicit guidance, Claude tends to default to:
- Generic fonts (Inter, Roboto, Arial)
- Predictable color schemes (white backgrounds with purple accents)
- Conservative layouts lacking visual interest
- Cookie-cutter designs that all look similar

This skill provides research-backed strategies to create visually distinctive interfaces that match your project's context and goals.

## Installation

### Quick Install

Copy this skill to your personal Claude Code skills directory:

```bash
# From the repository root
cp -r frontend-ui ~/.claude/skills/

# Or clone and copy directly
git clone https://github.com/WomenDefiningAI/claude-code-skills.git
cp -r claude-code-skills/frontend-ui ~/.claude/skills/
```

### Project-Specific Install

For project-specific use:

```bash
cp -r frontend-ui /path/to/your/project/.claude/skills/
```

### Verify Installation

Check that the skill is installed correctly:

```bash
ls -la ~/.claude/skills/frontend-ui/SKILL.md
```

You should see the SKILL.md file.

## What's Included

The skill provides guidance on **four key design dimensions**:

### 1. Typography
- Distinctive font alternatives to overused choices
- High-contrast pairing strategies
- Extreme weight variations for visual hierarchy
- Dramatic size jumps (3x+, not 1.5x)

### 2. Color & Theme
- Cohesive aesthetic themes (Cyberpunk, Brutalist, Terminal, etc.)
- Dominant colors with sharp accents
- CSS variable strategies for consistency
- IDE-inspired color palettes

### 3. Motion
- CSS-only animations for HTML
- Framer Motion patterns for React
- High-impact orchestrated page loads
- Staggered reveal techniques

### 4. Backgrounds
- Layered CSS gradients
- Geometric patterns (grids, dots, stripes)
- Contextual effects matching aesthetics
- Depth creation techniques

## Usage

Once installed, Claude will automatically use this skill when you request frontend UI creation.

### Example Requests

- "Create a landing page for a developer portfolio"
- "Build a dashboard with a cyberpunk aesthetic"
- "Make a brutalist-style blog homepage"
- "Design a React component library showcase"
- "Create an HTML page with terminal aesthetic"

### What Claude Will Do

When you request a UI, Claude will:

1. **Understand context**: Ask about purpose, audience, and desired mood
2. **Choose aesthetic direction**: Pick a cohesive theme
3. **State design decisions**: Explicitly declare fonts, colors, motion, background
4. **Implement with best practices**: Use distinctive choices across all four dimensions
5. **Create high-impact moments**: Orchestrate animations and visual hierarchy
6. **Verify quality**: Check against "AI slop" patterns

## Key Features

### Avoid "AI Slop"
The skill includes explicit warnings against:
- Overused fonts (Inter, Roboto, Arial)
- Clichéd color schemes (purple on white)
- Predictable layouts and patterns
- Generic designs lacking character

### Theme Variety
Includes guidance for diverse aesthetics:
- **Tech**: Terminal, Cyberpunk, Hacker
- **Creative**: Vaporwave, Memphis, Brutalist
- **Professional**: Swiss, Minimalist, Editorial
- **Organic**: Solarpunk, Nature-inspired

### Font Rotation
Provides 6+ distinctive font combination sets to ensure variety across projects

### Technical Best Practices
- CSS custom properties for theming
- Responsive mobile-first design
- Performance-conscious animations
- Accessibility considerations

## Examples

### Developer Portfolio (Terminal Aesthetic)
```
Theme: Terminal/Hacker with green accents
Fonts: JetBrains Mono throughout
Colors: Dark (#0d1117), green (#39ff14)
Motion: Typing animation, staggered fades
Background: Grid pattern with scanlines
```

### Creative Agency (Brutalist)
```
Theme: Swiss Brutalist
Fonts: Clash Display (900) + Space Grotesk (300)
Colors: Off-white, black, red accent
Motion: Bold slides from edges
Background: Noise texture
```

### App Dashboard (Neo-Tokyo)
```
Theme: Neo-Tokyo night
Fonts: Outfit + IBM Plex Mono
Colors: Navy, pink, cyan accents
Motion: Smooth card transitions
Background: Radial gradient with grid
```

## Requirements

- Claude Code CLI
- Modern browser for testing
- Google Fonts (loaded automatically)
- Optional: Tailwind CSS knowledge

## Quality Standards

Every UI created with this skill is checked against:
- Font distinctiveness
- Color scheme originality
- Typography contrast (weight and size)
- Background depth and interest
- Motion orchestration
- Theme cohesiveness
- Pattern avoidance

## Research Foundation

This skill is based on:
- [Anthropic's Frontend Aesthetics Cookbook](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb)
- Research on Claude's default design tendencies
- Comparative testing of prompting strategies
- Best practices from visual design and web development

## Tips for Best Results

1. **Be specific about context**: Share purpose, audience, and desired feeling
2. **Embrace variety**: Try different themes across projects
3. **Trust bold choices**: Distinctive is better than safe
4. **Provide feedback**: Tell Claude if you want more or less of certain elements
5. **Iterate aesthetics**: You can adjust single dimensions (fonts only, colors only, etc.)

## Isolated Dimension Control

You can also request changes to just one aspect:

- "Keep everything but update typography to use Crimson Pro and Fira Code"
- "Lock to a Solarpunk theme with organic shapes and warm colors"
- "Add orchestrated page load animations but keep other design the same"

## Learn More

- [SKILL.md](SKILL.md) - Complete skill instructions
- [Anthropic Cookbooks](https://github.com/anthropics/claude-cookbooks) - Original research
- [Claude Code Skills Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)

## Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/WomenDefiningAI/claude-code-skills/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/WomenDefiningAI/claude-code-skills/discussions)

## License

MIT

## Acknowledgments

Based on research from [Anthropic's Claude Cookbooks](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb) on prompting for frontend aesthetics.

Built for the claude-code-skills collection by [Women Defining AI](https://github.com/WomenDefiningAI).
