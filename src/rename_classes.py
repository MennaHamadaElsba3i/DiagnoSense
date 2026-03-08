import os
import re

jsx_path = r'f:\React\DiagnoSense\src\components\integration.jsx'
css_path = r'f:\React\DiagnoSense\src\components\integration.css'

with open(jsx_path, 'r', encoding='utf-8') as f:
    jsx_content = f.read()

with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

classes_to_prefix = [
    'hero', 'container', 'badge', 'highlight', 'subheadline', 'microcopy',
    'hero-actions', 'btn-primary', 'btn-secondary', 'hero-note',
    'section-header', 'flow-container', 'flow-box', 'flow-icon', 'flow-arrow',
    'data-grid', 'data-card', 'data-card-icon', 'security-grid', 'security-card',
    'security-card-header', 'security-icon', 'trust-banner', 'auth-section',
    'status-dashboard', 'status-header', 'status-badge', 'status-dot', 'visible', 'connected', 'disconnected',
    'status-grid', 'status-item', 'status-item-label', 'status-item-value',
    'settings-panel', 'setting-row', 'setting-info', 'toggle', 'toggle-slider',
    'select-wrapper', 'monitoring-grid', 'monitor-card', 'monitor-stat',
    'monitor-stat-label', 'monitor-stat-value', 'log-table', 'log-timestamp', 'log-status',
    'success', 'warning', 'error', 'small'
]

# Prefix classes in JSX
for cls in classes_to_prefix:
    # Match class="cls" or className="cls" (and multiple classes)
    # This regex is a bit simplistic, but we can just use word boundaries for the className string replacement.
    # Instead of full regex, we can replace instances within quotes.
    # But since it's just React className="", a regex on className="[^"]+" is better.
    def replace_class(match):
        classes = match.group(1).split()
        new_classes = ['intg-' + c if c in classes_to_prefix else c for c in classes]
        return 'className="' + ' '.join(new_classes) + '"'
    
    jsx_content = re.sub(r'className="([^"]+)"', replace_class, jsx_content)

# Prefix classes in CSS
for cls in classes_to_prefix:
    # match .cls taking care of word boundaries but allowing hyphens
    css_content = re.sub(r'\.' + cls + r'(?![a-zA-Z0-9_-])', '.intg-' + cls, css_content)

# Additionally, add aggressive resets to .integration-page in CSS
reset_css = """
.integration-page {
  /* Resets to prevent inherited layout breakage */
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  position: relative !important;
  text-align: left !important;
}

.integration-page *,
.integration-page *::before,
.integration-page *::after {
  box-sizing: border-box !important;
  margin: 0;
  padding: 0;
}

.integration-page section {
  padding: 4rem 0 !important;
  width: 100% !important;
  display: block !important;
  margin: 0 !important;
  max-width: none !important;
}

.integration-page h1,
.integration-page h2,
.integration-page h3,
.integration-page h4,
.integration-page p {
  margin: 0;
  padding: 0;
  line-height: inherit;
}
"""

css_content = css_content.replace('.integration-page {', reset_css + '\n.integration-page {')

with open(jsx_path, 'w', encoding='utf-8') as f:
    f.write(jsx_content)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("Replacement complete.")
