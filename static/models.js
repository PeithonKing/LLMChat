function getTableClass() {
	return document.body.classList.contains('dark-mode') ? 'table-dark' : 'table-light';
}

document.getElementById('api-type').addEventListener('change', function () {
	var keyGroup = document.getElementById('api-key-group');
	keyGroup.style.display = this.value === 'openai' ? '' : 'none';
});

document.getElementById('fetch-model-btn').addEventListener('click', fetch_models_button_click_handler);


function fetch_models_button_click_handler() {
	const host = document.getElementById('api-type').value;
	const url = document.getElementById('api-url').value;
	const key = document.getElementById('api-key').value;
	const modelsTableContainer = document.getElementById('models-table-container');
	modelsTableContainer.innerHTML = '<div class="text-center my-3"><span class="spinner-border" role="status"></span> Fetching models...</div>';
	fetch('/fetch', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ host, url, key })
	})
		.then(res => res.json())
		.then(data => {
			if (data.status === 'success' && Array.isArray(data.models)) {
				let tableClass = getTableClass();
				let html = `<table class="table ${tableClass} table-bordered align-middle mt-3"><tbody>`;
				data.models.forEach(model => {
					let icons = '';
					if (model.vision) icons += '<i class="bi bi-image text-info ms-2" title="Vision"></i>';
					if (model.reasoning) icons += '<i class="bi bi-lightbulb-fill text-warning ms-2" title="Reasoning"></i>';
					if (model.tools) icons += '<i class="bi bi-tools text-success ms-2" title="Tools"></i>';
					html += `<tr data-model='${JSON.stringify(model)}'>
		<td class="w-50">${model.nickname}</td>
		<td>${model.model} ${icons}</td>
		<td class="text-center"><input type="checkbox" class="form-check-input" checked/></td>
		<td class="text-center"><button type="button" class="btn btn-primary btn-sm" onclick="openModelSettings(this)"><i class="bi bi-gear-fill"></i></button></td>
	</tr>`;
				});
				html += '</tbody></table>';
				html += '<div class="text-end mt-3"><button type="button" class="btn btn-success" id="save-selected-btn" onclick="saveSelectedModels()"><i class="bi bi-plus"></i> Add Selected</button></div>';
				modelsTableContainer.innerHTML = html;
			} else {
				modelsTableContainer.innerHTML = '';
				showToast('No models found or error.', 'danger');
			}
		})
		.catch(err => {
			modelsTableContainer.innerHTML = '';
			// console.error('API error:', err);
			showToast(err.message, 'danger');
		});
}


function openModelSettings(element) {
	const closestTR = element.closest('tr');
	const modelData = JSON.parse(closestTR.getAttribute('data-model'));
	showModelSettingsModal(modelData).then(updated => {
		if (updated) {
			closestTR.setAttribute('data-model', JSON.stringify(updated));
			closestTR.querySelector('td:nth-child(1)').textContent = updated.nickname;
			closestTR.querySelector('td:nth-child(2)').innerHTML = `${updated.model} ` +
				(updated.vision ? '<i class="bi bi-image text-info ms-2" title="Vision"></i>' : '') +
				(updated.reasoning ? '<i class="bi bi-lightbulb-fill text-warning ms-2" title="Reasoning"></i>' : '') +
				(updated.tools ? '<i class="bi bi-tools text-success ms-2" title="Tools"></i>' : '');
			showToast('Model settings updated (not added to backend though)', 'success');
		}
	});
}

function openSavedModelSettings(element) {
	const closestTR = element.closest('tr');
	const modelData = JSON.parse(closestTR.getAttribute('data-model'));
	const nickname = closestTR.getAttribute('nickname');
	modelData.nickname = nickname;
	showModelSettingsModal(modelData).then(updated => {
		if (updated) {
			fetch('/update_model', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updated)
			})
			.then(res => res.json())
			.then(data => {
				if (data.status === 'success') {
					closestTR.setAttribute('data-model', JSON.stringify(updated));
					closestTR.querySelector('td:nth-child(2)').textContent = updated.nickname;
					closestTR.querySelector('td:nth-child(3)').innerHTML = `${updated.model} ` +
						(updated.vision ? '<i class="bi bi-image text-info ms-2" title="Vision"></i>' : '') +
						(updated.reasoning ? '<i class="bi bi-lightbulb-fill text-warning ms-2" title="Reasoning"></i>' : '') +
						(updated.tools ? '<i class="bi bi-tools text-success ms-2" title="Tools"></i>' : '');
					showToast('Model settings updated and saved!', data.status);
				} else {
					showToast(data.message, data.status);
				}
			})
			.catch(err => {
				showToast(err.message, 'danger');
			});
		}
	});
}

function saveSelectedModels() {
	const checked_checkboxes = document.querySelectorAll('#models-table-container input[type="checkbox"]:checked');
	checked_checkboxes.forEach(element => {
		const closestTR = element.closest('tr');
		const modelData = JSON.parse(closestTR.getAttribute('data-model'));
		fetch('/register_new_model', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(modelData)
		})
			.then(res => res.json())
			.then(data => {
				showToast(data.message, data.status);
				if (data.status === 'success') {
					closestTR.remove(); // Remove the row from the table after saving
				}
			})
			.catch(err => {
				showToast(err.message, 'danger');
			});
		
	});

	// hide the Add Selected button if no tbody rows left
	const tbody = document.querySelector('#models-table-container table tbody');
	if (tbody && tbody.rows.length === 0) {
		document.getElementById('models-table-container').innerHTML = '';
	}

	update_saved_models_table();
}


function update_theme() {
	setTimeout(() => {
		const theme = localStorage.getItem("theme");

		const tables = document.querySelectorAll('table');
		// console.log("Current theme:", theme);
		tables.forEach(table => {
			table.classList.toggle('table-dark', theme === "dark");
			table.classList.toggle('table-light', theme === "light");
		});

		// Form elements dark mode
		const darkInputs = document.querySelectorAll('.form-control, .form-select');
		darkInputs.forEach(input => {
			input.classList.toggle('bg-dark', theme === "dark");
			input.classList.toggle('text-light', theme === "dark");
			input.classList.toggle('border-secondary', theme === "dark");
			input.classList.toggle('bg-light', theme === "light");
			input.classList.toggle('text-dark', theme === "light");
			input.classList.toggle('border-light', theme === "light");
		});
	}, 0);
}


function update_saved_models_table() {
  fetch('/models_settings')
    .then(res => res.json())
    .then(models_settings => {
      const tbody = document.getElementById('existing-models-tbody');
      let html = '';
      for (const [nickname, model] of Object.entries(models_settings)) {
        html += `<tr nickname="${nickname}" data-model='${JSON.stringify(model)}'>
          <td>${model.API}</td>
          <td>${nickname}</td>
          <td>${model.model}
            ${model.vision ? '<i class=\"bi bi-image text-info ms-2\" title=\"Vision\"></i>' : ''}
            ${model.reasoning ? '<i class=\"bi bi-lightbulb-fill text-warning ms-2\" title=\"Reasoning\"></i>' : ''}
            ${model.tools ? '<i class=\"bi bi-tools text-success ms-2\" title=\"Tools\"></i>' : ''}
          </td>
          <td class=\"text-center\">
            <button type=\"button\" class=\"btn btn-primary btn-sm\" onclick=\"openSavedModelSettings(this)\"><i class=\"bi bi-gear-fill\"></i></button>
            <button type=\"button\" class=\"btn btn-danger btn-sm ms-2\" onclick=\"deleteModel('${nickname}')\"><i class=\"bi bi-trash\"></i></button>
          </td>
        </tr>`;
      }
      tbody.innerHTML = html;
    });
}


function deleteModel(nickname) {
	if (!confirm(`Are you sure you want to delete model '${nickname}'?`)) return;
	fetch('/delete_model', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ nickname })
	})
		.then(res => res.json())
		.then(data => {
			showToast(data.message, data.status);
			if (data.status === 'success') {
				update_saved_models_table();
			}
		})
		.catch(err => {
			showToast(err.message, 'danger');
		});
}


document.getElementById('toggle-mode').addEventListener('click', update_theme);

document.addEventListener('DOMContentLoaded', function() {
	update_theme();
	update_saved_models_table();
});


