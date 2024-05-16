// apiHandlers.js
class API {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async fetch(url) {
        try {
            const response = await fetch(url, { headers: this.headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    async fetchAllPages(url, maxPages = 2) {
        let allData = [], page = 1, fetchedData;
        do {
            const fullUrl = `${url}&page=${page}`;
            fetchedData = await this.fetch(fullUrl);
            allData = [...allData, ...fetchedData];
            page++;
            if (fetchedData.length < 1000 || page > maxPages) break;
        } while (true);
        return allData;
    }

    createPaginatedFetcher(url, perPage = 1000) {
        return {
            fetchAllPages: (maxPages) => this.fetchAllPages(`${url}&perPage=${perPage}`, maxPages)
        };
    }

    // Endpoint methods
    getOrganizations() {
        return this.fetch('/api/organizations');
    }

    getOrganizationAdmins(organizationId) {
        return this.fetch(`/api/organizations/${organizationId}/admins`);
    }

    getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, timespanSeconds, queryParams = {}) {
        console.log("getOrganizationApiRequestsOverviewResponseCodesByInterval", queryParams )
        let url = `/api/organizations/${organizationId}/apiRequests/overview/responseCodes/byInterval?timespan=${timespanSeconds}`;
        if (queryParams.adminId) {
            url += `&adminIds[]=${queryParams.adminId}`;
        }
        if (queryParams.userAgent) {
            url += `&userAgent=${queryParams.userAgent}`;
        }
        if (queryParams.operationId) {
            url += `&operationIds[]=${queryParams.operationId}`;
        }
        if (queryParams.sourceIp) {
            url += `&sourceIps[]=${queryParams.sourceIp}`;
        }
        console.log("url",url);
        return this.fetch(url); // Ensure this.fetch is properly implemented to handle the request
    }
    

    // getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, timespanSeconds, userAgent) {
    //     let url = `/api/organizations/${organizationId}/apiRequests/overview/responseCodes/byInterval?timespan=${timespanSeconds}&userAgent=${userAgent}`;
    //     if(userAgent){
    //         url += `?userAgent=${userAgent}`
    //     }
    //     return this.fetch(url);
    // }

    // // // just adds the userAgent query param
    // getOrganizationApiRequestsOverviewResponseCodesByIntervalByUserAgent(organizationId, timespanSeconds, userAgent) {
    //     const url = `/api/organizations/${organizationId}/apiRequests/overview/responseCodes/byInterval?timespan=${timespanSeconds}&userAgent=${userAgent}`;
    //     return this.fetch(url);
    // }

    getOrganizationApiRequestsOverview(organizationId, timespanSeconds) {
        const url = `/api/organizations/${organizationId}/apiRequests/overview?timespan=${timespanSeconds}`;
        return this.fetch(url);
    }

    getOrganizationApiRequests(organizationId, timespanSeconds, perPage = 1000) {
        const url = `/api/organizations/${organizationId}/apiRequests?timespan=${timespanSeconds}&perPage=${perPage}`;
        return this.createPaginatedFetcher(url, perPage);
    }

    getOrganizationWebhooksLogs(organizationId, timespanSeconds, perPage = 1000) {
        const url = `/api/organizations/${organizationId}/webhooks/logs?timespan=${timespanSeconds}&perPage=${perPage}`;
        return this.createPaginatedFetcher(url, perPage);
    }


    getAdministeredIdentitiesMe(){
        return this.fetch(`/api/administered/identities/me`);
    }

    // Concept 
    generateAdministeredIdentitiesMeApiKeys(){
        const url =`/api/administered/identities/me/api/keys/generate`
        return this.fetch(url);
    }

    getAdministeredIdentitiesMeApiKeys(){
        const url =`/api/administered/identities/me/api/keys`
        return this.fetch(url);
    }
    
    getAdministeredIdentitiesMeApiKeysRevoke(suffix){
        const url =`/api/administered/identities/me/api/keys/revoke/${suffix}`
        return this.fetch(url);
    }

    // HTTP Servers
    // List the HTTP servers for an organization
    getOrganizationWebhooksHttpServers(organizationId) {
        const url = `/api/organizations/${organizationId}/webhooks/httpServers`;
        return this.fetch(url);
    }

    // Add an HTTP server to an organization
    createOrganizationWebhooksHttpServer(organizationId, data) {
        const url = `/api/organizations/${organizationId}/webhooks/httpServers`;
        return this.fetch(url, {
            method: 'POST',
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    // Return an HTTP server for an organization
    getOrganizationWebhooksHttpServer(organizationId, httpServerId) {
        const url = `/api/organizations/${organizationId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url);
    }

    // Update an HTTP server for an organization
    updateOrganizationWebhooksHttpServer(organizationId, httpServerId, data) {
        const url = `/api/organizations/${organizationId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url, {
            method: 'PUT',
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    // Delete an HTTP server from an organization
    deleteOrganizationWebhooksHttpServer(organizationId, httpServerId) {
        const url = `/api/organizations/${organizationId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url, {
            method: 'DELETE',
            headers: this.headers
        });
    }

    // Webhook Payload Templates

    // List the webhook payload templates for an organization
    getOrganizationWebhooksPayloadTemplates(organizationId) {
        const url = `/api/organizations/${organizationId}/webhooks/payloadTemplates`;
        return this.fetch(url);
    }

    // Create a webhook payload template for an organization
    createOrganizationWebhooksPayloadTemplate(organizationId, data) {
        const url = `/api/organizations/${organizationId}/webhooks/payloadTemplates`;
        return this.fetch(url, {
            method: 'POST',
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    // Get the webhook payload template for an organization
    getOrganizationWebhooksPayloadTemplate(organizationId, payloadTemplateId) {
        const url = `/api/organizations/${organizationId}/webhooks/payloadTemplates/${payloadTemplateId}`;
        return this.fetch(url);
    }

    // Update a webhook payload template for an organization
    updateOrganizationWebhooksPayloadTemplate(organizationId, payloadTemplateId, data) {
        const url = `/api/organizations/${organizationId}/webhooks/payloadTemplates/${payloadTemplateId}`;
        return this.fetch(url, {
            method: 'PUT',
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    // Destroy a webhook payload template for an organization
    deleteOrganizationWebhooksPayloadTemplate(organizationId, payloadTemplateId) {
        const url = `/api/organizations/${organizationId}/webhooks/payloadTemplates/${payloadTemplateId}`;
        return this.fetch(url, {
            method: 'DELETE',
            headers: this.headers
        });
    }

}

export default API;
