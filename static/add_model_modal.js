function setModalTheme() {
  const modalContent = document.getElementById('modal-content-theme');
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) {
    modalContent.classList.add('bg-dark', 'text-light');
    document.getElementById('api-host').classList.add('bg-dark', 'text-light', 'border-secondary');
    document.getElementById('api-url').classList.add('bg-dark', 'text-light', 'border-secondary');
    document.getElementById('api-key').classList.add('bg-dark', 'text-light', 'border-secondary');
    document.getElementById('modal-close-btn').classList.add('btn-close-white');
  } else {
    modalContent.classList.remove('bg-dark', 'text-light');
    document.getElementById('api-host').classList.remove('bg-dark', 'text-light', 'border-secondary');
    document.getElementById('api-url').classList.remove('bg-dark', 'text-light', 'border-secondary');
    document.getElementById('api-key').classList.remove('bg-dark', 'text-light', 'border-secondary');
    document.getElementById('modal-close-btn').classList.remove('btn-close-white');
  }
}

function setSpinnerTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  const lightSpinner = document.querySelector('#fetch-spinner .spinner-border.text-light');
  const darkSpinner = document.querySelector('#fetch-spinner .spinner-border.text-dark');
  if (lightSpinner && darkSpinner) {
    lightSpinner.style.display = isDark ? '' : 'none';
    darkSpinner.style.display = isDark ? 'none' : '';
  }
}

document.getElementById('api-host').addEventListener('change', function() {
  var keyGroup = document.getElementById('api-key-group');
  if (this.value === 'openai') {
    keyGroup.style.display = '';
  } else {
    keyGroup.style.display = 'none';
  }
});

function renderModelsTable(models) {
  const isDark = document.body.classList.contains('dark-mode');
  const tableClass = isDark ? 'table-dark' : 'table-light';
  let html = `<table class="table ${tableClass} table-bordered align-middle mt-3" id="models-table"><tbody>`;
  models.forEach(model => {
    let icons = '';
    if (model.vision) icons += '<i class="bi bi-image text-info ms-2" title="Vision"></i>';
    if (model.reasoning) icons += '<i class="bi bi-lightbulb-fill text-warning ms-2" title="Reasoning"></i>';
    if (model.tools) icons += '<i class="bi bi-tools text-success ms-2" title="Tools"></i>';
    const modelData = encodeURIComponent(JSON.stringify(model));
    html += `<tr data-model='${modelData}'>
      <td class="w-75">${model.nickname} ${icons}</td>
      <td class="text-center" style="width:1%;"><input type="checkbox" checked /></td>
      <td class="text-center" style="width:1%;"><button type="button" class="btn btn-primary btn-sm model-gear-btn" onclick="handleModelGearClick(this)"><i class="bi bi-gear-fill"></i></button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function updateModelsTableTheme() {
  const table = document.getElementById('models-table');
  if (table) {
    const isDark = document.body.classList.contains('dark-mode');
    table.classList.toggle('table-dark', isDark);
    table.classList.toggle('table-light', !isDark);
  }
}

const modelsTableContainer = document.getElementById('models-table-container');

document.getElementById('fetch-model-btn').addEventListener('click', function() {
  const host = document.getElementById('api-host').value;
  const url = document.getElementById('api-url').value;
  const key = document.getElementById('api-key').value;
  // Place spinner next to fetch button
  let fetchBtn = document.getElementById('fetch-model-btn');
  let spinnerWrapper = document.getElementById('fetch-spinner-wrapper');
  if (!spinnerWrapper) {
    spinnerWrapper = document.createElement('span');
    spinnerWrapper.id = 'fetch-spinner-wrapper';
    spinnerWrapper.innerHTML = `
      <span class="ms-2" id="fetch-spinner">
        <span class="spinner-border text-light spinner-border" role="status"><span class="visually-hidden">Loading...</span></span>
        <span class="spinner-border text-dark spinner-border" role="status"><span class="visually-hidden">Loading...</span></span>
      </span>
    `;
    fetchBtn.parentNode.insertBefore(spinnerWrapper, fetchBtn.nextSibling);
  } else {
    spinnerWrapper.style.display = '';
  }
  setSpinnerTheme();
  modelsTableContainer.innerHTML = '';
  fetch('/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, url, key })
  })
  .then(res => res.json())
  .then(data => {
    console.log('API response:', data);
    spinnerWrapper.style.display = 'none';
    if (data.status === 'success' && Array.isArray(data.models)) {
      modelsTableContainer.innerHTML = renderModelsTable(data.models);
    //   attachGearButtonHandlers();
    } else {
      modelsTableContainer.innerHTML = '<div class="text-danger mt-3">No models found or error.</div>';
    }
  })
  .catch(err => {
    spinnerWrapper.style.display = 'none';
    console.error('API error:', err);
    modelsTableContainer.innerHTML = '<div class="text-danger mt-3">API error.</div>';
  });
});

// Optional: update modal theme if user toggles dark/light mode
const toggleModeBtn = document.getElementById('toggle-mode');
if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', function() {
    setTimeout(() => {
      setModalTheme();
      updateModelsTableTheme();
      setSpinnerTheme();
    }, 200);
  });
}

// Modal logic removed. Use showModelEditModal(modelData, triggerElement) from model_edit_modal.js for editing models.
