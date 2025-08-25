---
"@liam-hq/erd-core": patch
---

🎨 Fix ERD AppBar title alignment with flexbox layout
  - Replace grid layout with flexbox for cleaner implementation
  - Use `flex: 1` on title element to push right-side elements naturally
  - Remove unnecessary media query specific margins
  - Add consistent horizontal spacing between header elements