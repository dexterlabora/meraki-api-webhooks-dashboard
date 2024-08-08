/**
 * Webhook Templates Management Module
 * 
 * This module handles the functionality for managing webhook payload templates
 * in the Meraki Dashboard application. It provides features for displaying,
 * adding, and managing webhook templates at the organization level.
 * 
 * Key features:
 * - Initializes event listeners for UI interactions
 * - Loads and displays existing webhook payload templates
 * - Handles adding new webhook templates
 * - Provides interface for editing and deleting existing templates
 * 
 * Main functions:
 * - initWebhookTemplatesListeners: Sets up event listeners and initializes the module
 * - loadWebhookTemplates: Fetches and displays organization-level webhook templates
 * 
 * This module interacts with the API handler (imported from './apiHandlers.js')
 * to perform API-related operations. It also manipulates the DOM to update
 * the user interface based on the current state of webhook templates.
 * 
 * Note: Ensure that the API handler is properly configured and the DOM elements
 * referenced in this module exist in the corresponding HTML file.
 * 
 * TODO: Implement edit and delete functionality for existing templates
 */

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
        .then(res => {
            let templatesData = res.data;
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