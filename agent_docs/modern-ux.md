# Modern UX Patterns (2025/2026)

Contemporary portfolio design patterns to elevate minoanmystery.org.

## Already Implemented

- [x] Dark mode with time-based defaults
- [x] Command palette (Cmd+K)
- [x] View Transitions (Astro native)
- [x] Fluid typography with `clamp()`
- [x] WCAG-compliant contrast ratios

## High Priority Enhancements

### Gradient Blob Hero Animation

Organic animated gradient (Linear/Vercel style):

```css
.hero-blob {
  position: absolute;
  width: 1000px;
  height: 1000px;
  border-radius: 50%;
  background: linear-gradient(135deg,
    rgba(150, 106, 133, 0.3),  /* Tyrian purple */
    rgba(92, 26, 92, 0.3)       /* Deep purple */
  );
  filter: blur(100px);
  animation: blob-float 8s ease-in-out infinite;
}

@keyframes blob-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
  50% { transform: translate(100px, 50px) scale(1.1); opacity: 0.2; }
}
```

**Color options for Minoan theme:**
- Tyrian purple: `from-[#966a85]/30 to-[#5c1a5c]/30`
- Labyrinth gold: `from-[#d4af37]/20 to-[#966a85]/30`
- Mediterranean blue: `from-[#1e3a5f]/30 to-[#966a85]/30`

### Bento Grid Skills Section

Modern grid layout for skills/experience:

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 200px);
  gap: 16px;
}

.bento-item:nth-child(1) { grid-column: span 2; grid-row: span 2; }
.bento-item:nth-child(2) { grid-column: span 2; }
/* ... */
```

### Magnetic Cursor Effects

CTAs that attract cursor:

```typescript
const magneticButton = (el: HTMLElement) => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'translate(0, 0)';
  });
};
```

### Text Scramble Animation

Decrypt effect on headings:

```typescript
const scrambleText = (el: HTMLElement, finalText: string) => {
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  let iteration = 0;
  const interval = setInterval(() => {
    el.innerText = finalText
      .split('')
      .map((char, i) => i < iteration ? char : chars[Math.floor(Math.random() * chars.length)])
      .join('');
    if (iteration >= finalText.length) clearInterval(interval);
    iteration += 1/3;
  }, 30);
};
```

## Medium Priority

### Marquee Testimonials

Infinite scroll of client logos/quotes:

```astro
<div class="marquee">
  <div class="marquee-content">
    {logos.map(logo => <img src={logo} />)}
    {logos.map(logo => <img src={logo} />)} <!-- Duplicate for seamless loop -->
  </div>
</div>

<style>
.marquee { overflow: hidden; }
.marquee-content {
  display: flex;
  animation: marquee 20s linear infinite;
}
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
```

### 3D Card Tilt

Perspective hover effect:

```typescript
import { motion } from 'motion';

<motion.div
  whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
  style={{ transformPerspective: 1000 }}
/>
```

### Gradient Text Animation

Animated color-shifting headlines:

```css
.gradient-text {
  background: linear-gradient(90deg, #966a85, #d4af37, #966a85);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

## Lower Priority

- [ ] Phosphor icons migration (replace inline SVGs)
- [ ] Spring physics for hover effects
- [ ] WebGL particle backgrounds
- [ ] 3D model showcase for AI concepts
- [ ] Gesture support (drag interactions)

## Performance Considerations

- Use `will-change` sparingly
- Respect `prefers-reduced-motion`
- Lazy load heavy animations
- Use CSS animations over JS when possible
- Monitor Core Web Vitals (LCP, CLS, INP)
