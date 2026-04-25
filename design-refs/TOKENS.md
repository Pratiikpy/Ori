# Ori — Design Tokens

## Surface colors

```css
--bg:         #07070a;
--bg-2:       #0b0b10;
--surface:    rgba(255, 255, 255, 0.022);
--surface-2:  rgba(255, 255, 255, 0.04);
--surface-3:  rgba(255, 255, 255, 0.07);
--line:       rgba(255, 255, 255, 0.06);
--line-2:     rgba(255, 255, 255, 0.1);
--line-3:     rgba(255, 255, 255, 0.16);
```

## Ink

```css
--ink:        #f4f4f6;
--ink-2:      rgba(244, 244, 246, 0.62);
--ink-3:      rgba(244, 244, 246, 0.38);
--ink-4:      rgba(244, 244, 246, 0.22);
```

## Accent

```css
--accent:     #6c7bff;           /* soft electric indigo */
--accent-2:   #8a95ff;
--accent-ink: #0a0a12;
```

## Semantic

```css
--ok:         #6bd0a3;
--warn:       #e8b472;
```

## Type stacks

```css
--sans:   "Geist", ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--serif:  "Instrument Serif", ui-serif, Georgia, serif;
--mono:   "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

## Radii

```css
--r-1: 6px;
--r-2: 10px;
--r-3: 14px;
--r-4: 20px;
--r-5: 28px;
--r-6: 40px;
```

## Spacing

```css
--s-1: 4px;
--s-2: 8px;
--s-3: 12px;
--s-4: 16px;
--s-5: 24px;
--s-6: 32px;
--s-7: 48px;
--s-8: 72px;
--s-9: 120px;
```

## Motion easings

```css
--ease:     cubic-bezier(0.2, 0.7, 0.2, 1);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
```

## clamp() type sizes

```css
.shell                { padding: 0 clamp(16px, 3vw, 32px); }
.hero                 { padding: clamp(var(--s-7), 10vw, 140px) 0 var(--s-8); }
h1.hero-title         { font-size: clamp(42px, 7.2vw, 104px); }
.hero-sub             { font-size: clamp(16px, 1.35vw, 19px); }
.hero-grid            { gap: clamp(var(--s-6), 5vw, var(--s-8)); }
section.slab          { padding: clamp(72px, 12vw, 140px) 0; }
.section-title        { font-size: clamp(28px, 4vw, 48px); }
```

## All @keyframes

```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(107, 208, 163, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(107, 208, 163, 0.06); }
}

@keyframes ring-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.04); }
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes blink {
  50% { opacity: 0; }
}

@keyframes fill-up {
  from { width: 10%; }
  to { width: 68%; }
}

@keyframes slide {
  0% { transform: translateX(0%); width: 20%; }
  50% { transform: translateX(250%); width: 20%; }
  100% { transform: translateX(0%); width: 20%; }
}
```

## Shadows

```css
.device {
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.03) inset,
    0 80px 120px -40px rgba(108, 123, 255, 0.25),
    0 40px 80px -20px rgba(0,0,0,0.6);
}

.window {
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.02) inset,
    0 40px 80px -20px rgba(0,0,0,0.6),
    0 20px 40px -10px rgba(0,0,0,0.4);
}

.profile-head .avatar {
  box-shadow: 0 0 0 1px var(--line-2);
}

.hero-tag .dot {
  box-shadow: 0 0 0 4px rgba(107, 208, 163, 0.15);
}
```

## backdrop-filter values

```css
.topbar {
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}

.chat-header {
  backdrop-filter: blur(20px);
}
```

## font-feature-settings values

```css
body  { font-feature-settings: "ss01", "ss02", "cv11"; }
.mono { font-feature-settings: "ss02", "zero"; }
```
