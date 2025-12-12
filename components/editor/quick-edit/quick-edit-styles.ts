export const quickEditStyles = `
  /* Diff decoration styles */
  .diff-removed-line {
    background: rgba(248, 81, 73, 0.15) !important;
    border-left: 3px solid #f85149 !important;
  }

  .diff-removed-line-content {
    text-decoration: line-through;
    opacity: 0.7;
  }

  .diff-added-line {
    background: rgba(63, 185, 80, 0.15) !important;
    border-left: 3px solid #3fb950 !important;
  }

  .diff-unchanged-line {
    opacity: 0.6;
  }

  /* Glyph margin indicators */
  .diff-removed-glyph {
    background: #f85149 !important;
    width: 4px !important;
    margin-left: 3px;
    border-radius: 2px;
  }

  .diff-added-glyph {
    background: #3fb950 !important;
    width: 4px !important;
    margin-left: 3px;
    border-radius: 2px;
  }

  /* Quick edit popup container */
  .quick-edit-popup {
    position: relative;
    background: #1e1e1e;
    border: 1px solid #3a3a3a;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    min-width: 420px;
    max-width: 520px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 1000;
  }

  /* Header with tabs */
  .quick-edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid #2a2a2a;
    background: #252525;
  }

  .quick-edit-tabs {
    display: flex;
    gap: 4px;
  }

  .quick-edit-tab {
    padding: 6px 12px;
    font-size: 13px;
    color: #808080;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-edit-tab:hover {
    color: #b0b0b0;
    background: #333;
  }

  .quick-edit-tab.active {
    color: #e0e0e0;
    background: #3a3a3a;
  }

  .quick-edit-close {
    padding: 4px 8px;
    color: #808080;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }

  .quick-edit-close:hover {
    color: #e0e0e0;
    background: #333;
  }

  /* Model label */
  .quick-edit-model {
    padding: 6px 12px;
    font-size: 11px;
    color: #666;
    border-bottom: 1px solid #2a2a2a;
  }

  /* Content area */
  .quick-edit-content {
    padding: 12px;
  }

  /* Input area */
  .quick-edit-input-wrapper {
    position: relative;
  }

  .quick-edit-input {
    width: 100%;
    min-height: 60px;
    max-height: 120px;
    padding: 10px 12px;
    font-size: 13px;
    color: #e0e0e0;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    resize: none;
    outline: none;
    font-family: inherit;
  }

  .quick-edit-input:focus {
    border-color: #5B9EFF;
    box-shadow: 0 0 0 2px rgba(91, 158, 255, 0.2);
  }

  .quick-edit-input::placeholder {
    color: #666;
  }

  /* Actions */
  .quick-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }

  .quick-edit-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .quick-edit-btn-secondary {
    color: #b0b0b0;
    background: #333;
  }

  .quick-edit-btn-secondary:hover {
    background: #404040;
  }

  .quick-edit-btn-primary {
    color: #fff;
    background: #5B9EFF;
  }

  .quick-edit-btn-primary:hover {
    background: #4A8FEE;
  }

  .quick-edit-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .quick-edit-btn-accept {
    color: #fff;
    background: #3fb950;
  }

  .quick-edit-btn-accept:hover {
    background: #2ea043;
  }

  .quick-edit-btn-reject {
    color: #f85149;
    background: transparent;
    border: 1px solid #f85149;
  }

  .quick-edit-btn-reject:hover {
    background: rgba(248, 81, 73, 0.1);
  }

  /* Loading state */
  .quick-edit-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    color: #808080;
    font-size: 13px;
  }

  .quick-edit-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #3a3a3a;
    border-top-color: #5B9EFF;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Q&A View */
  .quick-edit-qa {
    max-height: 240px;
    overflow-y: auto;
  }

  .quick-edit-qa-message {
    padding: 8px 0;
  }

  .quick-edit-qa-message:not(:last-child) {
    border-bottom: 1px solid #2a2a2a;
  }

  .quick-edit-qa-role {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .quick-edit-qa-content {
    font-size: 13px;
    color: #e0e0e0;
    line-height: 1.5;
  }

  /* Markdown styles for Q&A content */
  .quick-edit-qa-content p {
    margin: 0 0 8px 0;
  }

  .quick-edit-qa-content p:last-child {
    margin-bottom: 0;
  }

  .quick-edit-qa-content code {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 12px;
    background: #2a2a2a;
    padding: 2px 5px;
    border-radius: 3px;
    color: #ff9f43;
  }

  .quick-edit-qa-content pre {
    margin: 8px 0;
    padding: 10px;
    background: #1a1a1a;
    border-radius: 6px;
    overflow-x: auto;
  }

  .quick-edit-qa-content pre code {
    background: transparent;
    padding: 0;
    color: #e0e0e0;
  }

  .quick-edit-qa-content ul,
  .quick-edit-qa-content ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  .quick-edit-qa-content li {
    margin: 4px 0;
  }

  .quick-edit-qa-content strong {
    color: #fff;
    font-weight: 600;
  }

  .quick-edit-qa-content em {
    color: #b0b0b0;
    font-style: italic;
  }

  .quick-edit-qa-content a {
    color: #5B9EFF;
    text-decoration: none;
  }

  .quick-edit-qa-content a:hover {
    text-decoration: underline;
  }

  .quick-edit-qa-user .quick-edit-qa-role {
    color: #5B9EFF;
  }

  .quick-edit-qa-assistant .quick-edit-qa-role {
    color: #3fb950;
  }

  /* Diff actions bar */
  .quick-edit-diff-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #252525;
    border-top: 1px solid #2a2a2a;
  }

  .quick-edit-diff-info {
    font-size: 12px;
    color: #808080;
  }
`
