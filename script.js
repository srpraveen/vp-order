// script.js

// --- DATA ---
const measurements = [
    { id: 'r27.5', inches: '27.5"', cm: '70' }, { id: 'r28.5', inches: '28.5"', cm: '72' },
    { id: 'r30', inches: '30"', cm: '76' },   { id: 'r31', inches: '31"', cm: '79' },
    { id: 'r32', inches: '32"', cm: '82' },   { id: 'r33', inches: '33"', cm: '84' },
    { id: 'r34', inches: '34"', cm: '86.5' }, { id: 'r36', inches: '36"', cm: '91.5' },
    { id: 'r38', inches: '38"', cm: '96.5' }, { id: 'r40', inches: '40"', cm: '101.5' },
    { id: 'r41', inches: '41"', cm: '104' },  { id: 'r41.5', inches: '41.5"', cm: '105.5' },
    { id: 'r42.5', inches: '42.5"', cm: '108' }, { id: 'r43.5', inches: '43.5"', cm: '110.5' },
    { id: 'r45', inches: '45"', cm: '114.5' }, { id: 'r46', inches: '46"', cm: '117' },
    { id: 'r48', inches: '48"', cm: '122' },  { id: 'r49', inches: '49"', cm: '124.5' },
    { id: 'r50', inches: '50"', cm: '127' },  { id: 'r52', inches: '52"', cm: '132' }
];
const reelOptions = {
    bf: [12, 14, 16, 18, 20, 22, 24, 26, 28],
    gsm: [100, 140, 150, 180, 200, 220],
    shade: ['Natural Shade', 'GYT']
};
const MAX_REEL_QUANTITY = 50;

// --- DOM Elements Cache ---
const reelsVariationSectionsContainer = document.getElementById('reels-variation-sections-container');
const paperMillSelect = document.getElementById('paper-mill');
const selectBf = document.getElementById('select-bf');
const selectGsm = document.getElementById('select-gsm');
const selectShade = document.getElementById('select-shade');
const orderModal = document.getElementById('order-modal');
const orderSummaryTextEl = document.getElementById('order-summary-text');
const historyListEl = document.getElementById('history-list');
const historyDetailsModal = document.getElementById('history-details-modal');
const historyItemDetailsList = document.getElementById('history-item-details-list');
const historyOrderIdInput = document.getElementById('history-order-id');
const historyReceivedDateInput = document.getElementById('received-date');
const historyModalDate = document.getElementById('history-modal-date');
const historyModalMill = document.getElementById('history-modal-mill');

// --- State ---
let currentOrderSummary = '';
let currentHistoryOrderData = null; // Store loaded history order for sharing

// --- LOCAL STORAGE HELPERS ---
const HISTORY_KEY = 'boxOrderHistory';
const loadOrders = () => {
    try { const stored = localStorage.getItem(HISTORY_KEY); return stored ? JSON.parse(stored) : []; }
    catch (error) { console.error("Error loading orders:", error); return []; }
};
const saveOrders = (history) => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    catch (error) { console.error("Error saving orders:", error); }
};
function saveNewOrder(newOrder) { const history = loadOrders(); history.unshift(newOrder); saveOrders(history); }
function updateOrderInStorage(updatedOrder) {
    const history = loadOrders(); const index = history.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) { history[index] = updatedOrder; saveOrders(history); return true; } return false;
}

// --- UTILITY FUNCTIONS ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// --- UI FUNCTIONS ---

function populateVariationSelectors() {
    const populate = (select, options) => { if (!select) return; select.length = 1; options.forEach(v => select.add(new Option(v, v))); };
    populate(selectBf, reelOptions.bf); populate(selectGsm, reelOptions.gsm); populate(selectShade, reelOptions.shade);
}

function createQuantityStepper(initialValue = 0, max = MAX_REEL_QUANTITY) {
    const stepper = document.createElement('div');
    stepper.className = 'quantity-stepper';
    const minusBtn = document.createElement('button'); minusBtn.type = 'button'; minusBtn.textContent = '-'; minusBtn.disabled = initialValue <= 0; minusBtn.setAttribute('aria-label', 'Decrease quantity');
    const valueSpan = document.createElement('span'); valueSpan.textContent = initialValue; valueSpan.setAttribute('role', 'status');
    const plusBtn = document.createElement('button'); plusBtn.type = 'button'; plusBtn.textContent = '+'; plusBtn.disabled = initialValue >= max; plusBtn.setAttribute('aria-label', 'Increase quantity');

    minusBtn.addEventListener('click', () => { let v = parseInt(valueSpan.textContent); if (v > 0) { v--; valueSpan.textContent = v; plusBtn.disabled = v >= max; minusBtn.disabled = v <= 0; } });
    plusBtn.addEventListener('click', () => { let v = parseInt(valueSpan.textContent); if (v < max) { v++; valueSpan.textContent = v; minusBtn.disabled = v <= 0; plusBtn.disabled = v >= max; } });

    stepper.appendChild(minusBtn); stepper.appendChild(valueSpan); stepper.appendChild(plusBtn);
    stepper.getValue = () => parseInt(valueSpan.textContent);
    return stepper;
}

function createUnitToggle(measurementData, measurementTextElement) {
    const unitToggle = document.createElement('div'); unitToggle.className = 'unit-toggle';
    const inchLabel = document.createElement('span'); inchLabel.className = 'unit-label'; inchLabel.textContent = 'in'; inchLabel.setAttribute('aria-hidden', 'true');
    const toggleContainer = document.createElement('label'); toggleContainer.className = 'toggle-switch'; toggleContainer.setAttribute('aria-label', `Toggle unit for ${measurementData.inches}`);
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = false;
    const slider = document.createElement('span'); slider.className = 'toggle-slider'; slider.setAttribute('aria-hidden', 'true');

    checkbox.addEventListener('change', function() {
        const isMetric = this.checked;
        measurementTextElement.textContent = isMetric ? `${measurementData.cm} cm` : `${measurementData.inches}`;
        measurementTextElement.closest('.measurement-item').dataset.unit = isMetric ? 'cm' : 'in';
    });

    const cmLabel = document.createElement('span'); cmLabel.className = 'unit-label'; cmLabel.textContent = 'cm'; cmLabel.setAttribute('aria-hidden', 'true');
    toggleContainer.appendChild(checkbox); toggleContainer.appendChild(slider);
    unitToggle.appendChild(inchLabel); unitToggle.appendChild(toggleContainer); unitToggle.appendChild(cmLabel);
    return unitToggle;
}

function addVariationSection() {
    const bf = selectBf.value, gsm = selectGsm.value, shade = selectShade.value;
    if (!bf || !gsm || !shade) { alert('Please select BF, GSM, and Shade.'); /* Add validation highlight maybe */ return; }
    // Removed explicit style clearing, handled by :invalid CSS if needed

    const variationId = `var_${bf}_${gsm}_${shade.replace(/\s+/g, '')}_${Date.now()}`;
    const section = document.createElement('div'); section.className = 'variation-section card';
    section.dataset.variationId = variationId; section.dataset.bf = bf; section.dataset.gsm = gsm; section.dataset.shade = shade;
    const header = document.createElement('div'); header.className = 'variation-section-header'; header.textContent = `Variation: BF ${bf} | GSM ${gsm} | Shade ${shade}`; section.appendChild(header);
    const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-section-button'; removeBtn.innerHTML = '×'; removeBtn.title = 'Remove section'; removeBtn.setAttribute('aria-label', 'Remove section'); removeBtn.onclick = () => section.remove(); section.appendChild(removeBtn);
    const listContainer = document.createElement('div'); listContainer.className = 'measurement-list';

    measurements.forEach(m => {
        const item = document.createElement('div'); item.className = 'measurement-item'; item.dataset.measurementId = m.id; item.dataset.variationId = variationId; item.dataset.unit = 'in';
        const labelContainer = document.createElement('div'); labelContainer.className = 'measurement-label-container';
        const measurementText = document.createElement('span'); measurementText.className = 'measurement-text'; measurementText.textContent = m.inches; labelContainer.appendChild(measurementText);
        const unitToggle = createUnitToggle(m, measurementText); labelContainer.appendChild(unitToggle);
        item.appendChild(labelContainer);
        const stepper = createQuantityStepper(0, MAX_REEL_QUANTITY); item.appendChild(stepper);
        listContainer.appendChild(item);
    });

    section.appendChild(listContainer); reelsVariationSectionsContainer.appendChild(section);
    selectBf.value = ''; selectGsm.value = ''; selectShade.value = ''; // Reset selectors
}

function initializeReelsPage() { populateVariationSelectors(); reelsVariationSectionsContainer.innerHTML = ''; if (paperMillSelect) paperMillSelect.value = ''; }

function displayOrderHistory() {
    if (!historyListEl) return;
    const history = loadOrders();
    historyListEl.innerHTML = '';

    if (history.length === 0) { historyListEl.innerHTML = '<li class="card"><p>No past orders found.</p></li>'; return; }

    history.forEach(order => {
        const li = document.createElement('li'); li.dataset.orderId = order.id; li.setAttribute('role', 'button'); li.setAttribute('tabindex', '0');
        li.onclick = () => showHistoryDetails(order.id); li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') showHistoryDetails(order.id); };

        const orderDate = new Date(order.timestamp); const dateStr = orderDate.toLocaleDateString('en-CA'); const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'});
        const statusClass = order.acknowledged ? 'acknowledged' : 'pending'; const statusText = order.acknowledged ? 'Acknowledged' : 'Pending';

        let totalItems = 0; let itemLabel = 'items';
        if (order.items && Array.isArray(order.items)) {
            totalItems = order.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            if (order.type === 'Reels') { itemLabel = totalItems === 1 ? 'reel' : 'reels'; }
            else { itemLabel = totalItems === 1 ? 'unit' : 'units'; }
        }

        li.innerHTML = `
            <div class="history-item-header">
                <span class="date">${dateStr} ${timeStr}</span>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <div class="history-item-details">
                Type: <strong>${order.type}</strong> | Mill: <span class="mill">${order.mill || 'N/A'}</span> | Total: ${totalItems} ${itemLabel}
            </div>
        `;
        historyListEl.appendChild(li);
    });
}

// --- UPDATED showPage function ---
function showPage(pageId) {
        // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const targetPage = document.getElementById(pageId);

    // Check if target page exists
    if (targetPage) {
        targetPage.classList.add('active');

        // Initialize content based on page
        if (pageId === 'reels-page') {
            initializeReelsPage();
        } else if (pageId === 'history-page') {
            displayOrderHistory();
        }
        // Add initializations for other pages if needed

        // Scroll to top when changing page for better UX
        window.scrollTo(0, 0);

    } else {
        console.error(`Page ${pageId} not found.`);
        // Fallback to landing page
        const landingPage = document.getElementById('landing-page');
        if (landingPage) {
            landingPage.classList.add('active');
        }
        }
    }
// --- End of UPDATED showPage function ---


function formatOrderSummary(orderData) { // For initial order share
    const orderDate = new Date(orderData.timestamp); const dateStr = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'});
    let summary = `--- ${orderData.type.toUpperCase()} ORDER --- (${dateStr} ${timeStr})\n`; summary += `Mill: ${orderData.mill || 'N/A'}\n`; summary += `==============================\n\n`;
    if (orderData.type === 'Reels' && orderData.items?.length > 0) {
        const groupedItems = orderData.items.reduce((acc, item) => { const key = `BF:${item.bf || 'N/A'} | GSM:${item.gsm || 'N/A'} | Shade:${item.shade || 'N/A'}`; if (!acc[key]) { acc[key] = []; } acc[key].push({ measurement: item.measurementTextWithUnit, quantity: item.quantity }); return acc; }, {});
        for (const variationKey in groupedItems) { summary += `--- ${variationKey} ---\n`; groupedItems[variationKey].forEach(item => { const unitSuffix = item.quantity === 1 ? 'reel' : 'reels'; summary += `${item.measurement}: ${item.quantity} ${unitSuffix}\n`; }); summary += `\n`; }
    } else if (orderData.items) { orderData.items.forEach(item => { const name = item.name || 'Item'; const quantity = item.quantity || 0; const unitSuffix = quantity === 1 ? 'unit' : 'units'; summary += `${name}: ${quantity} ${unitSuffix}\n`; }); }
    summary += `==============================`;
    return summary;
}

function generateOrder(orderType) {
    let orderItems = []; let hasItems = false; const millName = paperMillSelect?.value;
    if (orderType === 'Reels') {
        if (!millName) { alert('Please select a Paper Mill.'); return; }
        const variationSections = reelsVariationSectionsContainer.querySelectorAll('.variation-section'); if (variationSections.length === 0) { alert('Please add at least one variation section.'); return; }
        variationSections.forEach(section => {
            const bf = section.dataset.bf, gsm = section.dataset.gsm, shade = section.dataset.shade, variationId = section.dataset.variationId;
            const measurementItems = section.querySelectorAll('.measurement-item');
            measurementItems.forEach(item => {
                const stepper = item.querySelector('.quantity-stepper'); const quantity = stepper?.getValue() || 0;
                if (quantity > 0) {
                    hasItems = true; const measurementId = item.dataset.measurementId; const preferredUnit = item.dataset.unit || 'in'; const measurementData = measurements.find(m => m.id === measurementId);
                    if (measurementData) {
                        const measurementTextWithUnit = preferredUnit === 'cm' ? `${measurementData.cm} cm` : `${measurementData.inches}`;
                        orderItems.push({ measurement: measurementData.inches, measurementCm: measurementData.cm, measurementTextWithUnit: measurementTextWithUnit, measurementId: measurementId, bf: bf, gsm: gsm, shade: shade, quantity: quantity, variationId: variationId, preferredUnit: preferredUnit });
                    } else { console.warn(`Data not found for ID: ${measurementId}`); }
                }
            });
        });
    } else { alert(`Generating order for ${orderType} is not yet implemented.`); return; }
    if (!hasItems) { alert('Please enter quantity > 0 for at least one item.'); return; }
    const orderData = { id: `order_${Date.now()}`, timestamp: Date.now(), type: orderType, mill: millName, items: orderItems, acknowledged: false, receivedDate: null };
    currentOrderSummary = formatOrderSummary(orderData); saveNewOrder(orderData);
    orderSummaryTextEl.textContent = currentOrderSummary; document.getElementById('modal-title').textContent = `${orderType} Order Summary`; orderModal.style.display = 'block';
    if (orderType === 'Reels') { initializeReelsPage(); }
}

function shareOrderSummary() {
    if (!currentOrderSummary) return; const shareData = { title: `${document.getElementById('modal-title').textContent}`, text: currentOrderSummary, };
    if (navigator.share && navigator.canShare(shareData)) { navigator.share(shareData).then(() => console.log('Shared')).catch((e) => { console.error('Share error:', e); if (e.name !== 'AbortError') alert('Share failed.'); }); }
    else { alert('Web Share not supported.'); }
}

function showHistoryDetails(orderId) {
    const order = loadOrders().find(o => o.id === orderId); if (!order) { console.error("Order not found:", orderId); return; }
    currentHistoryOrderData = order; // Store for sharing receipt status
    historyOrderIdInput.value = order.id; const orderDate = new Date(order.timestamp); historyModalDate.textContent = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'}); historyModalMill.textContent = order.mill || 'N/A'; historyReceivedDateInput.value = order.receivedDate || ''; historyReceivedDateInput.max = getTodayDateString();
    historyItemDetailsList.innerHTML = '';
    if (order.items?.length > 0) {
        const table = document.createElement('table'); table.innerHTML = `<thead><tr><th>Item</th><th>Ordered</th><th>Received</th></tr></thead><tbody></tbody>`; const tbody = table.querySelector('tbody');
        order.items.forEach((item, index) => {
            const row = document.createElement('tr'); row.dataset.itemIndex = index;
            const descCell = document.createElement('td'); descCell.className = 'item-desc';
            if (order.type === 'Reels') { descCell.innerHTML = `<strong>${item.measurementTextWithUnit || item.measurement}</strong><br><small>BF: ${item.bf || 'N/A'} | GSM: ${item.gsm || 'N/A'} | Shade: ${item.shade || 'N/A'}</small>`; }
            else { descCell.textContent = item.name || `Item ${index + 1}`; }
            const orderedCell = document.createElement('td'); orderedCell.textContent = item.quantity || 0;
            const receivedCell = document.createElement('td'); const receivedInput = document.createElement('input'); receivedInput.type = 'number'; receivedInput.min = 0; receivedInput.max = (order.type === 'Reels') ? MAX_REEL_QUANTITY + 50 : 999; receivedInput.value = item.receivedQuantity === undefined ? (item.quantity || 0) : (item.receivedQuantity || 0); receivedInput.dataset.itemIndex = index; receivedInput.setAttribute('aria-label', `Received quantity for ${item.measurementTextWithUnit || item.name || 'item ' + (index+1)}`); receivedCell.appendChild(receivedInput);
            row.appendChild(descCell); row.appendChild(orderedCell); row.appendChild(receivedCell); tbody.appendChild(row);
        });
        historyItemDetailsList.appendChild(table);
    } else { historyItemDetailsList.innerHTML = '<p>No items found in this order.</p>'; }
    historyDetailsModal.style.display = 'block';
}

// --- Function to format history receipt summary ---
function formatHistoryReceiptSummary(orderData) {
    if (!orderData) return "Error: Order data not available.";

    const orderDate = new Date(orderData.timestamp);
    const dateStr = orderDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const receivedDateStr = orderData.receivedDate ? new Date(orderData.receivedDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending Receipt';

    let summary = `--- ORDER RECEIPT STATUS ---\n`;
    summary += `Order Date: ${dateStr}\n`;
    summary += `Mill: ${orderData.mill || 'N/A'}\n`;
    summary += `Received Date: ${receivedDateStr}\n`;
    summary += `==============================\n\n`;

    let discrepancies = false;
    if (orderData.items && orderData.items.length > 0) {
        orderData.items.forEach(item => {
            const orderedQty = item.quantity || 0;
            const receivedQty = item.receivedQuantity === undefined ? '?' : (item.receivedQuantity || 0); // Show '?' if not yet entered
            const itemDesc = (orderData.type === 'Reels')
                ? `${item.measurementTextWithUnit || item.measurement} (BF:${item.bf || 'N/A'}, GSM:${item.gsm || 'N/A'})`
                : (item.name || 'Item');

            summary += `${itemDesc}\n`;
            summary += `  Ordered: ${orderedQty} | Received: ${receivedQty}`;
            if (receivedQty !== '?' && orderedQty !== receivedQty) {
                summary += ` <-- MISMATCH`;
                discrepancies = true;
            }
            summary += `\n\n`;
        });
    } else {
        summary += "No items found in this order.\n";
    }

    summary += `==============================\n`;
    if (discrepancies) {
        summary += `Status: Received with discrepancies noted.\n`;
    } else if (orderData.receivedDate) {
        summary += `Status: Received, quantities match order.\n`;
    } else {
        summary += `Status: Pending receipt acknowledgment.\n`;
    }

    return summary;
}

// Share Receipt Status (Called from History Modal)
function shareHistoryReceiptSummary() {
    if (!currentHistoryOrderData) { alert("Order details not loaded."); return; }
    const summaryToShare = formatHistoryReceiptSummary(currentHistoryOrderData); // Use the correct formatter
    const shareData = { title: `Receipt Status - Order ${currentHistoryOrderData.id.substring(6, 12)}`, text: summaryToShare };
     if (navigator.share && navigator.canShare(shareData)) {
          navigator.share(shareData).then(() => console.log('Receipt status shared')).catch((e) => { console.error('Share error:', e); if (e.name !== 'AbortError') alert('Share failed.'); });
     } else { alert('Web Share not supported.'); }
}

function acknowledgeOrder() {
    const orderId = historyOrderIdInput.value; const receivedDate = historyReceivedDateInput.value;
    if (!receivedDate) { alert('Please select the date received.'); historyReceivedDateInput.focus(); return; }
    const history = loadOrders(); const orderIndex = history.findIndex(o => o.id === orderId);
    if (orderIndex === -1) { alert('Error: Could not find order.'); return; }
    const orderToUpdate = history[orderIndex]; orderToUpdate.acknowledged = true; orderToUpdate.receivedDate = receivedDate;
    const receivedInputs = historyItemDetailsList.querySelectorAll('input[type="number"]');
    receivedInputs.forEach(input => { const itemIndex = parseInt(input.dataset.itemIndex); const receivedQty = parseInt(input.value) || 0; if (orderToUpdate.items?.[itemIndex]) { orderToUpdate.items[itemIndex].receivedQuantity = receivedQty; } });
    if (updateOrderInStorage(orderToUpdate)) { closeModal('history-details-modal'); displayOrderHistory(); alert('Order acknowledged and saved!'); }
    else { alert('Failed to save acknowledgment.'); }
}

function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }

// --- EVENT LISTENERS ---
document.getElementById('landing-page')?.addEventListener('click', function(event) {
    const item = event.target.closest('.landing-item');
    // Use optional chaining for safety
    const pageId = item?.dataset?.page;
    if (pageId) {
         console.log(`Attempting to show page: ${pageId}`);
         showPage(pageId);
    } else if (item) {
         console.log('Clicked landing item has no data-page attribute.');
         alert('This feature is coming soon!');
    } else {
        // Click was inside #landing-page but not on a .landing-item or its child
         // console.log('Click inside landing page, but not on a clickable item.'); // Less noisy console
    }
});
document.addEventListener('click', function(event) {
    // Use optional chaining for closing modals
    if (event.target.classList.contains('close')) {
        event.target.closest('.modal')?.closeModal(event.target.closest('.modal').id);
    }
});
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded.'); showPage('landing-page');
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./service-worker.js').then(reg => console.log('SW registered:', reg.scope)).catch(err => console.error('SW registration failed:', err)); }
    else { console.warn('Service Worker not supported.'); }
});