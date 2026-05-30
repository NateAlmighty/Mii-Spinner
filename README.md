# Mii Item Spinner

A fun, interactive wheel spinner app for randomly selecting Mii characters, categories, subcategories, and items. Spin through 4 sequential wheels to generate random combinations!

## Features

- **4 Sequential Wheels**: Spin wheels in order - Mii → Category → Subcategory → Item
- **Progressive Unlocking**: Each wheel unlocks the next after spinning
- **Customizable Options**: Add, remove, and manage options for each wheel
- **Respin Functionality**: Respin any wheel without resetting everything
- **Back Navigation**: Go back to previous wheels to change selections
- **Persistent Data**: Saves your custom options to localStorage
- **Responsive Design**: Clean, modern UI that works on various screen sizes

## How to Use

1. **Spin the First Wheel**: Click "Spin" on the Mii wheel to select a random character
2. **Continue Spinning**: After each spin, the next wheel unlocks automatically
3. **Manage Options**: Click the ⚙ button on any wheel to:
   - Add new options
   - Remove existing options
   - View current options
4. **Respin**: Use the green "Respin" button to spin the current wheel again
5. **Go Back**: Use the red "← Back" button to return to a previous wheel (resets subsequent wheels)
6. **Reset All**: Click "🔄 Reset All" to start fresh

## Wheel Structure

The app uses a hierarchical structure:

1. **Mii** - Character names (e.g., Aang, Katara, Zuko)
2. **Category** - Top-level item categories (e.g., Clothing, Food, Treasures)
3. **Subcategory** - Grouped by category (e.g., Hat, Shirt, Pants under Clothing)
4. **Item** - Specific items unique to each Mii + Category + Subcategory combination

## File Structure

```
Mii-Spinner/
├── index.html      # Main HTML structure
├── style.css       # All styling
├── script.js       # All JavaScript logic
└── README.md       # This file
```

## Customization

### Default Options

Edit the `DEFAULTS` object in `script.js` to change the starting options:

```javascript
const DEFAULTS = {
  miis: ['Aang', 'Katara', 'Zuko', 'Toph', 'Sokka'],
  categories: ['Clothing', 'Food', 'Treasures', 'Interior/Exterior', 'Objects', 'Landscaping'],
  subcategories: {
    Treasures: ['Books', 'Music', 'Videos', 'Video Games', 'Pets'],
    Clothing: ['Hat', 'Shirt', 'Pants', 'Cape', 'Shoes'],
    // ...
  },
  items: {
    'Aang|Clothing|Hat': []
  }
};
```

### Colors

Modify the color palette in `script.js`:

```javascript
const PAL = ['#7c3aed', '#4f46e5', '#0891b2', '#0d9488', '#059669', ...];
```

### Styling

All visual styles are in `style.css`. Key classes:
- `.wheel-section` - Individual wheel container
- `.btn-spin` - Primary spin button
- `.btn-respin` - Green respin button
- `.btn-back` - Red back button
- `.modal` - Options management modal

## Data Persistence

The app saves your custom options to:
- **localStorage** - Primary storage for browser sessions
- **URL parameters** - Enables sharing configurations via URL

Data is automatically saved when you add or remove options.

## Browser Compatibility

Works in all modern browsers that support:
- Canvas API
- localStorage
- ES6 JavaScript

## License

Free to use and modify for personal projects.