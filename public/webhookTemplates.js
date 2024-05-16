import API from './apiHandlers.js';

function initWebhookTemplatesListeners() {
    const document = window.document;
    const api = new API(localStorage.getItem('MerakiApiKey'));

    loadWebhookTemplates(api);

    const addTemplateBtn = document.getElementById('addTemplate');
    if (addTemplateBtn) {
        addTemplateBtn.addEventListener('click', function () {
            console.log('Add new webhook template');
            const newTemplateData = {
                name: 'New Template',
                template: 'Custom Template Body',
                type: 'JSON'
            };
            api.createOrganizationWebhooksPayloadTemplate(localStorage.getItem('MerakiOrganizationId'), newTemplateData)
                .then(() => loadWebhookTemplates(api)); // Reload list after adding
        });
    }
}

function loadWebhookTemplates(api) {
    console.log("loadWebhookTemplates");
    const organizationId = localStorage.getItem('MerakiOrganizationId');
    api.getOrganizationWebhooksPayloadTemplates(organizationId)
        .then(templatesData => {
            const table = document.getElementById('webhookTemplatesTable');
            if (table) {
                const tbody = table.querySelector('tbody');
                tbody.innerHTML = ''; // Clear existing rows
                templatesData.forEach(template => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${template.name}</td>
                        <td>${template.type}</td>
                        <td><button>Edit</button> <button>Delete</button></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Failed to load templates:', error));
}

export function init() {
  //  document.addEventListener('DOMContentLoaded', function() {
        const api = new API(localStorage.getItem('MerakiApiKey'));
        initWebhookTemplatesListeners(api);
  //  });
}