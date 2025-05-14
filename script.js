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
const reelOptions = { bf: [12, 14, 16, 18, 20, 22, 24, 26, 28], gsm: [100, 140, 150, 180, 200, 220], shade: ['Natural Shade', 'GYT'] };
const MAX_REEL_QUANTITY = 50;

// --- DOM Elements Cache (Declare here, assign in DOMContentLoaded) ---
let reelsVariationSectionsContainer, paperMillSelect, selectBf, selectGsm, selectShade,
    orderModal, orderSummaryTextEl, historyListEl, historyDetailsModal,
    historyItemDetailsList, historyOrderIdInput, historyReceivedDateInput,
    historyModalDate, historyModalMill, updateButton, updateStatusMsg,
    editingOrderIdInput, reelsPageTitle, generateReelsOrderBtnElement, landingPageElement;

// --- State ---
let currentOrderSummary = '';
let currentHistoryOrderData = null;
let temporaryOrderDataForEdit = null;

// --- LOCAL STORAGE HELPERS ---
const HISTORY_KEY = 'boxOrderHistory';
const loadOrders = () => { try { const s = localStorage.getItem(HISTORY_KEY); return s ? JSON.parse(s) : []; } catch (e) { console.error("LS Load Error:", e); return []; } };
const saveOrders = (h) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) { console.error("LS Save Error:", e); } };
function saveNewOrder(o) { const h = loadOrders(); h.unshift(o); saveOrders(h); }
function deleteOrderFromStorage(orderId) { let h = loadOrders(); h = h.filter(order => order.id !== orderId); saveOrders(h); }
function updateOrderInStorage(updatedOrder) {
    const history = loadOrders(); const index = history.findIndex(order => order.id === updatedOrder.id);
    if (index !== -1) { history[index] = { ...history[index], ...updatedOrder }; saveOrders(history); return true; } return false;
}

// --- UTILITY FUNCTIONS ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// --- UI FUNCTIONS ---
function populateVariationSelectors() { const p = (s, o) => { if (!s) return; s.length = 1; o.forEach(v => s.add(new Option(v, v))); }; p(selectBf, reelOptions.bf); p(selectGsm, reelOptions.gsm); p(selectShade, reelOptions.shade); }

function createQuantityStepper(initialValue = 0, max = MAX_REEL_QUANTITY) {
    const stepper = document.createElement('div'); stepper.className = 'quantity-stepper';
    const minusBtn = document.createElement('button'); minusBtn.type = 'button'; minusBtn.textContent = '-'; minusBtn.disabled = initialValue <= 0; minusBtn.setAttribute('aria-label', 'Decrease quantity');
    const valueSpan = document.createElement('span'); valueSpan.textContent = initialValue; valueSpan.setAttribute('role', 'status');
    const plusBtn = document.createElement('button'); plusBtn.type = 'button'; plusBtn.textContent = '+'; plusBtn.disabled = initialValue >= max; plusBtn.setAttribute('aria-label', 'Increase quantity');
    const updateHighlight = (val) => { const pI = stepper.closest('.measurement-item'); if (pI) pI.classList.toggle('highlighted-item', val > 0); };
    minusBtn.addEventListener('click', () => { let v = parseInt(valueSpan.textContent); if (v > 0) { v--; valueSpan.textContent = v; plusBtn.disabled = v >= max; minusBtn.disabled = v <= 0; updateHighlight(v); } });
    plusBtn.addEventListener('click', () => { let v = parseInt(valueSpan.textContent); if (v < max) { v++; valueSpan.textContent = v; minusBtn.disabled = v <= 0; plusBtn.disabled = v >= max; updateHighlight(v); } });
    stepper.appendChild(minusBtn); stepper.appendChild(valueSpan); stepper.appendChild(plusBtn);
    stepper.getValue = () => parseInt(valueSpan.textContent); updateHighlight(initialValue); return stepper;
}

function createUnitSelection(measurementData) {
    const unitButtonContainer = document.createElement('div'); unitButtonContainer.className = 'unit-buttons';
    const inchButton = document.createElement('button'); inchButton.type = 'button'; inchButton.className = 'unit-button active'; inchButton.textContent = `${measurementData.inches}`; inchButton.dataset.unitValue = 'in';
    const cmButton = document.createElement('button'); cmButton.type = 'button'; cmButton.className = 'unit-button'; cmButton.textContent = `${measurementData.cm}cm`; cmButton.dataset.unitValue = 'cm';
    inchButton.addEventListener('click', (e) => { const parentItem = e.target.closest('.measurement-item'); if (parentItem) parentItem.dataset.unit = 'in'; inchButton.classList.add('active'); cmButton.classList.remove('active'); });
    cmButton.addEventListener('click', (e) => { const parentItem = e.target.closest('.measurement-item'); if (parentItem) parentItem.dataset.unit = 'cm'; cmButton.classList.add('active'); inchButton.classList.remove('active'); });
    unitButtonContainer.appendChild(inchButton); unitButtonContainer.appendChild(cmButton); return unitButtonContainer;
}

function addVariationSection(bfValue = null, gsmValue = null, shadeValue = null, itemsToPopulate = null) {
    const bf = bfValue || selectBf.value, gsm = gsmValue || selectGsm.value, shade = shadeValue || selectShade.value;
    if (!bf || !gsm || !shade) { if (!bfValue) alert('Please select BF, GSM, and Shade.'); return null; }
    const variationId = `var_${bf}_${gsm}_${shade.replace(/\s+/g, '')}_${itemsToPopulate ? 'edit' + Math.random().toString(16).slice(2) : Date.now()}`;
    const section = document.createElement('div'); section.className = 'variation-section card'; section.dataset.variationId = variationId; section.dataset.bf = bf; section.dataset.gsm = gsm; section.dataset.shade = shade;
    const headerEl = document.createElement('div'); headerEl.className = 'variation-section-header'; headerEl.textContent = `Variation: BF ${bf} | GSM ${gsm} | Shade ${shade}`; section.appendChild(headerEl);
    const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-section-button'; removeBtn.innerHTML = '×'; removeBtn.title = 'Remove section'; removeBtn.setAttribute('aria-label', 'Remove section'); removeBtn.onclick = () => section.remove(); section.appendChild(removeBtn);
    const listContainer = document.createElement('div'); listContainer.className = 'measurement-list';
    measurements.forEach(m => {
        const item = document.createElement('div'); item.className = 'measurement-item'; item.dataset.measurementId = m.id; item.dataset.variationId = variationId; item.dataset.unit = 'in';
        const labelContainer = document.createElement('div'); labelContainer.className = 'measurement-label-container';
        const measurementTextPlaceholder = document.createElement('span'); measurementTextPlaceholder.className = 'measurement-text'; labelContainer.appendChild(measurementTextPlaceholder);
        const unitSelection = createUnitSelection(m); labelContainer.appendChild(unitSelection); item.appendChild(labelContainer);
        let initialQty = 0, initialUnit = 'in';
        if (itemsToPopulate) { const pI = itemsToPopulate.find(it => it.measurementId === m.id && it.bf === bf && it.gsm === gsm && it.shade === shade ); if (pI) { initialQty = pI.quantity; initialUnit = pI.preferredUnit || 'in'; item.dataset.unit = initialUnit; unitSelection.querySelectorAll('.unit-button').forEach(b => b.classList.toggle('active', b.dataset.unitValue === initialUnit));}}
        const stepper = createQuantityStepper(initialQty, MAX_REEL_QUANTITY); item.appendChild(stepper); listContainer.appendChild(item);
    });
    section.appendChild(listContainer); reelsVariationSectionsContainer.appendChild(section);
    if (!bfValue && selectBf && selectGsm && selectShade) { selectBf.value = ''; selectGsm.value = ''; selectShade.value = '';} return section;
}

function initializeReelsPage(orderToEdit = null) {
    if (selectBf && selectGsm && selectShade) populateVariationSelectors();
    if (reelsVariationSectionsContainer) reelsVariationSectionsContainer.innerHTML = '';
    if (editingOrderIdInput) editingOrderIdInput.value = '';
    if (reelsPageTitle) reelsPageTitle.textContent = "Reels Order";
    if (orderToEdit) {
        if (editingOrderIdInput) editingOrderIdInput.value = orderToEdit.id;
        if (reelsPageTitle) reelsPageTitle.textContent = "Edit Reels Order";
        if (paperMillSelect) paperMillSelect.value = orderToEdit.mill || '';
        const variations = {};
        orderToEdit.items.forEach(item => { const key = `bf:${item.bf}-gsm:${item.gsm}-shade:${item.shade}`; if (!variations[key]) variations[key] = { bf: item.bf, gsm: item.gsm, shade: item.shade, items: [] }; variations[key].items.push(item); });
        Object.values(variations).forEach(varData => addVariationSection(varData.bf, varData.gsm, varData.shade, varData.items));
    } else { if (paperMillSelect) paperMillSelect.value = ''; }
}

function displayOrderHistory() {
    if (!historyListEl) return;
    const h = loadOrders();
    historyListEl.innerHTML = '';
    if (h.length === 0) {
        historyListEl.innerHTML = '<li class="card"><p>No past orders found.</p></li>';
        return;
    }
    h.forEach(o => {
        const li = document.createElement('li');
        const mainContent = document.createElement('div');
        mainContent.className = 'history-item-main-content';
        mainContent.onclick = () => showHistoryDetails(o.id);
        mainContent.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') showHistoryDetails(o.id); };
        mainContent.setAttribute('role', 'button');
        mainContent.setAttribute('tabindex', '0');

        const d = new Date(o.timestamp);
        const dS = d.toLocaleDateString('en-CA'); // YYYY-MM-DD for better sorting if needed, or 'en-GB' DD/MM/YYYY
        const tS = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'});

        let statusDisplay = '';
        if (o.acknowledged) {
            statusDisplay = '<span class="status acknowledged">Acknowledged</span>';
        }
        // If not acknowledged, statusDisplay remains empty, so "Pending" is not shown.

        let tI = 0;
        let iL = 'items';
        if (o.items?.length) {
            tI = o.items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
            if (o.type === 'Reels') iL = tI === 1 ? 'reel' : 'reels';
            else iL = tI === 1 ? 'unit' : 'units';
        }

        mainContent.innerHTML = `<div class="history-item-header"><span class="date">${dS} ${tS}</span>${statusDisplay}</div><div class="history-item-details">Type: <strong>${o.type}</strong> | Mill: <span class="mill">${o.mill || 'N/A'}</span> | Total: ${tI} ${iL}</div>`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'history-item-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'action-button secondary history-edit-btn';
        editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i> Edit';
        editBtn.onclick = (e) => { e.stopPropagation(); editOrderFromHistory(o.id); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-button history-delete-btn';
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
        deleteBtn.onclick = (e) => { e.stopPropagation(); confirmDeleteOrder(o.id); };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        li.appendChild(mainContent);
        li.appendChild(actionsDiv);
        historyListEl.appendChild(li);
    });
}

function confirmDeleteOrder(orderId) { if (confirm("Are you sure you want to delete this order? This cannot be undone.")) { deleteOrderFromStorage(orderId); displayOrderHistory(); alert("Order deleted."); } }

function showPage(pageId) {
    const headerElement = document.querySelector('header'); document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage && headerElement) {
        targetPage.classList.add('active'); headerElement.style.display = (pageId === 'landing-page') ? '' : 'none';
        const updateSection = document.querySelector('.update-section'); if (updateSection) updateSection.style.display = (pageId === 'landing-page') ? '' : 'none';
        if (pageId === 'reels-page') initializeReelsPage(); else if (pageId === 'history-page') displayOrderHistory();
        window.scrollTo(0, 0);
    } else {
        console.error(`Page ${pageId} or header not found.`); const landingPage = document.getElementById('landing-page'); if (landingPage) landingPage.classList.add('active');
        if (headerElement) headerElement.style.display = ''; const updateSection = document.querySelector('.update-section'); if (updateSection) updateSection.style.display = '';
    }
}

function formatOrderSummary(orderData) { const d=new Date(orderData.timestamp);const dS=d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});let s=`Mill: ${orderData.mill||"N/A"}\nDate: ${dS}\n--- ${orderData.type.toUpperCase()} ORDER ---\n==========================\n\n`;if(orderData.type==='Reels'&&orderData.items?.length){const g=orderData.items.reduce((a,i)=>{const k=`BF:${i.bf||"N/A"} | GSM:${i.gsm||"N/A"} | Shade:${i.shade||"N/A"}`;if(!a[k])a[k]=[];a[k].push({m:i.measurementTextWithUnit,q:i.quantity});return a;},{});for(const k in g){s+=`*_${k}_*\n`;g[k].forEach(i=>{s+=`${i.m}: ${i.q} ${i.q===1?'reel':'reels'}\n`});s+=`\n`}}else if(orderData.items){orderData.items.forEach(i=>{s+=`${i.name||"Item"}: ${i.quantity||0} ${i.quantity===1?'unit':'units'}\n`})}s+=`==========================`;return s }

function generateOrder(orderType) {
    let orderItems = []; let hasItems = false; const millName = paperMillSelect?.value; const currentEditingId = editingOrderIdInput?.value;
    if (orderType === 'Reels') { if (!millName) { alert('Please select a Paper Mill.'); return; } const sections = reelsVariationSectionsContainer?.querySelectorAll('.variation-section'); if (!sections?.length) { alert('Please add variation section(s).'); return; } sections.forEach(section => { const { bf, gsm, shade, variationId } = section.dataset; const items = section.querySelectorAll('.measurement-item'); items.forEach(item => { const qty = item.querySelector('.quantity-stepper')?.getValue() || 0; if (qty > 0) { hasItems = true; const { measurementId, unit: preferredUnit = 'in' } = item.dataset; const mData = measurements.find(m => m.id === measurementId); if (mData) { const txt = preferredUnit === 'cm' ? `${mData.cm} cm` : mData.inches; orderItems.push({ measurement: mData.inches, measurementCm: mData.cm, measurementTextWithUnit: txt, measurementId, bf, gsm, shade, quantity: qty, variationId, preferredUnit }); } else console.warn(`Data missing: ${measurementId}`); } }); }); }
    else { alert(`${orderType} ordering not implemented.`); return; }
    if (!hasItems) { alert('Please add quantity > 0 for at least one item.'); return; }
    temporaryOrderDataForEdit = { id: currentEditingId || `order_${Date.now()}`, timestamp: currentEditingId ? loadOrders().find(o => o.id === currentEditingId)?.timestamp || Date.now() : Date.now(), type: orderType, mill: millName, items: orderItems, acknowledged: currentEditingId ? loadOrders().find(o => o.id === currentEditingId)?.acknowledged || false : false, receivedDate: currentEditingId ? loadOrders().find(o => o.id === currentEditingId)?.receivedDate || null : null, isEditing: !!currentEditingId };
    currentOrderSummary = formatOrderSummary(temporaryOrderDataForEdit);
    if (orderSummaryTextEl) orderSummaryTextEl.textContent = currentOrderSummary; const modalTitleEl = document.getElementById('modal-title'); if (modalTitleEl) modalTitleEl.textContent = currentEditingId ? "Confirm Updated Order" : "Order Summary";
    if (orderModal) orderModal.style.display = 'block';
}

function editCurrentOrder() { if (orderModal) closeModal('order-modal'); if (reelsPageTitle) reelsPageTitle.textContent = "Editing Current Order"; if (temporaryOrderDataForEdit?.id && editingOrderIdInput) editingOrderIdInput.value = temporaryOrderDataForEdit.id; }

function confirmAndSaveOrder() {
    if (!temporaryOrderDataForEdit) { alert("No order data to save."); return; }
    if (temporaryOrderDataForEdit.isEditing) {
        const originalOrder = loadOrders().find(o => o.id === temporaryOrderDataForEdit.id);
        if (originalOrder?.items) { temporaryOrderDataForEdit.items.forEach(newItem => { const originalItem = originalOrder.items.find(oi => oi.measurementId === newItem.measurementId && oi.bf === newItem.bf && oi.gsm === newItem.gsm && oi.shade === newItem.shade ); if (originalItem?.receivedQuantity !== undefined) newItem.receivedQuantity = originalItem.receivedQuantity; }); }
        updateOrderInStorage(temporaryOrderDataForEdit); alert("Order updated successfully!");
    } else { saveNewOrder(temporaryOrderDataForEdit); alert("Order saved successfully!"); }
    if (orderModal) closeModal('order-modal'); initializeReelsPage(); temporaryOrderDataForEdit = null; if (editingOrderIdInput) editingOrderIdInput.value = ''; if (reelsPageTitle) reelsPageTitle.textContent = "Reels Order";
}

function editOrderFromHistory(orderId) { const orderToEdit = loadOrders().find(o => o.id === orderId); if (orderToEdit) { showPage('reels-page'); initializeReelsPage(orderToEdit); } else alert("Could not find order to edit."); }
function shareOrderSummary() { if (!currentOrderSummary) return; const modalTitleEl = document.getElementById('modal-title'); const d = { title: modalTitleEl ? modalTitleEl.textContent : "Order Summary" , text: currentOrderSummary }; if (navigator.share && navigator.canShare(d)) navigator.share(d).catch(e => { if (e.name !== 'AbortError') alert('Share failed.'); }); else alert('Web Share not supported.'); }
function showHistoryDetails(orderId) { /* ... (same as your last version, it was correct) ... */ }
function formatHistoryReceiptSummary(orderData) { /* ... (same as your last version, it was correct) ... */ }
function shareHistoryReceiptSummary() { /* ... (same as your last version, it was correct) ... */ }
function acknowledgeOrder() { /* ... (same as your last version, it was correct) ... */ }

function closeModal(modalId) { const modalElement = document.getElementById(modalId); if (modalElement) modalElement.style.display = 'none'; else console.warn(`Modal ${modalId} not found.`); }

// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed.');

    // Initialize DOM Element Cache
    reelsVariationSectionsContainer = document.getElementById('reels-variation-sections-container');
    paperMillSelect = document.getElementById('paper-mill');
    selectBf = document.getElementById('select-bf');
    selectGsm = document.getElementById('select-gsm');
    selectShade = document.getElementById('select-shade');
    orderModal = document.getElementById('order-modal');
    orderSummaryTextEl = document.getElementById('order-summary-text');
    historyListEl = document.getElementById('history-list');
    historyDetailsModal = document.getElementById('history-details-modal');
    historyItemDetailsList = document.getElementById('history-item-details-list');
    historyOrderIdInput = document.getElementById('history-order-id');
    historyReceivedDateInput = document.getElementById('received-date');
    historyModalDate = document.getElementById('history-modal-date');
    historyModalMill = document.getElementById('history-modal-mill');
    updateButton = document.getElementById('check-update-btn');
    updateStatusMsg = document.getElementById('update-status-msg');
    editingOrderIdInput = document.getElementById('editing-order-id');
    reelsPageTitle = document.getElementById('reels-page-title');
    generateReelsOrderBtnElement = document.getElementById('generate-reels-order-btn');
    landingPageElement = document.getElementById('landing-page'); // Cache landing page element

    // Landing Page Navigation
    if (landingPageElement) {
        landingPageElement.addEventListener('click', function(event) {
            const item = event.target.closest('.landing-item');
            if (event.target.closest('.update-section')) { // Check if click is within update section
                console.log("Click within update section, preventing page navigation.");
                return;
            }
            const pageId = item?.dataset?.page; // Use optional chaining
            if (pageId) {
                console.log(`Landing item clicked. Navigating to: ${pageId}`);
                showPage(pageId);
            } else if (item) { // Only show alert if an item was clicked but had no pageId
                console.log('Landing item clicked, but it has no data-page attribute.');
                alert('This feature is coming soon!');
            }
        });
    } else {
        console.warn("Landing page element (#landing-page) not found.");
    }

    // Generate Reels Order Button Listener
    if (generateReelsOrderBtnElement) {
        generateReelsOrderBtnElement.addEventListener('click', () => generateOrder('Reels'));
    } else {
        console.warn("Generate Reels Order button (#generate-reels-order-btn) not found.");
    }

    // Modal Closing Listeners (using event delegation on document for .close)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('close') && event.target.closest('.modal')) {
            const modalIdToClose = event.target.dataset.modalId || event.target.closest('.modal').id;
            if (modalIdToClose) {
                closeModal(modalIdToClose);
            }
        }
    });
    // Modal closing by clicking on backdrop
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });


    // Update Button Listener
    if (updateButton) {
        updateButton.addEventListener('click', () => {
            console.log("Update button clicked.");
            if (!navigator.serviceWorker?.controller) {
                if(updateStatusMsg) { updateStatusMsg.textContent = "Cannot check updates now (SW not ready)."; updateStatusMsg.className = 'update-status error'; }
                console.warn("Service worker controller not available for update check."); return;
            }
            updateButton.disabled = true;
            if(updateStatusMsg) { updateStatusMsg.textContent = "Checking for updates..."; updateStatusMsg.className = 'update-status'; }
            updateButton.querySelector('i')?.classList.add('fa-spin');
            navigator.serviceWorker.controller.postMessage({ action: 'checkForUpdate' });
        });
    } else { console.warn("Update button (#check-update-btn) not found in DOM."); }

    // Listener for messages from Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            console.log("[Client] Message received from SW:", event.data);
            if (event.data?.status === 'updateCheckComplete') {
                if(updateButton) { updateButton.disabled = false; updateButton.querySelector('i')?.classList.remove('fa-spin'); }
                if(updateStatusMsg){
                    if (event.data.success) { updateStatusMsg.textContent = "Update check complete. Please RELOAD the page to see changes."; updateStatusMsg.className = 'update-status success'; }
                    else { updateStatusMsg.textContent = `Update check failed: ${event.data.error || 'Unknown error'}`; updateStatusMsg.className = 'update-status error'; }
                }
            }
        });
    }

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => { console.log('SW registered:', registration.scope); })
            .catch(err => { console.error('SW registration failed:', err); if(updateStatusMsg) { updateStatusMsg.textContent = "Cannot check for updates (SW registration error)."; updateStatusMsg.className = 'update-status error'; } if(updateButton) updateButton.disabled = true; });
    } else { console.warn('Service Worker not supported.'); if(updateStatusMsg) { updateStatusMsg.textContent = "Cannot check for updates (SW not supported)."; updateStatusMsg.className = 'update-status error'; } if(updateButton) updateButton.disabled = true; }

    showPage('landing-page');
});