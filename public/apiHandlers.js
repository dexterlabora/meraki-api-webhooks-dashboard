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
}

export default API;
