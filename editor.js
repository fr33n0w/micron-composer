// Micron Editor - Single View with 130 char line limit
// Using original Micron Parser
const MAX_LINE_LENGTH = 130;

let currentColorType = 'fg';
let micronParser = null;

// Elements
const editor = document.getElementById('editor');
const micronOutput = document.getElementById('micron-output');
const previewContent = document.getElementById('preview-content');

// Undo functionality
let editorHistory = [];
let historyIndex = -1;
let isUndoing = false;
let autoConvertTimer = null;
const AUTO_CONVERT_DELAY = 1000; // 1 second after typing stops

function saveState() {
    if (isUndoing) return;
    editorHistory = editorHistory.slice(0, historyIndex + 1);
    editorHistory.push(editor.value);
    historyIndex++;
    if (editorHistory.length > 50) {
        editorHistory.shift();
        historyIndex--;
    }
}

function undo() {
    if (historyIndex > 0) {
        isUndoing = true;
        historyIndex--;
        editor.value = editorHistory[historyIndex];
        updateEditorInfo();
        isUndoing = false;
        setStatus('Undo');
    }
}

function redo() {
    if (historyIndex < editorHistory.length - 1) {
        isUndoing = true;
        historyIndex++;
        editor.value = editorHistory[historyIndex];
        updateEditorInfo();
        isUndoing = false;
        setStatus('Redo');
    }
}

// Initialize Micron Parser
function initializeMicronParser() {
    if (typeof window.MicronParser === 'function') {
        console.log('Using original MicronParser');
        try {
            micronParser = new window.MicronParser(true, true);
            setStatus('Original Micron Parser loaded! Ready to create micron pages!');
            return true;
        } catch (e) {
            console.error('Error initializing original parser:', e);
        }
    }
    console.log('Using fallback parser');
    micronParser = createFallbackParser();
    setStatus('Using fallback parser');
    return false;
}

// Fallback parser
function createFallbackParser() {
    return {
        convertMicronToHtml: function(text) {
            let html = text;
            const markers = [];
            let markerIndex = 0;
            
            html = html.replace(/`!([^`]*)`!/g, (match, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'bold', content});
                return id;
            });
            html = html.replace(/`\*([^`]*)`\*/g, (match, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'italic', content});
                return id;
            });
            html = html.replace(/`_([^`]*)`_/g, (match, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'underline', content});
                return id;
            });
            html = html.replace(/`\[([^`]*)`([^\]]+)\]/g, (match, text, url) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'link', text, url});
                return id;
            });
            
            // Checkboxes: `<?|field|value`>Label or `<?|field|value|*`>Label
            html = html.replace(/`<\?([^>]+)>([^`]*)/g, (match, params, label) => {
                const parts = params.split('|');
                const field = parts[0];
                const value = parts[1];
                const checked = parts[2] === '*';
                
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'checkbox', field, value, checked, label});
                return id;
            });
            
            // Radio buttons: `<^|group|value`>Label or `<^|group|value|*`>Label
            html = html.replace(/`<\^([^>]+)>([^`]*)/g, (match, params, label) => {
                const parts = params.split('|');
                const group = parts[0];
                const value = parts[1];
                const checked = parts[2] === '*';
                
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'radio', group, value, checked, label});
                return id;
            });
            
            html = html.replace(/`F([0-9a-fA-F]{3})([^`]*)`f/g, (match, color, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'fg', color, content});
                return id;
            });
            html = html.replace(/`B([0-9a-fA-F]{3})([^`]*)`b/g, (match, color, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'bg', color, content});
                return id;
            });
            html = html.replace(/`c([^`]*)`a/g, (match, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'center', content});
                return id;
            });
            html = html.replace(/`l([^`]*)`a/g, (match, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'left', content});
                return id;
            });
            html = html.replace(/`r([^`]*)`a/g, (match, content) => {
                const id = `###M${markerIndex++}###`;
                markers.push({id, type: 'right', content});
                return id;
            });
            
            const div = document.createElement('div');
            div.textContent = html;
            html = div.innerHTML;
            
            markers.forEach(m => {
                let replacement = '';
                switch(m.type) {
                    case 'bold':
                        replacement = `<strong style="color: #58a6ff; font-weight: bold;">${escapeHtml(m.content)}</strong>`;
                        break;
                    case 'italic':
                        replacement = `<em style="color: #ffa657; font-style: italic;">${escapeHtml(m.content)}</em>`;
                        break;
                    case 'underline':
                        replacement = `<span style="text-decoration: underline; color: #79c0ff;">${escapeHtml(m.content)}</span>`;
                        break;
                    case 'link':
                        replacement = `<a href="${escapeHtml(m.url)}" style="color: #58a6ff; text-decoration: underline;">${escapeHtml(m.text)}</a>`;
                        break;
                    case 'checkbox':
                        replacement = `<input type="checkbox" ${m.checked ? 'checked' : ''}> <span style="color: #e6edf3;">${escapeHtml(m.label)}</span>`;
                        break;
                    case 'radio':
                        replacement = `<input type="radio" name="${escapeHtml(m.group)}" value="${escapeHtml(m.value)}" ${m.checked ? 'checked' : ''}> <span style="color: #e6edf3;">${escapeHtml(m.label)}</span>`;
                        break;
                    case 'fg':
                        replacement = `<span style="color: #${m.color};">${escapeHtml(m.content)}</span>`;
                        break;
                    case 'bg':
                        replacement = `<span style="background-color: #${m.color}; padding: 2px 4px;">${escapeHtml(m.content)}</span>`;
                        break;
                    case 'center':
                        replacement = `<div style="text-align: center; margin: 2px 0;">${escapeHtml(m.content)}</div>`;
                        break;
                    case 'left':
                        replacement = `<div style="text-align: left; margin: 2px 0;">${escapeHtml(m.content)}</div>`;
                        break;
                    case 'right':
                        replacement = `<div style="text-align: right; margin: 2px 0;">${escapeHtml(m.content)}</div>`;
                        break;
                }
                html = html.replace(m.id, replacement);
            });
            
            html = html.replace(/^&gt;&gt;&gt;([^\n]*)/gm, '<div style="color: #58a6ff; font-weight: bold; font-size: 14px; margin: 4px 0 2px 40px;">$1</div>');
            html = html.replace(/^&gt;&gt;([^\n]*)/gm, '<div style="color: #58a6ff; font-weight: bold; font-size: 16px; margin: 6px 0 3px 20px;">$1</div>');
            html = html.replace(/^&gt;([^\n]*)/gm, '<div style="color: #58a6ff; font-weight: bold; font-size: 18px; margin: 8px 0 4px 0; border-bottom: 1px solid #30363d; padding-bottom: 2px;">$1</div>');
            html = html.replace(/^-{2,}$/gm, '<hr style="border: none; border-top: 1px solid #30363d; margin: 8px 0;">');
            html = html.replace(/^#[^\n]*/gm, '');
            html = html.replace(/\n/g, '<br>');
            
            return `<div style="font-family: 'Courier New', monospace; line-height: 1.3;">${html}</div>`;
        }
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Tab Switching
function switchMainTab(tab) {
    document.querySelectorAll('.main-panel').forEach(p => p.classList.remove('active'));
    
    // Remove active class from all tab buttons only
    document.querySelectorAll('.action-bar .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tab === 'edit') {
        document.getElementById('edit-tab').classList.add('active');
        document.querySelector('.action-bar .tab-btn[onclick*="edit"]').classList.add('active');
        setStatus('Micron Editor - Edit your page content');
    } else if (tab === 'code') {
        // Auto-update before switching to code tab
        autoConvertToMicron();
        document.getElementById('code-tab').classList.add('active');
        document.querySelector('.action-bar .tab-btn[onclick*="code"]').classList.add('active');
        setStatus('Code Viewer - View the raw Micron markup (read-only)');
    } else if (tab === 'preview') {
        // Auto-update and preview before switching
        autoConvertToMicron();
        autoPreviewMicron();
        document.getElementById('preview-tab').classList.add('active');
        document.querySelector('.action-bar .tab-btn[onclick*="preview"]').classList.add('active');
        setStatus('Page Preview - See how your page will look when rendered');
    }
}

// Update Info
function updateEditorInfo() {
    const text = editor.value;
    const pos = editor.selectionStart;
    const beforeCursor = text.substring(0, pos);
    const lines = beforeCursor.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    
    document.getElementById('line-info').textContent = `Line ${line}, Col ${col}`;
    document.getElementById('char-count').textContent = `${text.length} chars`;
}

function updateMicronInfo() {
    const text = micronOutput.value;
    const lines = text.split('\n').length;
    document.getElementById('micron-lines').textContent = `${lines} lines`;
    document.getElementById('micron-chars').textContent = `${text.length} chars`;
}

function handleEditorKeydown(e) {
    if (e.key === 'Enter') {
        return;
    }
}

// Format Functions
function getSelectedText() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    return {
        text: editor.value.substring(start, end),
        start: start,
        end: end
    };
}

function wrapSelectedText(prefix, suffix) {
    const sel = getSelectedText();
    if (!sel.text) {
        setStatus('Please select some text first!');
        return;
    }
    
    const before = editor.value.substring(0, sel.start);
    const after = editor.value.substring(sel.end);
    editor.value = before + prefix + sel.text + suffix + after;
    
    editor.selectionStart = sel.start + prefix.length;
    editor.selectionEnd = sel.end + prefix.length;
    editor.focus();
    updateEditorInfo();
    saveState();
}

function formatText(type) {
    // Check if text is selected - if yes, use floating toolbar behavior
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    if (start !== end) {
        // Text is selected - wrap it
        const text = editor.value.substring(start, end);
        let prefix, suffix;
        
        switch(type) {
            case 'bold':
                prefix = '`!';
                suffix = '`!';
                break;
            case 'italic':
                prefix = '`*';
                suffix = '`*';
                break;
            case 'underline':
                prefix = '`_';
                suffix = '`_';
                break;
        }
        
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        editor.value = before + prefix + text + suffix + after;
        
        editor.selectionStart = start + prefix.length;
        editor.selectionEnd = end + prefix.length;
        editor.focus();
        updateEditorInfo();
        saveState();
        return;
    }
    
    // No selection - insert code directly
    let code;
    switch(type) {
        case 'bold':
            code = '\n`! Insert your bold text here! `!\n';
            break;
        case 'italic':
            code = '\n`* Insert your italic text here! `*\n';
            break;
        case 'underline':
            code = '\n`_ Insert your underlined text here! `_\n';
            break;
    }
    
    const pos = editor.selectionStart;
    const before = editor.value.substring(0, pos);
    const after = editor.value.substring(pos);

    editor.value = before + code + after;

    // Position cursor at the end of inserted code
    const newPos = pos + code.length;
    editor.selectionStart = newPos;
    editor.selectionEnd = newPos;
    updateEditorInfo();
    saveState();
    setStatus('Format code inserted - Replace "text" with your content');
}

function alignText(alignment) {
    // Check if text is selected
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    if (start !== end) {
        // Text is selected - only add opening tag
        const text = editor.value.substring(start, end);
        let prefix;
        
        switch(alignment) {
            case 'center':
                prefix = '`c';
                break;
            case 'left':
                prefix = '`l';
                break;
            case 'right':
                prefix = '`r';
                break;
        }
        
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        editor.value = before + prefix + text + after;
        
        editor.selectionStart = start + prefix.length;
        editor.selectionEnd = end + prefix.length;
        editor.focus();
        updateEditorInfo();
        saveState();
        setStatus('Alignment opened - use `a to close');
        return;
    }
    
    // No selection - insert only the code
    let code;
    switch(alignment) {
        case 'center':
            code = '`c';
            break;
        case 'left':
            code = '`l';
            break;
        case 'right':
            code = '`r';
            break;
    }
    
    const pos = editor.selectionStart;
    const before = editor.value.substring(0, pos);
    const after = editor.value.substring(pos);
    
    editor.value = before + code + after;
    
    // Position cursor after the code
    editor.selectionStart = pos + 2; // After `c or `l or `r
    editor.selectionEnd = pos + 2;
    editor.focus();
    updateEditorInfo();
    saveState();

    // Focus after a brief delay to ensure cursor position sticks
    setTimeout(() => {
        editor.focus();
        editor.setSelectionRange(newPos, newPos);
    }, 30);

    setStatus('Alignment code inserted - use `a to close');
}

// Updated Format Functions for Top Toolbar - Direct Code Insertion
function insertHeader(level) {
    const prefix = '>'.repeat(level);
    const pos = editor.selectionStart;
    const before = editor.value.substring(0, pos);
    const after = editor.value.substring(pos);
    
    let insert = prefix + ' ';
    if (pos > 0 && before.charAt(before.length - 1) !== '\n') {
        insert = '\n' + insert;
    }
    
    editor.value = before + insert + after;
    editor.selectionStart = editor.selectionEnd = pos + insert.length;
    editor.focus();
    updateEditorInfo();
    saveState();
    setStatus('Header ' + level + ' inserted - Type your header text');
}

function insertDivider() {
    const pos = editor.selectionStart;
    const before = editor.value.substring(0, pos);
    const after = editor.value.substring(pos);
    
    let insert = '----------';
    if (pos > 0 && before.charAt(before.length - 1) !== '\n') {
        insert = '\n' + insert;
    }
    if (after && after.charAt(0) !== '\n') {
        insert += '\n';
    }
    
    editor.value = before + insert + after;
    editor.selectionStart = editor.selectionEnd = pos + insert.length;
    editor.focus();
    updateEditorInfo();
    saveState();
    setStatus('Divider inserted');
}

// Color Dialog
function openColorDialog(type) {
    currentColorType = type;
    document.getElementById('color-modal').classList.add('active');
    document.getElementById('color-input').value = '';
    document.getElementById('color-input').focus();
    
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onclick = function() {
            const color = this.getAttribute('data-color');
            document.getElementById('color-input').value = color;
            applyColor();
        };
    });
}

window.applyColors = function() {
    var ed = document.getElementById('editor');
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    var text = ed.value.substring(start, end);
    
    if (!text) {
        if (typeof window.setStatus === 'function') {
            window.setStatus('Please select text first');
        }
        return;
    }
    
    var fg = window.TOOLBAR_STATE.fgColor;
    var bg = window.TOOLBAR_STATE.bgColor;
    
    if (!fg && !bg) {
        if (typeof window.setStatus === 'function') {
            window.setStatus('Please select at least one color');
        }
        return;
    }
    
    var result = text;
    if (fg && bg) {
        result = '`F' + fg + '`B' + bg + text + '`b`f';
    } else if (fg) {
        result = '`F' + fg + text + '`f';
    } else if (bg) {
        result = '`B' + bg + text + '`b';
    }
    
    ed.value = ed.value.substring(0, start) + result + ed.value.substring(end);
    
    // Set cursor position BEFORE focus
    var newPos = start + result.length;
    ed.setSelectionRange(newPos, newPos);
    ed.focus();
    
    if (typeof window.updateEditorInfo === 'function') {
        window.updateEditorInfo();
    }
    
    if (typeof window.saveState === 'function') {
        window.saveState();
    }
    
    closeColorModal();
    
    if (typeof window.setStatus === 'function') {
        if (fg && bg) {
            window.setStatus('Text and background colors applied');
        } else if (fg) {
            window.setStatus('Text color applied');
        } else {
            window.setStatus('Background color applied');
        }
    }
};

// Update openLinkDialog to work without selection
function openLinkDialog() {
    const sel = getSelectedText();
    document.getElementById('link-modal').classList.add('active');
    document.getElementById('link-text').value = sel.text || 'Link text';
    document.getElementById('link-url').value = '';
    document.getElementById('link-url').focus();
}

function applyLink() {
    const text = document.getElementById('link-text').value;
    const url = document.getElementById('link-url').value;
    const bold = document.getElementById('link-bold').checked;
    const underline = document.getElementById('link-underline').checked;
    
    if (!url) {
        alert('Please enter a URL!');
        return;
    }
    
    const linkText = text || url;
    let linkCode = '`[' + linkText + '`' + url + ']';
    
    // Add bold wrapper if checked (inside the link backticks)
    if (bold) {
        linkCode = '`!' + linkCode + '`!';
    } else {
        linkCode = linkCode + '`';  // Close link backtick if no bold
    }
    
    // Add underline wrapper if checked
    if (underline) {
        linkCode = '`_' + linkCode + '`_';
    }
    
    const sel = getSelectedText();
    const before = editor.value.substring(0, sel.start);
    const after = editor.value.substring(sel.end);
    
    editor.value = before + linkCode + after;
    editor.selectionStart = editor.selectionEnd = sel.start + linkCode.length;
    editor.focus();
    updateEditorInfo();
    saveState();
    
    // Clear form
    document.getElementById('link-text').value = '';
    document.getElementById('link-url').value = '';
    document.getElementById('link-bold').checked = false;
    document.getElementById('link-underline').checked = false;
    
    closeModal();
}

// Emoji Dialog
function openEmojiDialog() {
    document.getElementById('emoji-modal').classList.add('active');
    
    document.querySelectorAll('.emoji-item').forEach(item => {
        item.onclick = function() {
            const emoji = this.getAttribute('data-emoji');
            insertAtCursor(emoji);
            closeModal();
            setStatus('Emoji inserted!');
        };
    });
}

function showEmojiCategory(category) {
    document.querySelectorAll('.emoji-cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.emoji-category').forEach(cat => cat.classList.remove('active'));
    document.querySelector(`.emoji-category[data-category="${category}"]`).classList.add('active');
}

function insertAtCursor(text) {
    const pos = editor.selectionStart;
    const before = editor.value.substring(0, pos);
    const after = editor.value.substring(pos);
    
    editor.value = before + text + after;
    editor.selectionStart = editor.selectionEnd = pos + text.length;
    editor.focus();
    updateEditorInfo();
    saveState();
}

// Modal Functions
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function showHelp() {
    document.getElementById('help-modal').classList.add('active');
}

// Convert to Micron
function convertToMicron() {
    let text = editor.value;
    micronOutput.value = text;
    updateMicronInfo();
    setStatus('Converted to Micron! Remember to keep lines under 130 chars for MeshChat compatibility.');
    switchMainTab('code');
}

// Auto-convert (silent, no tab switch, no cursor movement)
function autoConvertToMicron() {
    // Store cursor position
    let cursorPos = editor.selectionStart;
    
    let text = editor.value;
    micronOutput.value = text;
    updateMicronInfo();
    
    // Restore cursor if editor is focused
    if (document.activeElement === editor) {
        editor.setSelectionRange(cursorPos, cursorPos);
    }
}


// Preview Micron
function previewMicron() {
    const micronCode = micronOutput.value;
    if (!micronCode) {
        alert('No Micron code to preview! Convert your text first.');
        return;
    }
    
    try {
        const html = micronParser.convertMicronToHtml(micronCode);
        previewContent.innerHTML = html;
        switchMainTab('preview');
        setStatus('Preview updated!');
    } catch (error) {
        alert('Preview error: ' + error.message);
        console.error(error);
    }
}

// Auto-preview (silent, used internally, no cursor movement)
function autoPreviewMicron() {
    // Store cursor position
    let cursorPos = editor.selectionStart;
    
    const micronCode = micronOutput.value;
    if (!micronCode) return;
    
    try {
        const html = micronParser.convertMicronToHtml(micronCode);
        
        // DEBUG: Log the HTML to console
        console.log('Generated HTML:', html);
        
        previewContent.innerHTML = html;
    } catch (error) {
        console.error('Auto-preview error:', error);
    }
    
    // Restore cursor if editor is focused
    if (document.activeElement === editor) {
        editor.setSelectionRange(cursorPos, cursorPos);
    }
}

function loadFromMicron() {
    const micronCode = micronOutput.value;
    if (!micronCode) {
        alert('No Micron code to load!');
        return;
    }
    
    if (!confirm('Strip all Micron formatting codes?\n\nThis will remove ALL formatting (colors, bold, italic, links, headers, dividers, etc.) and leave only plain text.\n\nThis action can be undone with ctrl+z')) {
        return;
    }
    
    let text = micronCode;
    
    // Remove all Micron formatting codes iteratively (some codes might be nested)
    let previousText = '';
    let iterations = 0;
    
    while (previousText !== text && iterations < 10) {
        previousText = text;
        
        // Remove text formatting
        text = text.replace(/`!([^`]*)`!/g, '$1');
        text = text.replace(/`\*([^`]*)`\*/g, '$1');
        text = text.replace(/`_([^`]*)`_/g, '$1');
        
        // Remove colors (with and without content)
        text = text.replace(/`F[0-9a-fA-F]{3}([^`]*)`f/g, '$1');
        text = text.replace(/`F[0-9a-fA-F]{3}/g, '');
        text = text.replace(/`f/g, '');
        
        // Remove backgrounds (with and without content)
        text = text.replace(/`B[0-9a-fA-F]{3}([^`]*)`b/g, '$1');
        text = text.replace(/`B[0-9a-fA-F]{3}/g, '');
        text = text.replace(/`b/g, '');
        
        // Remove alignment
        text = text.replace(/`c([^`]*)`a/g, '$1');
        text = text.replace(/`l([^`]*)`a/g, '$1');
        text = text.replace(/`r([^`]*)`a/g, '$1');
        text = text.replace(/`c/g, '');
        text = text.replace(/`l/g, '');
        text = text.replace(/`r/g, '');
        text = text.replace(/`a/g, '');
        
        // Remove links - extract just the link text
        text = text.replace(/`\[([^`]*)`([^\]]+)\]`/g, '$1');
        text = text.replace(/`\[([^`]*)`([^\]]+)\]/g, '$1');
        
        // Remove input fields and form elements
        text = text.replace(/`<[^>]+>/g, '');
        
        // Remove any remaining !text! and _text_ patterns (leftover from nested formatting)
        text = text.replace(/!([^!]+)!/g, '$1');
        text = text.replace(/_([^_]+)_/g, '$1');
        
        // Remove any remaining standalone backticks (reset codes)
        text = text.replace(/``/g, '');
        text = text.replace(/`/g, '');
        
        iterations++;
    }
    
    // Remove headers
    text = text.replace(/^>+/gm, '');
    
    // Remove divider lines (-char format)
    text = text.replace(/^-.+$/gm, '');
    
    // Remove comments
    text = text.replace(/^#.+$/gm, '');
    
    // Remove empty lines (more than 2 consecutive)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    editor.value = text.trim();
    
    // Set cursor at the beginning
    editor.setSelectionRange(0, 0);
    editor.focus();
    
    updateEditorInfo();
    saveState();
    setStatus('All formatting codes stripped! Plain text ready for editing.');
    switchMainTab('edit');
}

// Download
function downloadMicron() {
    const content = micronOutput.value;
    if (!content) {
        alert('No content to download! Convert your text first.');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'page.mu';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Downloaded page.mu!');
}

// Copy
function copyMicron() {
    const content = micronOutput.value;
    if (!content) {
        alert('No Micron code to copy!');
        return;
    }
    
    // Create a temporary textarea to copy from
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = content;
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.left = '-9999px';
    document.body.appendChild(tempTextarea);
    
    // Select and copy
    tempTextarea.select();
    tempTextarea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        setStatus('Full Page Code Copied to Clipboard!');
    } catch (err) {
        alert('Failed to copy to clipboard');
        console.error('Copy failed:', err);
    }
    
    // Remove temporary textarea
    document.body.removeChild(tempTextarea);
}

// Clear
function clearAll() {
    if (confirm('Clear all content in the page editor? (ctrl+z to undo)')) {
        editor.value = '';
        micronOutput.value = '';
        previewContent.innerHTML = 'Preview cleared';
        updateEditorInfo();
        updateMicronInfo();
        setStatus('All content cleared');
        switchMainTab('edit');
        
        // Clear localStorage
        localStorage.removeItem('micronEditorContent');
        saveState();
    }
}

// Status
function setStatus(msg) {
    const statusEl = document.getElementById('status-msg');
    statusEl.textContent = msg;
    statusEl.style.color = '#fff'; // White text
    
    setTimeout(() => {
        statusEl.textContent = 'Micron Composer Ready.';
        statusEl.style.color = '#7d8590'; // Back to gray
    }, 5000); // 5 seconds instead of 3
}

// Event Listeners
editor.addEventListener('input', () => {
    updateEditorInfo();
    saveState();
    
    // Save to localStorage
    localStorage.setItem('micronEditorContent', editor.value);
    
    // Auto-convert after 1 second of no typing
    clearTimeout(autoConvertTimer);
    autoConvertTimer = setTimeout(() => {
        autoConvertToMicron();
        autoPreviewMicron();
    }, AUTO_CONVERT_DELAY);
});
editor.addEventListener('keydown', handleEditorKeydown);
editor.addEventListener('click', updateEditorInfo);
editor.addEventListener('keyup', updateEditorInfo);
micronOutput.addEventListener('input', updateMicronInfo);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
            case 's':
                e.preventDefault();
                convertToMicron();
                break;
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
        }
    }
    
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Close modal on background click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Initialize - Make functions global
window.addEventListener('load', () => {
    const parserLoaded = initializeMicronParser();
    
    // Load content from localStorage if available, otherwise use default
    const savedContent = localStorage.getItem('micronEditorContent');
    if (savedContent) {
        editor.value = savedContent;
    } else {
        editor.value = DEFAULT_TEMPLATE;  // Changed this line
    }
    
    updateEditorInfo();
    saveState();
    
    // Initial auto-conversion to sync all tabs
    autoConvertToMicron();
    autoPreviewMicron();
    
    // Make functions globally accessible
    window.insertHeader = insertHeader;
    window.insertDivider = insertDivider;
    window.formatText = formatText;
    window.alignText = alignText;
    window.openColorDialog = openColorDialog;
    window.openLinkDialog = openLinkDialog;
    window.openEmojiDialog = openEmojiDialog;
    window.showHelp = showHelp;
    window.applyColor = applyColor;
    window.applyLink = applyLink;
    window.closeModal = closeModal;
    window.switchMainTab = switchMainTab;
    window.convertToMicron = convertToMicron;
    window.previewMicron = previewMicron;
    window.downloadMicron = downloadMicron;
    window.copyMicron = copyMicron;
    window.loadFromMicron = loadFromMicron;
    window.clearAll = clearAll;
    window.newPage = newPage;
    window.showEmojiCategory = showEmojiCategory;
    
    if (parserLoaded) {
        console.log('Original Micron Parser ready!');
    } else {
        console.log('Using fallback parser');
    }
    
    console.log('Micron Editor initialized');
});

// Floating Toolbar and Color Modal Functions
console.log('=== FLOATING TOOLBAR SCRIPT STARTING ===');

// Global state
window.TOOLBAR_STATE = {
    fgColor: '',
    bgColor: ''
};

// Initialize after a delay
setTimeout(function() {
    console.log('Initializing floating toolbar...');
    
    var ed = document.getElementById('editor');
    var ft = document.getElementById('floating-toolbar');
    
    if (!ed || !ft) {
        console.error('MISSING ELEMENTS!', {editor: !!ed, toolbar: !!ft});
        return;
    }
    
    console.log('Elements found, attaching events...');
    
    ed.addEventListener('mouseup', function() {
        console.log('MOUSEUP EVENT');
        setTimeout(showFloatingToolbar, 50);
    });
    
    ed.addEventListener('dblclick', function() {
        console.log('DBLCLICK EVENT');
        setTimeout(showFloatingToolbar, 50);
    });
    
    console.log('=== FLOATING TOOLBAR READY ===');
}, 1500);

// Track mouse position
var lastMouseX = 0;
var lastMouseY = 0;

document.addEventListener('mouseup', function(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

function showFloatingToolbar() {
    console.log('showFloatingToolbar() called');
    var ed = document.getElementById('editor');
    var ft = document.getElementById('floating-toolbar');
    
    if (!ed || !ft) return;
    
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    console.log('Selection:', start, end);
    
    if (start === end) {
        console.log('No selection');
        ft.classList.remove('show');
        return;
    }
    
    var text = ed.value.substring(start, end);
    console.log('Selected:', text);
    
    if (!text.trim()) {
        ft.classList.remove('show');
        return;
    }
    
    // Position near mouse cursor
    var top = lastMouseY - 100; // 60px above mouse
    var left = lastMouseX - 100; // 10px to the right of mouse
    
    // Keep toolbar within viewport
    if (top < 10) top = lastMouseY + 20; // Show below if not enough space above
    if (left + 250 > window.innerWidth) left = window.innerWidth - 260; // Keep within right edge
    
    ft.style.top = top + 'px';
    ft.style.left = left + 'px';
    ft.classList.add('show');
    
    setStatus('Text selected, use toolbar to edit');
    
    console.log('TOOLBAR SHOWN at mouse:', top, left);
}

window.floatingFormatText = function(format) {
    console.log('floatingFormatText:', format);
    var ed = document.getElementById('editor');
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    var text = ed.value.substring(start, end);
    
    var wrap = {
        bold: ['`!', '`!'],
        italic: ['`*', '`*'],
        underline: ['`_', '`_']
    }[format];
    
    ed.value = ed.value.substring(0, start) + wrap[0] + text + wrap[1] + ed.value.substring(end);
    
    // Set cursor position BEFORE focus
    var newPos = start + wrap[0].length + text.length + wrap[1].length;
    ed.setSelectionRange(newPos, newPos);
    ed.focus();
    
    updateEditorInfo();
    saveState();
};

// Update openUnifiedColorDialog to work without selection
window.openUnifiedColorDialog = function() {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    // If text is selected, use existing behavior
    // If not, we'll insert template code when colors are applied
    
    window.TOOLBAR_STATE.fgColor = '';
    window.TOOLBAR_STATE.bgColor = '';
    document.getElementById('fg-color-input').value = '';
    document.getElementById('bg-color-input').value = '';
    updateColorPreview();
    document.getElementById('unified-color-modal').style.display = 'flex';
};

window.closeColorModal = function() {
    var modal = document.getElementById('unified-color-modal');
    var ed = document.getElementById('editor');
    
    // Store cursor position before closing
    var cursorPos = ed.selectionStart;
    
    modal.style.display = 'none';
    
    // Return focus and restore cursor position
    setTimeout(function() {
        ed.focus();
        ed.setSelectionRange(cursorPos, cursorPos);
    }, 10);
};

window.switchColorTab = function(tab) {
    document.querySelectorAll('.color-tab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.color-section').forEach(function(s) {
        s.classList.remove('active');
    });
    document.getElementById(tab + '-section').classList.add('active');
};

// Update applyColors to handle no selection
window.applyColors = function() {
    var ed = document.getElementById('editor');
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    var text = ed.value.substring(start, end);
    
    var fg = window.TOOLBAR_STATE.fgColor;
    var bg = window.TOOLBAR_STATE.bgColor;
    
    if (!fg && !bg) {
        if (typeof window.setStatus === 'function') {
            window.setStatus('Please select at least one color');
        }
        return;
    }
    
    var result;
    var selectStart, selectEnd;
    
    // If no text selected, insert template
    if (!text) {
        text = 'text';
        if (fg && bg) {
            result = '`F' + fg + '`B' + bg + text + '`b`f';
            selectStart = start + (`\`F${fg}\`B${bg}`).length;
            selectEnd = selectStart + 4; // Select "text"
        } else if (fg) {
            result = '`F' + fg + text + '`f';
            selectStart = start + (`\`F${fg}`).length;
            selectEnd = selectStart + 4;
        } else {
            result = '`B' + bg + text + '`b';
            selectStart = start + (`\`B${bg}`).length;
            selectEnd = selectStart + 4;
        }
    } else {
        // Text is selected, wrap it
        if (fg && bg) {
            result = '`F' + fg + '`B' + bg + text + '`b`f';
        } else if (fg) {
            result = '`F' + fg + text + '`f';
        } else {
            result = '`B' + bg + text + '`b';
        }
        selectStart = start + result.length;
        selectEnd = selectStart;
    }
    
    ed.value = ed.value.substring(0, start) + result + ed.value.substring(end);
    
    ed.selectionStart = selectStart;
    ed.selectionEnd = selectEnd;
    
    if (typeof window.updateEditorInfo === 'function') {
        window.updateEditorInfo();
    }
    
    if (typeof window.saveState === 'function') {
        window.saveState();
    }
    
    closeColorModal();
    
    if (typeof window.setStatus === 'function') {
        if (fg && bg) {
            window.setStatus('Text and background colors applied');
        } else if (fg) {
            window.setStatus('Text color applied');
        } else {
            window.setStatus('Background color applied');
        }
    }
    
    // Focus after a brief delay
    setTimeout(() => ed.focus(), 10);
};

function updateColorPreview() {
    var box = document.getElementById('color-preview-box');
    if (box) {
        box.style.color = window.TOOLBAR_STATE.fgColor ? '#' + window.TOOLBAR_STATE.fgColor : '#fff';
        box.style.background = window.TOOLBAR_STATE.bgColor ? '#' + window.TOOLBAR_STATE.bgColor : '#333';
    }
}

// Color picker handlers
document.addEventListener('DOMContentLoaded', function() {
    var fgPalette = document.getElementById('fg-palette');
    if (fgPalette) {
        fgPalette.addEventListener('click', function(e) {
            if (e.target.classList.contains('color-swatch')) {
                window.TOOLBAR_STATE.fgColor = e.target.getAttribute('data-color');
                document.getElementById('fg-color-input').value = window.TOOLBAR_STATE.fgColor;
                updateColorPreview();
            }
        });
    }
    
    var bgPalette = document.getElementById('bg-palette');
    if (bgPalette) {
        bgPalette.addEventListener('click', function(e) {
            if (e.target.classList.contains('color-swatch')) {
                window.TOOLBAR_STATE.bgColor = e.target.getAttribute('data-color');
                document.getElementById('bg-color-input').value = window.TOOLBAR_STATE.bgColor;
                updateColorPreview();
            }
        });
    }
    
    var fgInput = document.getElementById('fg-color-input');
    if (fgInput) {
        fgInput.addEventListener('input', function() {
            window.TOOLBAR_STATE.fgColor = this.value;
            updateColorPreview();
        });
    }
    
    var bgInput = document.getElementById('bg-color-input');
    if (bgInput) {
        bgInput.addEventListener('input', function() {
            window.TOOLBAR_STATE.bgColor = this.value;
            updateColorPreview();
        });
    }
});

// ASCII Dialog
window.openAsciiDialog = function() {
    document.getElementById('ascii-modal').classList.add('active');
    
    document.querySelectorAll('.ascii-item').forEach(item => {
        item.onclick = function() {
            const char = this.getAttribute('data-char');
            insertAtCursor(char);
            setStatus('ASCII character inserted!');
        };
    });
};

window.showAsciiCategory = function(category) {
    document.querySelectorAll('.ascii-cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.ascii-category').forEach(cat => cat.classList.remove('active'));
    document.querySelector(`.ascii-category[data-category="${category}"]`).classList.add('active');
};

// Field Dialog
window.openFieldDialog = function() {
    document.getElementById('field-modal').classList.add('active');
    document.getElementById('field-name').focus();
};

window.applyField = function() {
    var name = document.getElementById('field-name').value;
    var width = document.getElementById('field-width').value || '24';
    var value = document.getElementById('field-value').value || 'Enter text';
    var masked = document.getElementById('field-masked').checked;
    
    if (!name) {
        alert('Please enter a field name!');
        return;
    }
    
    // Micron syntax: `<flags|name`defaultValue>
    var flags = masked ? '!' + width : width;
    var fieldCode = '`<' + flags + '|' + name + '`' + value + '>';
    
    var pos = editor.selectionStart;
    var before = editor.value.substring(0, pos);
    var after = editor.value.substring(pos);
    
    editor.value = before + fieldCode + after;
    editor.selectionStart = editor.selectionEnd = pos + fieldCode.length;
    editor.focus();
    
    updateEditorInfo();
    saveState();
    closeModal();
    setStatus('Input field inserted');
    
    // Clear form
    document.getElementById('field-name').value = '';
    document.getElementById('field-width').value = '24';
    document.getElementById('field-value').value = '';
    document.getElementById('field-masked').checked = false;
};

// Radio Dialog
window.openRadioDialog = function() {
    document.getElementById('radio-modal').classList.add('active');
    document.getElementById('radio-group').focus();
};

window.applyRadio = function() {
    var group = document.getElementById('radio-group').value;
    var value = document.getElementById('radio-value').value;
    var label = document.getElementById('radio-label').value;
    var checked = document.getElementById('radio-checked').checked;
    
    if (!group || !value || !label) {
        alert('Please fill in all fields!');
        return;
    }
    
    // Correct Micron syntax for original parser: `<^|groupName|value`>label
    // OR with pre-checked: `<^|groupName|value|*`>label
    var checkedFlag = checked ? '|*' : '';
    var radioCode = '`<^|' + group + '|' + value + checkedFlag + '`>' + label;
    
    var pos = editor.selectionStart;
    var before = editor.value.substring(0, pos);
    var after = editor.value.substring(pos);
    
    editor.value = before + radioCode + after;
    editor.selectionStart = editor.selectionEnd = pos + radioCode.length;
    editor.focus();
    
    updateEditorInfo();
    saveState();
    closeModal();
    setStatus('Radio button inserted');
    
    // Clear form
    document.getElementById('radio-group').value = '';
    document.getElementById('radio-value').value = '';
    document.getElementById('radio-label').value = '';
    document.getElementById('radio-checked').checked = false;
};

window.openCheckboxDialog = function() {
    document.getElementById('checkbox-modal').classList.add('active');
    document.getElementById('checkbox-field').focus();
};

window.applyCheckbox = function() {
    var fieldName = document.getElementById('checkbox-field').value;
    var value = document.getElementById('checkbox-value').value;
    var label = document.getElementById('checkbox-label').value;
    var checked = document.getElementById('checkbox-checked').checked;
    
    if (!fieldName || !value || !label) {
        alert('Please fill in all fields!');
        return;
    }
    
    // Correct Micron syntax for original parser: `<?|field_name|value`>label
    // OR with pre-checked: `<?|field_name|value|*`>label
    var checkedFlag = checked ? '|*' : '';
    var checkboxCode = '`<?|' + fieldName + '|' + value + checkedFlag + '`>' + label;
    
    var pos = editor.selectionStart;
    var before = editor.value.substring(0, pos);
    var after = editor.value.substring(pos);
    
    editor.value = before + checkboxCode + after;
    editor.selectionStart = editor.selectionEnd = pos + checkboxCode.length;
    editor.focus();
    
    updateEditorInfo();
    saveState();
    closeModal();
    setStatus('Checkbox inserted');
    
    // Clear form
    document.getElementById('checkbox-field').value = '';
    document.getElementById('checkbox-value').value = '';
    document.getElementById('checkbox-label').value = '';
    document.getElementById('checkbox-checked').checked = false;
};

function newPage() {
    if (editor.value.trim() && !confirm('Start a new page? Current content will be replaced.')) {
        return;
    }
    
    editor.value = DEFAULT_TEMPLATE;  // Changed this line
    
    // Auto-sync all tabs
    autoConvertToMicron();
    autoPreviewMicron();
    updateEditorInfo();
    saveState();
    
    // Save to localStorage
    localStorage.setItem('micronEditorContent', editor.value);
    
    // Set cursor at the beginning (position 0)
    editor.setSelectionRange(0, 0);
    editor.focus();
    
    setStatus('New page template loaded - Edit and customize it!');
    switchMainTab('edit');
}

// Magic Format - AGGRESSIVE Auto-beautify page
function magicFormat() {
    const text = editor.value.trim();
    
    if (!text) {
        setStatus('Nothing to format! Add some text first.');
        return;
    }
    
    if (!confirm('Are you sure you want to apply automatic formatting?\n\nThis is an EXPERIMENTAL feature that will heavily modify your content with colors, backgrounds, emojis, and decorations. Results may vary!\n\nYou can revert to plain text using the "Strip Codes" button.')) {
        setStatus('Automatic Magic Formatting Applied! - Press "Strip Codes" to revert to plain text or ctrl+z to undo');
        return;
    }
    
    let formatted = text;
    
    // Split into lines
    let lines = formatted.split('\n');
    let result = [];
    let inList = false;
    let sectionCount = 0;
    
    // Fancy dividers using Micron format
    const dividers = [
        '-━',
        '-═',
        '-★',
        '-▬',
        '-●',
        '-◆',
        '-▲',
        '-•',
        '-─'
    ];
    
    // Expanded color palette with more variety
    const titleColors = ['F58a', 'Ff0a', 'Fa0f', 'F0af', 'Ffa0', 'F8f0'];
    const subtitleColors = ['Ff80', 'Ff08', 'F80f', 'Ffa5', 'Ff5a'];
    const importantColors = ['Ff00', 'Fff0', 'Ff0f', 'Ffa0'];
    const textColors = ['F0f0', 'F0af', 'F5af', 'Fa0f', 'F0fa', 'Faaf'];
    const bgColors = ['Bff0', 'B0ff', 'Bf0f', 'B08f', 'Bf80', 'B8f0'];
    
    // Emoji collections
    const headerEmojis = ['🌟', '⭐', '✨', '💫', '🎯', '🔥', '💎', '👑', '🎨'];
    const bulletEmojis = ['◆', '▶', '➤', '★', '•', '►', '⚡'];
    const accentEmojis = ['✦', '❖', '◈', '◉', '⬥'];
    
    // Random color picker
    const randomColor = (array) => array[Math.floor(Math.random() * array.length)];
    const randomEmoji = (array) => array[Math.floor(Math.random() * array.length)];
    const randomDivider = () => dividers[Math.floor(Math.random() * dividers.length)];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Skip empty lines
        if (line === '') {
            result.push('');
            inList = false;
            continue;
        }
        
        // Skip lines that already have heavy Micron formatting
        if (line.startsWith('>') || line.startsWith('#') || line.startsWith('-')) {
            result.push(line);
            continue;
        }
        
        // If already formatted, skip
        if (line.includes('`F') || line.includes('`B') || line.includes('`!')) {
            result.push(line);
            continue;
        }
        
        // Detect ALL CAPS lines - make them fancy headers with background
        if (line === line.toUpperCase() && line.length > 2 && /[A-Z]/.test(line)) {
            if (sectionCount > 0) {
                result.push('');
                result.push(randomDivider());
                result.push('');
            }
            const emoji = randomEmoji(headerEmojis);
            result.push('`c`' + randomColor(titleColors) + '`' + randomColor(bgColors) + emoji + ' ' + line + ' ' + emoji + '`b`f`a');
            result.push('');
            sectionCount++;
            continue;
        }
        
        // Detect titles (short lines, capitalized, under 60 chars)
        if (line.length < 60 && line.length > 3) {
            const words = line.split(' ');
            const capitalizedWords = words.filter(w => w.length > 0 && w[0] === w[0].toUpperCase()).length;
            const ratio = capitalizedWords / words.length;
            
            if (ratio > 0.6) {
                if (i < 5) {
                    // Main title - centered, colored, with emoji
                    const emoji = randomEmoji(headerEmojis);
                    result.push('');
                    result.push('`c`' + randomColor(titleColors) + '`!' + emoji + ' ' + line + ' ' + emoji + '`!`f`a');
                    result.push('');
                    result.push(randomDivider());
                    result.push('');
                } else {
                    // Section header - colored with background
                    const accent = randomEmoji(accentEmojis);
                    result.push('');
                    result.push('`' + randomColor(subtitleColors) + '`' + randomColor(bgColors) + accent + ' ' + line + '`b`f');
                    result.push('');
                }
                sectionCount++;
                continue;
            }
        }
        
        // Detect lists (lines starting with -, •, *, number.)
        if (/^[-•*]/.test(line) || /^\d+\./.test(line)) {
            if (!inList && result.length > 0 && result[result.length - 1] !== '') {
                result.push('');
            }
            // Color list items with random bullets
            const marker = line.match(/^[-•*\d+\.]+/)[0];
            const content = line.substring(marker.length).trim();
            const bullet = randomEmoji(bulletEmojis);
            result.push('  `' + randomColor(textColors) + bullet + '`f ' + content);
            inList = true;
            continue;
        }
        
        // Detect questions (end with ?)
        if (line.endsWith('?')) {
            const questionEmojis = ['❓', '🤔', '💭', '🧐'];
            result.push('`' + randomColor(importantColors) + '`!' + randomEmoji(questionEmojis) + ' ' + line + '`!`f');
            continue;
        }
        
        // Detect exclamations (end with !)
        if (line.endsWith('!')) {
            const exclamEmojis = ['✨', '⚡', '💥', '🎉', '✅'];
            result.push('`' + randomColor(textColors) + '`!' + randomEmoji(exclamEmojis) + ' ' + line + '`!`f');
            continue;
        }
        
        // Detect important lines (contains keywords)
        const importantWords = {
            'important': ['⚠️', '❗', '‼️'],
            'note': ['📝', '📌', '✏️'],
            'warning': ['⚠️', '🚨', '⛔'],
            'attention': ['👁️', '👀', '🔔'],
            'caution': ['⚠️', '🚧', '⚡'],
            'tip': ['💡', '💭', '🌟'],
            'info': ['ℹ️', '📢', '📣'],
            'error': ['❌', '⛔', '🚫'],
            'success': ['✅', '✔️', '🎉', '🏆']
        };
        
        const lowerLine = line.toLowerCase();
        let foundKeyword = false;
        
        for (let [keyword, emojis] of Object.entries(importantWords)) {
            if (lowerLine.includes(keyword)) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                result.push('`' + randomColor(importantColors) + '`' + randomColor(bgColors) + emoji + ' ' + line + '`b`f');
                foundKeyword = true;
                break;
            }
        }
        
        if (foundKeyword) {
            continue;
        }
        
        // Regular paragraphs - alternate styling with variety
        if (line.length > 80) {
            // Long paragraphs - make first sentence bold and colored
            const sentenceEnd = line.search(/[.!?]\s/);
            if (sentenceEnd > 0 && sentenceEnd < line.length - 2) {
                const firstSentence = line.substring(0, sentenceEnd + 1);
                const rest = line.substring(sentenceEnd + 1).trim();
                result.push('`' + randomColor(subtitleColors) + '`!' + firstSentence + '`!`f ' + rest);
            } else {
                result.push(line);
            }
        } else if (line.length > 40) {
            // Medium paragraphs - add random color
            result.push('`' + randomColor(textColors) + line + '`f');
        } else {
            // Short lines - random style
            const styles = [
                '`c`_' + line + '`_`a',
                '`c`' + randomColor(textColors) + line + '`f`a',
                '`' + randomColor(textColors) + '`!' + line + '`!`f'
            ];
            result.push(styles[Math.floor(Math.random() * styles.length)]);
        }
        
        inList = false;
    }
    
    // Join everything
    let finalText = result.join('\n');
    
    // Add fancy header if not present
    if (!finalText.startsWith('>') && !finalText.startsWith('`')) {
        const headerEmoji = randomEmoji(headerEmojis);
        const titleColor = randomColor(titleColors);
        const bgColor = randomColor(bgColors);
        finalText = randomDivider() + '\n' +
                    '`c`' + titleColor + '`' + bgColor + headerEmoji + ' FORMATTED PAGE ' + headerEmoji + '`b`f`a\n' +
                    randomDivider() + '\n\n' +
                    finalText;
    }
    
    // Add fancy footer
    const footerEmoji = randomEmoji(['✨', '🌟', '⭐', '💫']);
    finalText += '\n\n' +
                 randomDivider() + '\n' +
                 '`c`' + randomColor(titleColors) + '`_' + footerEmoji + ' End of Page ' + footerEmoji + '`_`f`a\n' +
                 randomDivider();
    
    editor.value = finalText;
    updateEditorInfo();
    saveState();
    autoConvertToMicron();
    autoPreviewMicron();
    
    setStatus('✨ EXPERIMENTAL Magic formatting applied! Results may vary - check preview!');
    switchMainTab('preview');
}

// Floating toolbar center align
window.floatingAlignText = function() {
    var ed = document.getElementById('editor');
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    var text = ed.value.substring(start, end);
    
    if (!text) {
        setStatus('Please select text first');
        return;
    }
    
    var formatted = '`c' + text + '\n`a';
    ed.value = ed.value.substring(0, start) + formatted + ed.value.substring(end);
    
    // Set cursor position BEFORE focus
    var newPos = start + formatted.length;
    ed.setSelectionRange(newPos, newPos);
    ed.focus();
    
    updateEditorInfo();
    saveState();
    setStatus('Text centered');
    
    setTimeout(showFloatingToolbar, 100);
};

// Floating toolbar magic format (selected text only)
window.floatingMagicFormat = function() {
    var ed = document.getElementById('editor');
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    var selectedText = ed.value.substring(start, end);
    
    if (!selectedText.trim()) {
        setStatus('Please select text first');
        return;
    }
    
    // Random colors
    const colors = ['F58a', 'Ff0a', 'Fa0f', 'F0af', 'Ffa0', 'F8f0', 'Ff80', 'Ff08', 'F0f0', 'F0fa'];
    const bgColors = ['Bff0', 'B0ff', 'Bf0f', 'B08f', 'Bf80', 'B8f0'];
    const emojis = ['✨', '⭐', '🌟', '💫', '🎯', '🔥', '💎', '⚡'];
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    // Random formatting styles
    const styles = [
        '`' + randomColor + '`!' + selectedText + '`!`f',
        '`' + randomColor + '`' + randomBg + selectedText + '`b`f',
        '`' + randomColor + '`_' + selectedText + '`_`f',
        '`c`' + randomColor + '`!' + randomEmoji + ' ' + selectedText + ' ' + randomEmoji + '`!`f`a',
        '`' + randomColor + '`' + randomBg + '`!' + selectedText + '`!`b`f'
    ];
    
    const formatted = styles[Math.floor(Math.random() * styles.length)];
    
    ed.value = ed.value.substring(0, start) + formatted + ed.value.substring(end);
    
    // Set cursor position BEFORE focus
    var newPos = start + formatted.length;
    ed.setSelectionRange(newPos, newPos);
    ed.focus();
    
    updateEditorInfo();
    saveState();
    autoConvertToMicron();
    setStatus('✨ Magic formatting applied to selection!');
    
    setTimeout(showFloatingToolbar, 100);
};

// Fix double-click word selection - exclude trailing space
editor.addEventListener('dblclick', function(e) {
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var selectedText = editor.value.substring(start, end);
    
    // If selection ends with a space, remove it
    if (selectedText.endsWith(' ')) {
        editor.selectionEnd = end - 1;
    }
    
    // If selection starts with a space, remove it
    if (selectedText.startsWith(' ')) {
        editor.selectionStart = start + 1;
    }
});

// Update all tabs on undo/redo
editor.addEventListener('input', () => {
    // Store cursor position BEFORE any updates
    const cursorPos = editor.selectionStart;
    
    updateEditorInfo();
    saveState();
    
    // Save to localStorage
    localStorage.setItem('micronEditorContent', editor.value);
    
    // Auto-convert after 1 second of no typing
    clearTimeout(autoConvertTimer);
    autoConvertTimer = setTimeout(() => {
        // Store cursor again before auto-convert
        const savedPos = editor.selectionStart;
        
        autoConvertToMicron();
        autoPreviewMicron();
        
        // Restore cursor position after auto-convert
        setTimeout(() => {
            if (document.activeElement === editor) {
                editor.setSelectionRange(savedPos, savedPos);
            }
        }, 10);
    }, AUTO_CONVERT_DELAY);
});

// Listen for undo/redo keyboard shortcuts to immediately update tabs
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // Delay slightly to let undo/redo complete first
        setTimeout(() => {
            autoConvertToMicron();
            autoPreviewMicron();
        }, 50);
    }
    
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
            case 's':
                e.preventDefault();
                convertToMicron();
                break;
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
        }
    }
    
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Remember cursor position when switching tabs
let savedCursorPosition = 0;

// Save cursor position before switching tabs
editor.addEventListener('blur', function() {
    savedCursorPosition = editor.selectionStart;
});

// Restore cursor position when returning to editor tab
editor.addEventListener('focus', function() {
    if (savedCursorPosition > 0) {
        editor.setSelectionRange(savedCursorPosition, savedCursorPosition);
    }
});

// Also restore position when switching to edit tab
function switchMainTab(tab) {
    document.querySelectorAll('.main-panel').forEach(p => p.classList.remove('active'));
    
    // Remove active class from all tab buttons only
    document.querySelectorAll('.action-bar .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tab === 'edit') {
        document.getElementById('edit-tab').classList.add('active');
        document.querySelector('.action-bar .tab-btn[onclick*="edit"]').classList.add('active');
        setStatus('Micron Editor - Edit your page content');
        
        // Restore cursor position when switching back to edit tab
        setTimeout(function() {
            editor.focus();
            if (savedCursorPosition > 0) {
                editor.setSelectionRange(savedCursorPosition, savedCursorPosition);
            }
        }, 50);
        
    } else if (tab === 'code') {
        // Auto-update before switching to code tab
        autoConvertToMicron();
        document.getElementById('code-tab').classList.add('active');
        document.querySelector('.action-bar .tab-btn[onclick*="code"]').classList.add('active');
        setStatus('Code Viewer - View the raw Micron markup (read-only)');
    } else if (tab === 'preview') {
        // Auto-update and preview before switching
        autoConvertToMicron();
        autoPreviewMicron();
        document.getElementById('preview-tab').classList.add('active');
        document.querySelector('.action-bar .tab-btn[onclick*="preview"]').classList.add('active');
        setStatus('Page Preview - See how your page will look when rendered');
    }
}

// External Preview Window
function openExternalPreview() {
    // Auto-update before opening preview
    autoConvertToMicron();
    autoPreviewMicron();
    
    // Get the preview content
    const previewHTML = document.getElementById('preview-content').innerHTML;
    
    // Open new window
    const previewWindow = window.open('', 'MicronPreview', 'width=1240,height=800,menubar=no,toolbar=no,location=no,status=no');
    
    if (previewWindow) {
        // Write the HTML structure
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Micron Preview</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        background: #000;
                        color: #e6edf3;
                        font-family: 'Courier New', monospace;
                        padding: 20px;
                        overflow-y: auto;
                    }
                    .preview-content {
                        padding: 20px;
                        font-family: 'Courier New', monospace;
                        font-size: 15px;
                        line-height: 1.6;
                        color: #e6edf3;
                        width: 1210px;
                        word-wrap: break-word;
                        white-space: pre-wrap;
                        overflow-wrap: break-word;
                        margin: 0 auto;
                    }
                    .preview-content div {
                        margin: 0;
                        line-height: 1.6;
                    }
                    .preview-content br {
                        line-height: 1.6;
                    }
                    /* Center alignment support */
                    .preview-content div[style*="text-align: center"],
                    .preview-content div[style*="text-align:center"] {
                        text-align: center !important;
                    }
                    /* Left alignment support */
                    .preview-content div[style*="text-align: left"],
                    .preview-content div[style*="text-align:left"] {
                        text-align: left !important;
                    }
                    /* Right alignment support */
                    .preview-content div[style*="text-align: right"],
                    .preview-content div[style*="text-align:right"] {
                        text-align: right !important;
                    }
                    a {
                        color: #58a6ff;
                        text-decoration: underline;
                    }
                    a:hover {
                        color: #79c0ff;
                    }
                    hr {
                        border: none;
                        border-top: 1px solid #30363d;
                        margin: 8px 0;
                    }
                </style>
            </head>
            <body>
                <div class="preview-content">
                    ${previewHTML}
                </div>
            </body>
            </html>
        `);
        previewWindow.document.close();
        setStatus('External preview window opened');
    } else {
        alert('Could not open preview window. Please allow popups for this site.');
    }
}

// Floating toolbar divider insertion
window.floatingInsertDivider = function() {
    var ed = document.getElementById('editor');
    var pos = ed.selectionStart;
    var before = ed.value.substring(0, pos);
    var after = ed.value.substring(pos);
    
    var insert = '----------';
    if (pos > 0 && before.charAt(before.length - 1) !== '\n') {
        insert = '\n' + insert;
    }
    if (after && after.charAt(0) !== '\n') {
        insert += '\n';
    }
    
    ed.value = before + insert + after;
    
    // Set cursor position BEFORE focus
    var newPos = pos + insert.length;
    ed.setSelectionRange(newPos, newPos);
    ed.focus();
    
    if (typeof window.updateEditorInfo === 'function') {
        window.updateEditorInfo();
    }
    
    if (typeof window.saveState === 'function') {
        window.saveState();
    }
    
    setStatus('Divider inserted');
    
    // Hide floating toolbar after insertion
    document.getElementById('floating-toolbar').classList.remove('show');
};

// Floating toolbar - close alignment tag
window.floatingCloseAlignment = function() {
    var ed = document.getElementById('editor');
    var start = ed.selectionStart;
    var end = ed.selectionEnd;
    
    // Check if text is selected
    if (start !== end) {
        // Text is selected - add `a after selection
        var before = ed.value.substring(0, end);
        var after = ed.value.substring(end);
        
        ed.value = before + '`a' + after;
        
        // Position cursor after the inserted `a
        var newPos = end + 2;
        ed.setSelectionRange(newPos, newPos);
    } else {
        // No selection - insert `a at cursor
        var before = ed.value.substring(0, start);
        var after = ed.value.substring(start);
        
        ed.value = before + '`a' + after;
        
        // Position cursor after the inserted `a
        var newPos = start + 2;
        ed.setSelectionRange(newPos, newPos);
    }
    
    ed.focus();
    
    if (typeof window.updateEditorInfo === 'function') {
        window.updateEditorInfo();
    }
    
    if (typeof window.saveState === 'function') {
        window.saveState();
    }
    
    setStatus('Alignment closed');
    
    setTimeout(showFloatingToolbar, 100);
};

const DEFAULT_TEMPLATE = `\`c\n> \`Ff00\`Bff0Welcome to Micron Page Composer!\`b\`f 🎨\n\nThis WYSIWYG editor helps you create beautiful .mu pages for NomadNet using the Micron markup language.\n\n----------\n\`a\n\n>Getting Started\n\nUse the toolbar above to format your text. Select text to see the floating toolbar for quick editing, or click buttons to insert code directly at the cursor.\n\n>>Text Formatting Examples\n\nMake text \`!bold\`!, \`*italic\`*, or \`_underlined\`_. You can also combine formats like \`!\`*bold italic\`*\`!.\n\n>>Colors & Backgrounds\n\nAdd colors with \`Ff00red text\`f or \`F000\`B0f0green background\`b\`f. Combine both: \`Fff0\`B00fcolored text\`b\`f.\n\n>>Alignment\n\n\`cCenter your text\`a, \`lleft align\`a, or \`rright align\`a using alignment codes. Use the \`a button to close alignment tags.\n\n>>Headers & Structure\n\n>Main Header\n>>Subheader\n>>>Sub-subheader\n\nUse headers to organize your content into sections.\n\n>>Links & Navigation\n\nCreate links: \`[This is a link!\`:/page/example.mu]\` to connect pages together.\n\n>>Dividers & Decorations\n\n----------\n-★\n-═\n\nAdd horizontal lines with different styles to separate content. Use ASCII art for visual appeal:\n\n    ╔════════════════╗\n    ║   Welcome! ✨  ║\n    ╚════════════════╝\n\n>>Emojis & Special Characters\n\nAdd personality with emojis 😊 ⭐ 🔥 💎 or use the ASCII picker for symbols: ★ ◆ ► ✓\n\n>>Magic Auto-Format ✨\n\nTry the experimental Magic button to automatically beautify your page with colors and decorations!\n\n>>Tips\n\n- Keep lines under 130 characters for MeshChat compatibility\n- Select any text to bring up the floating toolbar for quick formatting\n- Click tabs above to preview your page or view the raw code\n- Use "Strip Codes" to remove all formatting and start fresh\n- Download your page as a .mu file when ready!\n\nDelete this template and start creating your own content!`;

window.openCheckboxDialog = function() {
    document.getElementById('checkbox-modal').classList.add('active');
    document.getElementById('checkbox-field').focus();
};

window.applyCheckbox = function() {
    var fieldName = document.getElementById('checkbox-field').value;
    var value = document.getElementById('checkbox-value').value;
    var label = document.getElementById('checkbox-label').value;
    var checked = document.getElementById('checkbox-checked').checked;
    
    if (!fieldName || !value || !label) {
        alert('Please fill in all fields!');
        return;
    }
    
    // Correct Micron syntax: `<?|field_name|value`>label
    // OR with pre-checked: `<?|field_name|value|*`>label
    var checkedFlag = checked ? '|*' : '';
    var checkboxCode = '`<?|' + fieldName + '|' + value + checkedFlag + '`>' + label;
    
    var pos = editor.selectionStart;
    var before = editor.value.substring(0, pos);
    var after = editor.value.substring(pos);
    
    editor.value = before + checkboxCode + after;
    editor.selectionStart = editor.selectionEnd = pos + checkboxCode.length;
    editor.focus();
    
    updateEditorInfo();
    saveState();
    closeModal();
    setStatus('Checkbox inserted');
    
    // Clear form
    document.getElementById('checkbox-field').value = '';
    document.getElementById('checkbox-value').value = '';
    document.getElementById('checkbox-label').value = '';
    document.getElementById('checkbox-checked').checked = false;
};

// Open divider picker modal
function openDividerDialog() {
    document.getElementById('divider-modal').classList.add('active');
    
    // Attach click handlers to divider items
    document.querySelectorAll('.divider-item').forEach(item => {
        item.onclick = function() {
            const code = this.getAttribute('data-code');
            insertDividerCode(code);
        };
    });
}

// Insert divider code at cursor
function insertDividerCode(code) {
    const pos = editor.selectionStart;
    const before = editor.value.substring(0, pos);
    const after = editor.value.substring(pos);
    
    let insert = code;
    if (pos > 0 && before.charAt(before.length - 1) !== '\n') {
        insert = '\n' + insert;
    }
    if (after && after.charAt(0) !== '\n') {
        insert += '\n';
    }
    
    editor.value = before + insert + after;
    editor.selectionStart = editor.selectionEnd = pos + insert.length;
    editor.focus();
    updateEditorInfo();
    saveState();
    closeModal();
    setStatus('Divider inserted');
}