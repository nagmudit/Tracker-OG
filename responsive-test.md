# Responsive Testing Checklist

Use this checklist after frontend changes.

## Viewports

- 360 x 740 mobile
- 390 x 844 mobile
- 768 x 1024 tablet
- 1366 x 768 desktop
- 1440 x 900 desktop

## Core Flows

- Sign up, log in, log out, and reload while authenticated
- Open the mobile bottom navigation and switch tabs
- Add an expense from the center mobile Add action
- Add income and expense entries
- Use Today and Yesterday date shortcuts
- Change category and payment method
- Confirm last-used category and payment method are remembered
- Search and filter transactions
- Edit a transaction and verify the updated row appears immediately
- Delete a transaction
- Add and delete a custom category
- Confirm default categories cannot be deleted
- Delete all data from Profile without a full page reload
- Toggle light and dark theme

## Visual Checks

- No horizontal scrolling on mobile
- Bottom navigation does not cover primary actions
- Quick-entry sheet fits within the viewport and scrolls when needed
- Buttons are at least 44px tall on touch screens
- Text does not overflow buttons, cards, or filters
- Charts remain readable on mobile
- Modals and bottom sheets have visible close/cancel actions
- Focus states are visible in light and dark themes
- shadcn cards, sheets, dialogs, selects, and buttons use theme tokens consistently
- No hardcoded palette classes or hex values appear outside `globals.css`
- Category swatches use `chart-1` through `chart-5` tokens only

## Commands

```bash
npm run lint
npm exec tsc -- --noEmit
npm run init-db
npm run build
```

## Theme Rules

- Add future UI through `src/components/ui` primitives first.
- Use semantic classes such as `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, and `text-destructive`.
- Do not use Tailwind palette classes like gray, pink, green, red, or blue in app screens.
- Do not add color hex values outside `src/app/globals.css`.
