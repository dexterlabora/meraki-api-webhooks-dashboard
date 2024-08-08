/**
 * API Handler for Meraki Dashboard
 * 
 * This file contains the API class that handles all API interactions for the Meraki Dashboard application.
 * It provides methods for making API requests, handling pagination, and processing responses.
 * 
 * Key features:
 * - Centralized API request handling with authentication
 * - Support for GET and POST requests with query parameters and request bodies
 * - Automatic pagination handling for large datasets
 * - Custom header extraction for pagination metadata
 * - Error handling and response processing
 * 
 * Main methods:
 * - fetch(): Core method for making API requests
 * - fetchPaginated(): Handles paginated API requests
 * - Various endpoint-specific methods (e.g., getOrganizations, getOrganizationNetworks, etc.)
 * 
 * The API class is designed to be instantiated with an API key and provides a consistent
 * interface for all Meraki API interactions throughout the application.
 */

// apiHandlers.js
class API {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.headers = {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": 'application/json'
        };
    }

    // Add this method to your API class
    setApiKey(newApiKey) {
        this.apiKey = newApiKey;
    }

    async fetch(url, options = {}, retries = 3) {
        let fetchUrl = new URL(url, window.location.origin);
        const fetchOptions = {
            method: options.method || 'GET',
            headers: { ...this.headers, ...options.headers },
        };

        if (fetchOptions.method === 'GET' && options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item !== undefined && item !== null && item !== '') {
                            fetchUrl.searchParams.append(`${key}[]`, item);
                        }
                    });
                } else if (value !== undefined && value !== null && value !== '') {
                    fetchUrl.searchParams.append(key, value);
                }
            });
        } else if (options.body) {
            fetchOptions.body = options.body;
            console.log("fetchOptions.body", fetchOptions.body);
        }

        console.log("apiHandlers fetch url", fetchUrl.toString());
    //    console.log("apiHandlers fetch options", fetchOptions);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(fetchUrl.toString(), fetchOptions);

                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
                    console.log(`Rate limited. Retrying after ${retryAfter} seconds.`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API request failed:', response.status, errorText);
                    throw {
                        errors: [errorText],
                        statusCode: response.status,
                        statusText: response.statusText,
                        ok: false
                    };
                }

                const responseData = await response.json();
                const responseMetadata = this.extractCustomHeaders(response);

             //   console.log("Response metadata:", responseMetadata);
                console.log("apiHandlers fetch responseData", responseData);
                return { data: responseData, ...responseMetadata };
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === retries) {
                    throw error;
                }
                // Wait for 1 second before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    extractCustomHeaders(response) {
        const linkHeader = response.headers.get("Link");
       // console.log("linkHeader", linkHeader);
        const parsedLinks = this.parseLinkHeader(linkHeader);
        return {
            firstPageUrl: parsedLinks.first || null,
            prevPageUrl: parsedLinks.prev || null,
            nextPageUrl: parsedLinks.next || null,
            lastPageUrl: parsedLinks.last || null,
            linkHeader,
            retryAfter: response.headers.get("Retry-After") ? parseInt(response.headers.get("Retry-After"), 10) : null,
            statusCode: response.status,
            statusText: response.statusText,
            ok: response.ok
        };
    }

    parseLinkHeader(header) {
        if (!header) return {};
        const links = {};
        header.split(',').forEach(part => {
            const section = part.split(';');
            if (section.length !== 2) {
                return;
            }
            let url = section[0].replace(/<(.*)>/, '$1').trim();
            // Remove the "https://api.meraki.com" prefix
            url = url.replace('https://api.meraki.com/api/v1', '/api');
            const name = section[1].replace("rel=","").trim();
            links[name] = url;
        });
        //console.log("Parsed links:", links);  // Add this line for debugging
        return links;
    }

    async fetchPaginated(url, params = {}) {
        let allData = [];
        let nextUrl = this.buildUrl(url, params);
        let pageCount = 0;
        const maxPages = params.maxPages || 3; // Use the provided maxPages or default

        while (nextUrl && pageCount < maxPages) {
            console.log(`Fetching page ${pageCount + 1}, URL: ${nextUrl}`);
            const { data, nextPageUrl } = await this.fetch(nextUrl);
            allData = allData.concat(data);
            pageCount++;

            console.log(`Received ${data.length} items`);
            console.log("Next page URL:", nextPageUrl);
            
            if (pageCount >= maxPages) {
                console.log(`Reached maximum number of pages (${maxPages})`);
                break;
            }

            nextUrl = nextPageUrl;

            if (!nextUrl) {
                console.log("No next URL, pagination complete");
                break;
            }
        }

        console.log(`Total items fetched: ${allData.length}`);
        return allData;
    }

    buildUrl(baseUrl, params) {
        const url = new URL(baseUrl, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && key !== 'maxPages' && !url.searchParams.has(key)) {
                if (Array.isArray(params[key])) {
                    params[key].forEach(value => url.searchParams.append(`${key}[]`, value));
                } else {
                    url.searchParams.set(key, params[key].toString());
                }
            }
        });
        return url.toString();
    }

    async getOrganizationApiRequests(organizationId, params = {}) {
        const baseUrl = `/api/organizations/${organizationId}/apiRequests`;
        return this.fetchPaginated(baseUrl, params);
    }

    async getOrganizationWebhooksLogs(organizationId, timespan, perPage = 1000, maxPages = Infinity) {
        const url = `/api/organizations/${organizationId}/webhooks/logs`;
        return this.fetchPaginated(url, { timespan, perPage }, maxPages);
    }

    // Endpoint methods
    getOrganizations() {
        return this.fetch('/api/organizations');
    }

    getOrganizationNetworks(organizationId) {
        return this.fetch(`/api/organizations/${organizationId}/networks`);
    }

    getOrganizationAdmins(organizationId) {
        return this.fetch(`/api/organizations/${organizationId}/admins`);
    }

    async getOrganizationApiRequestsOverview(organizationId, timespan) {
        const url = `/api/organizations/${organizationId}/apiRequests/overview`;
        return this.fetch(url, { params: { timespan } });
    }

    async getOrganizationApiRequestsOverviewResponseCodesByInterval(organizationId, params = {}) {
        console.log("apiHandlers getOrganizationApiRequestsOverviewResponseCodesByInterval params", params);
        const url = `/api/organizations/${organizationId}/apiRequests/overview/responseCodes/byInterval`;
        return this.fetch(url, { params });
    }

    getAdministeredIdentitiesMe() {
        return this.fetch(`/api/administered/identities/me`);
    }

    // Concept 
    generateAdministeredIdentitiesMeApiKeys() {
        const url = `/api/administered/identities/me/api/keys/generate`
        return this.fetch(url);
    }

    getAdministeredIdentitiesMeApiKeys() {
        const url = `/api/administered/identities/me/api/keys`
        return this.fetch(url);
    }

    getAdministeredIdentitiesMeApiKeysRevoke(suffix) {
        const url = `/api/administered/identities/me/api/keys/revoke/${suffix}`
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
            body: JSON.stringify(data)
        });
    }

    // Delete an HTTP server from an organization
    deleteOrganizationWebhooksHttpServer(organizationId, httpServerId) {
        const url = `/api/organizations/${organizationId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url, {
            method: 'DELETE'
        });
    }

    // NETWORK 

    // List the HTTP servers for an organization
    getNetworkWebhooksHttpServers(networkId) {
        const url = `/api/networks/${networkId}/webhooks/httpServers`;
        return this.fetch(url);
    }

    // Add an HTTP server to an organization
    createNetworkWebhooksHttpServer(networkId, data) {
        const url = `/api/networks/${networkId}/webhooks/httpServers`;
        return this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Return an HTTP server for an organization
    getNetworkWebhooksHttpServer(networkId, httpServerId) {
        const url = `/api/networks/${networkId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url);
    }

    // Update an HTTP server for an organization
    updateNetworkWebhooksHttpServer(networkId, httpServerId, data) {
        const url = `/api/networks/${networkId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Delete an HTTP server from an organization
    deleteNetworkWebhooksHttpServer(networkId, httpServerId) {
        const url = `/api/networks/${networkId}/webhooks/httpServers/${httpServerId}`;
        return this.fetch(url, {
            method: 'DELETE',
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
            body: JSON.stringify(data)
        });
    }

    // Destroy a webhook payload template for an organization
    deleteOrganizationWebhooksPayloadTemplate(organizationId, payloadTemplateId) {
        const url = `/api/organizations/${organizationId}/webhooks/payloadTemplates/${payloadTemplateId}`;
        return this.fetch(url, {
            method: 'DELETE'
        });
    }

}

export default API;