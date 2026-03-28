# HabitFlow — Habit & Action Tracker

A clean, flat-design single-page app for tracking daily habits and tasks. No frameworks, no build step — just open `index.html` in a browser.

## Features

- **Today / Week view** toggle
- **Three time blocks** — Morning, Afternoon, Evening
- **Three categories** — Health & Fitness, Work & Productivity, Learning & Growth
- **Category filter tabs** to focus on one area at a time
- **Task cards** with title, category badge, priority badge (High / Med / Low), due time, recurrence label, and notes
- **Check off tasks** to mark complete
- **Quick-add bar** — title, category, time block, press Enter
- **Full-add modal** — title, category, time block, due time, priority, recurrence (Daily / Weekdays / Weekly / One-time), notes
- **Progress dashboard** — total tasks, completed, day streak, completion %
- **30-day completion heatmap** — teal color ramp across 4 levels
- **Week view** showing recurring tasks per day of the current week
- **localStorage persistence** — tasks survive page refresh and browser restart

## How to open

No install required.

```bash
# Clone or download the repo, then:
open habit-tracker/index.html
# or just double-click index.html in Finder / Explorer
```

## File structure

```
habit-tracker/
├── index.html   # Markup & layout
├── style.css    # All styles (CSS custom properties, flat design)
├── app.js       # All logic (state, rendering, localStorage)
├── README.md
└── .gitignore
```

## Tech

Vanilla HTML, CSS, and JavaScript — no dependencies, no build tools.
