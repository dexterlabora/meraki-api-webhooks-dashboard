/**
 * Table Sorting Module
 * 
 * This module provides functionality to make HTML tables sortable by clicking on column headers.
 * It supports sorting of various data types including text, numbers, and custom formats.
 * 
 * Key features:
 * - Adds click listeners to sortable table headers
 * - Sorts table rows based on column content
 * - Supports ascending and descending sort orders
 * - Handles custom data formats (e.g., "Success / Fail" ratios, percentages)
 * - Skips non-sortable columns
 * 
 * Main functions:
 * - setupTableSortListeners: Initializes sorting functionality for tables within a container
 * - sortTableByColumn: Sorts a table based on a specific column
 * - parseColumnData: Parses column data for proper comparison during sorting
 * 
 * Usage:
 * Call setupTableSortListeners(containerSelector) where:
 * - containerSelector: CSS selector for the container of sortable tables
 * 
 * Note: Tables should have the class "sortable-table" and non-sortable headers
 * should have the class "non-sortable" for this module to work correctly.
 */

// Setup sorting for tables, skipping non-sortable headers
export function setupTableSortListeners(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error("Container not found for selector:", containerSelector);
        return;
    }

    container.querySelectorAll(".sortable-table").forEach(table => {
        table.querySelectorAll("th:not(.non-sortable)").forEach((headerCell, index) => {
            headerCell.addEventListener("click", () => {
                const currentIsAscending = headerCell.classList.contains("th-sort-asc");
                sortTableByColumn(table, index, !currentIsAscending);
            });
        });
    });
}

function sortTableByColumn(table, columnIndex, asc = true) {
    const dirModifier = asc ? 1 : -1;
    const tbody = table.tBodies[0];
    const headers = table.querySelectorAll("th");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const sortedRows = rows.sort((a, b) => {
        const aColText = a.cells[columnIndex]?.textContent.trim() || '';
        const bColText = b.cells[columnIndex]?.textContent.trim() || '';

        // Parse the column text into comparable data
        const aValue = parseColumnData(aColText, columnIndex, headers);
        const bValue = parseColumnData(bColText, columnIndex, headers);

        if (aValue < bValue) return -1 * dirModifier;
        if (aValue > bValue) return 1 * dirModifier;
        return 0;
    });

    tbody.innerHTML = '';
    tbody.append(...sortedRows);

    // Update header class for sort direction
    headers.forEach(th => th.classList.remove("th-sort-asc", "th-sort-desc"));
    headers[columnIndex].classList.add(asc ? "th-sort-asc" : "th-sort-desc");
}


// Helper function to extract numeric values from formatted strings
function parseColumnData(text, columnIndex, headers) {
    // Determine the type of data based on the header
    const header = headers[columnIndex].textContent.trim();

    if (header === "Success / Fail") {
        // Extract the first number from the format "123 / 456"
        return parseInt(text.split('/')[0].trim());
    } else if (header === "Rate") {
        // Convert "50%" to 0.50
        return parseFloat(text.replace('%', '')) / 100;
    } else {
        // Handle as regular text or numeric values
        return isNaN(Number(text)) ? text.toLowerCase() : Number(text);
    }
}