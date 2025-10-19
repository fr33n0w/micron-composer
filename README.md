# 🎨 Micron Page Composer

**A powerful WYSIWYG editor for creating NomadNet-ready .mu pages using the Micron markup language.**

---

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Micron](https://img.shields.io/badge/Micron-Compatible-orange.svg)

---

<img width="1365" height="864" alt="screen" src="https://github.com/user-attachments/assets/5b275874-7fbf-46b4-a877-efa85deb64f6" />

---

## 📋 Overview

Micron Page Composer is a web-based, visual editor that makes it easy to create beautifully formatted pages for NomadNet using the Micron markup language. With an intuitive interface, real-time preview, and comprehensive formatting tools, you can create rich, interactive content without memorizing complex syntax.

## ✨ Features

### 🎯 Dual Editing Modes
- **Top Toolbar**: Insert Micron code directly at cursor position
- **Floating Toolbar**: Select text to format it with the context-aware floating toolbar

### 🎨 Rich Formatting Options
- **Text Styles**: Bold, italic, underline with keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)
- **Colors**: Full RGB color picker for text and backgrounds (3-digit hex)
- **Alignment**: Left, center, right alignment with easy open/close tags
- **Headers**: Three levels of section headers (H1, H2, H3)

### 🔗 Interactive Elements
- **Links**: Create hyperlinks with optional bold/underline styling
- **Input Fields**: Text fields with custom width and password masking
- **Checkboxes**: Multi-select options with pre-checked states
- **Radio Buttons**: Mutually exclusive options grouped by name

### 🎭 Visual Enhancements
- **Dividers**: 20+ decorative divider styles (lines, stars, diamonds, etc.)
- **Emojis**: Built-in emoji picker with multiple categories
- **ASCII Art**: Extensive ASCII character library for boxes, lines, arrows, symbols

### ✨ Special Features
- **Magic Auto-Format**: Experimental AI-powered page beautification
- **Live Preview**: Real-time Micron rendering as you type
- **External Preview**: Open preview in separate window for dual-monitor workflow
- **Auto-Save**: Content automatically saved to browser localStorage
- **Syntax Help**: Comprehensive Micron syntax reference guide

### 📝 Editor Features
- **Three View Modes**: Edit, Preview, and Code viewer tabs
- **Character Counter**: Real-time line/character count
- **130 Character Warning**: MeshChat compatibility indicator
- **Undo/Redo**: Full history with Ctrl+Z / Ctrl+Y
- **Strip Codes**: Remove all formatting to get plain text
- **Export**: Download as .mu file ready for NomadNet

## 🚀 Quick Start

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/micron-composer.git
cd micron-composer
```

2. **Open in browser:**
```bash
# Simply open composer.html in your web browser
# Or use a local server (recommended):
python -m http.server 8000
# Then navigate to http://localhost:8000/composer.html
```

### Usage

1. **Start Editing**: Type or paste content in the editor
2. **Format Text**: 
   - Click toolbar buttons to insert formatting codes
   - Select text and use floating toolbar for quick formatting
3. **Preview**: Switch to "Page Preview" tab to see rendered output
4. **Export**: Click "Export file" to download your .mu page

## 📖 Micron Syntax Quick Reference

### Text Formatting
```
`!Bold text`!          - Bold
`*Italic text`*        - Italic  
`_Underlined text`_    - Underline
``                     - Reset all formatting
```

### Colors
```
`FxxxText`f            - Text color (xxx = 3-digit hex)
`BxxxText`b            - Background color
`Ff00Red text`f        - Example: Red text
```

### Alignment
```
`cCentered text`a      - Center align
`lLeft aligned`a       - Left align
`rRight aligned`a      - Right align
```

### Headers
```
>Header Level 1        - Main header
>>Header Level 2       - Subheader
>>>Header Level 3      - Sub-subheader
```

### Links
```
`[Link text`/path/to/page.mu]     - Basic link
`[`destination.mu]                - Link without custom text
```

### Input Fields
```
`<fieldname`default value>              - Text field
`<24|fieldname`value>                   - Sized field (24 chars)
`<!16|password`Enter password>          - Masked password field
```

### Checkboxes & Radio Buttons
```
`<?|field|value`Label text>             - Checkbox
`<?|field|value|*`Pre-checked>          - Pre-checked checkbox
`<^|group|value`Option 1>               - Radio button
`<^|group|value|*`Selected>             - Pre-selected radio
```

### Dividers
```
-                      - Simple horizontal line
-=                     - Equal signs divider
-━                     - Heavy line divider
-★                     - Star divider
```

### Comments
```
# This is a comment    - Not displayed in output
```

## 🛠️ Technical Details

### Built With
- **HTML5/CSS3/JavaScript** - Core technologies
- **Original Micron Parser** - Official NomadNet Micron parser (JavaScript port)
- **DOMPurify** - XSS protection and HTML sanitization
- **localStorage API** - Auto-save functionality

### Browser Compatibility
- ✅ Firefox (Recommended)
- ✅ Chrome/Chromium
- ✅ Edge
- ✅ Safari
- ⚠️ Best experience with Firefox

### File Structure
```
micron-composer/
├── composer.html           # Main HTML file
├── styles.css             # All styling
├── editor.js              # Editor logic and functionality
└── script/
    ├── micron-parser_original.js  # Official Micron parser
    └── purify.min.js      # DOMPurify library
```

## 🎯 Micron Syntax Features Supported

- ✅ Text formatting (bold, italic, underline)
- ✅ Foreground and background colors (3-digit hex)
- ✅ Text alignment (left, center, right)
- ✅ Section headers (3 levels)
- ✅ Horizontal dividers (plain and custom characters)
- ✅ Hyperlinks with form field submission
- ✅ Input fields (text, password, sized)
- ✅ Checkboxes (single and pre-checked)
- ✅ Radio buttons (grouped and pre-selected)
- ✅ Comments (lines starting with #)
- ✅ Literal text mode (escape sequences)
- ✅ Format reset codes

## 📱 Features

### Auto-Save
Content is automatically saved to browser localStorage every time you type. Your work persists across browser sessions unless you:
- Click "Clear page"
- Click "Start New Page" and confirm
- Clear browser data

### Keyboard Shortcuts
- `Ctrl+B` - Bold
- `Ctrl+I` - Italic
- `Ctrl+U` - Underline
- `Ctrl+S` - Convert to Micron
- `Ctrl+Z` - Undo
- `Ctrl+Y` / `Ctrl+Shift+Z` - Redo
- `Esc` - Close modal

### MeshChat Compatibility
- Real-time character counter
- 130 character per line limit indicator
- Optimal formatting for terminal display

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Areas for Contribution
- Additional divider styles
- More emoji categories
- Additional ASCII art characters
- Improved Magic auto-format algorithm
- Additional export formats
- Internationalization

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NomadNet** - For the Micron markup language
- **Mark Qvist** - Original Micron parser implementation
- **Reticulum Network** - Mesh networking stack
- **DOMPurify** - XSS protection library

## 📞 Support

- 📚 [Micron Documentation](https://github.com/markqvist/NomadNet)
- 💬 [NomadNet Community](https://unsigned.io/projects/nomadnet/)
- 🐛 [Report Issues](https://github.com/yourusername/micron-composer/issues)

## 🗺️ Roadmap

- [ ] Template library
- [ ] Custom color palettes
- [ ] Multi-page project support
- [ ] Direct NomadNet publishing
- [ ] Collaborative editing
- [ ] Mobile-optimized interface
- [ ] Dark/Light theme toggle
- [ ] Import from existing .mu files

## 📸 Screenshots

<img width="1357" height="865" alt="screen2" src="https://github.com/user-attachments/assets/e680c157-ae13-4e35-99b9-b0fa34605924" />
---

**Made with ❤️ for the NomadNet community**

*Keep your lines under 130 characters for MeshChat compatibility!*
