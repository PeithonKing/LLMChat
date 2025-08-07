document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('toggle-mode');
    const icon = document.getElementById('mode-icon');
    const label = document.getElementById('mode-label');
    function setMode(mode) {
        if (mode === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            icon.className = 'bi bi-brightness-high-fill me-2';
            label.textContent = 'Light Mode';
        } else {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            icon.className = 'bi bi-moon-stars-fill me-2';
            label.textContent = 'Dark Mode';
        }
    }

    btn?.addEventListener('click', function () {
        const isLight = document.body.classList.contains('light-mode');
        setMode(isLight ? 'dark' : 'light');
        localStorage.setItem('theme', isLight ? 'dark' : 'light');
        // let theme = localStorage.getItem('theme');
        // console.log('Current theme:', theme);
    });
    // On load, set theme from localStorage or system preference
    let theme = localStorage.getItem('theme');
    // console.log('Current theme:', theme);
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setMode(theme === 'light' ? 'light' : 'dark');
});


function showToast(message, type = 'info', duration = 5000) {
  const containerId = 'bs-toast-container';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = 1080;
    document.body.appendChild(container);
  }

  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: duration
  });
  bsToast.show();
  container.appendChild(toast);
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

/**
 * Shows a modal for editing model settings.
 * @param {Object} modelData - The model data object.
 * @returns {Promise<Object|null>} Resolves with updated data on save, or null on cancel/close.
 */
function showModelSettingsModal(modelData) {
  // Remove any existing modal
  const existing = document.getElementById('model-settings-modal');
  if (existing) existing.remove();

  // Determine theme
  let theme = localStorage.getItem('theme');
  const isDark = theme === 'dark';
  const modalContentClass = isDark ? 'bg-dark text-light' : 'bg-light text-dark';
  const btnCloseClass = isDark ? 'btn-close-white' : '';

  // Modal HTML (no modal-header or modal-footer classes to remove bars)
  const modal = document.createElement('div');
  modal.id = 'model-settings-modal';
  modal.className = 'modal fade';
  modal.tabIndex = -1;
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content ${modalContentClass}">
        <div style="padding: 1rem 1rem 0 1rem;">
          <h5 class="modal-title mb-3">${modelData.API} model settings</h5>
          <button type="button" class="btn-close ${btnCloseClass}" data-bs-dismiss="modal" aria-label="Close" style="position:absolute;top:1rem;right:1rem;"></button>
        </div>
        <div class="modal-body pt-2">
          <div class="mb-3">
            <label class="form-label">Endpoint</label>
            <input type="text" class="form-control ${isDark ? 'bg-dark text-light border-secondary' : 'bg-light text-dark'}" id="modal-endpoint" value="${modelData.endpoint || ''}" />
          </div>
          <div class="mb-3">
            <label class="form-label">Nickname</label>
            <input type="text" class="form-control ${isDark ? 'bg-dark text-light border-secondary' : 'bg-light text-dark'}" id="modal-nickname" value="${modelData.nickname || ''}" />
          </div>
          <div class="mb-3">
            <label class="form-label">Model</label>
            <input type="text" class="form-control ${isDark ? 'bg-dark text-light border-secondary' : 'bg-light text-dark'}" id="modal-model" value="${modelData.model || ''}" />
          </div>
          <div class="mb-3">
            <label class="form-label">Capabilities</label><br>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="modal-vision" ${modelData.vision ? 'checked' : ''}>
              <label class="form-check-label" for="modal-vision">Vision</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="modal-reasoning" ${modelData.reasoning ? 'checked' : ''}>
              <label class="form-check-label" for="modal-reasoning">Reasoning</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="modal-tools" ${modelData.tools ? 'checked' : ''}>
              <label class="form-check-label" for="modal-tools">Tools</label>
            </div>
          </div>
        </div>
        <div style="padding: 0 1rem 1rem 1rem; text-align: right;">
          <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" id="save-model-settings-btn">Save Changes</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Return a promise that resolves with updated data or null
  return new Promise((resolve) => {
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Save handler
    document.getElementById('save-model-settings-btn').onclick = function () {
      const updated = {
        ...modelData,
        endpoint: document.getElementById('modal-endpoint').value,
        nickname: document.getElementById('modal-nickname').value,
        model: document.getElementById('modal-model').value,
        vision: document.getElementById('modal-vision').checked,
        reasoning: document.getElementById('modal-reasoning').checked,
        tools: document.getElementById('modal-tools').checked
      };
      bsModal.hide();
      resolve(updated);
    };

    // Handle close/cancel
    modal.addEventListener('hidden.bs.modal', () => {
      resolve(null);
      modal.remove();
    });

    // Prevent double resolve if Save is pressed
    modal.addEventListener('hide.bs.modal', () => {
      document.getElementById('save-model-settings-btn').onclick = null;
    });
  });
}