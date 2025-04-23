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
const updateButton = document.getElementById('check-update-btn');
const updateStatusMsg = document.getElementById('update-status-msg');

// --- State ---
let currentOrderSummary = '';
let currentHistoryOrderData = null;

// --- LOCAL STORAGE HELPERS ---
const HISTORY_KEY = 'boxOrderHistory';
const loadOrders = () => { try { const s = localStorage.getItem(HISTORY_KEY); return s ? JSON.parse(s) : []; } catch (e) { console.error("LS Load Error:", e); return []; } };
const saveOrders = (h) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) { console.error("LS Save Error:", e); } };
function saveNewOrder(o) { const h = loadOrders(); h.unshift(o); saveOrders(h); }
function updateOrderInStorage(o) { const h = loadOrders(); const i = h.findIndex(x => x.id === o.id); if (i !== -1) { h[i] = o; saveOrders(h); return true; } return false; }

// --- UTILITY FUNCTIONS ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// --- UI FUNCTIONS ---

function populateVariationSelectors() { const p = (s, o) => { if (!s) return; s.length = 1; o.forEach(v => s.add(new Option(v, v))); }; p(selectBf, reelOptions.bf); p(selectGsm, reelOptions.gsm); p(selectShade, reelOptions.shade); }

// --- UPDATED createQuantityStepper ---
function createQuantityStepper(initialValue = 0, max = MAX_REEL_QUANTITY) {
    const stepper = document.createElement('div');
    stepper.className = 'quantity-stepper';
    const minusBtn = document.createElement('button'); minusBtn.type = 'button'; minusBtn.textContent = '-'; minusBtn.disabled = initialValue <= 0; minusBtn.setAttribute('aria-label', 'Decrease quantity');
    const valueSpan = document.createElement('span'); valueSpan.textContent = initialValue; valueSpan.setAttribute('role', 'status');
    const plusBtn = document.createElement('button'); plusBtn.type = 'button'; plusBtn.textContent = '+'; plusBtn.disabled = initialValue >= max; plusBtn.setAttribute('aria-label', 'Increase quantity');

    // Function to toggle highlight based on value
    const updateHighlight = (currentValue) => {
        const parentItem = stepper.closest('.measurement-item'); // Find parent
        if (parentItem) {
            if (currentValue > 0) {
                parentItem.classList.add('highlighted-item');
            } else {
                parentItem.classList.remove('highlighted-item');
            }
        }
    };

    minusBtn.addEventListener('click', () => {
        let v = parseInt(valueSpan.textContent);
        if (v > 0) {
            v--;
            valueSpan.textContent = v;
            plusBtn.disabled = v >= max;
            minusBtn.disabled = v <= 0;
            updateHighlight(v); // Call highlight update
        }
    });
    plusBtn.addEventListener('click', () => {
        let v = parseInt(valueSpan.textContent);
        if (v < max) {
            v++;
            valueSpan.textContent = v;
            minusBtn.disabled = v <= 0;
            plusBtn.disabled = v >= max;
            updateHighlight(v); // Call highlight update
        }
    });

    stepper.appendChild(minusBtn); stepper.appendChild(valueSpan); stepper.appendChild(plusBtn);
    stepper.getValue = () => parseInt(valueSpan.textContent);

    // Initial check in case it starts non-zero (though default is 0)
    updateHighlight(initialValue);

    return stepper;
}
// --- End of UPDATED createQuantityStepper ---


function createUnitToggle(measurementData, measurementTextElement) { const u = document.createElement('div'); u.className = 'unit-toggle'; const iL = document.createElement('span'); iL.className = 'unit-label'; iL.textContent = 'in'; iL.setAttribute('aria-hidden', 'true'); const tC = document.createElement('label'); tC.className = 'toggle-switch'; tC.setAttribute('aria-label', `Toggle unit for ${measurementData.inches}`); const cB = document.createElement('input'); cB.type = 'checkbox'; cB.checked = false; const sL = document.createElement('span'); sL.className = 'toggle-slider'; sL.setAttribute('aria-hidden', 'true'); cB.addEventListener('change', function() { const iM = this.checked; measurementTextElement.textContent = iM ? `${measurementData.cm} cm` : `${measurementData.inches}`; measurementTextElement.closest('.measurement-item').dataset.unit = iM ? 'cm' : 'in'; }); const cL = document.createElement('span'); cL.className = 'unit-label'; cL.textContent = 'cm'; cL.setAttribute('aria-hidden', 'true'); tC.appendChild(cB); tC.appendChild(sL); u.appendChild(iL); u.appendChild(tC); u.appendChild(cL); return u; }

function addVariationSection() {
    const bf = selectBf.value, gsm = selectGsm.value, shade = selectShade.value; if (!bf || !gsm || !shade) { alert('Please select BF, GSM, and Shade.'); return; }
    const variationId = `var_${bf}_${gsm}_${shade.replace(/\s+/g, '')}_${Date.now()}`; const section = document.createElement('div'); section.className = 'variation-section card'; section.dataset.variationId = variationId; section.dataset.bf = bf; section.dataset.gsm = gsm; section.dataset.shade = shade; const header = document.createElement('div'); header.className = 'variation-section-header'; header.textContent = `Variation: BF ${bf} | GSM ${gsm} | Shade ${shade}`; section.appendChild(header); const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-section-button'; removeBtn.innerHTML = '×'; removeBtn.title = 'Remove section'; removeBtn.setAttribute('aria-label', 'Remove section'); removeBtn.onclick = () => section.remove(); section.appendChild(removeBtn); const listContainer = document.createElement('div'); listContainer.className = 'measurement-list';
    measurements.forEach(m => { const item = document.createElement('div'); item.className = 'measurement-item'; item.dataset.measurementId = m.id; item.dataset.variationId = variationId; item.dataset.unit = 'in'; const lC = document.createElement('div'); lC.className = 'measurement-label-container'; const mT = document.createElement('span'); mT.className = 'measurement-text'; mT.textContent = m.inches; lC.appendChild(mT); const uT = createUnitToggle(m, mT); lC.appendChild(uT); item.appendChild(lC); const s = createQuantityStepper(0, MAX_REEL_QUANTITY); item.appendChild(s); listContainer.appendChild(item); });
    section.appendChild(listContainer); reelsVariationSectionsContainer.appendChild(section); selectBf.value = ''; selectGsm.value = ''; selectShade.value = '';
}

function initializeReelsPage() { populateVariationSelectors(); reelsVariationSectionsContainer.innerHTML = ''; if (paperMillSelect) paperMillSelect.value = ''; }

function displayOrderHistory() {
    if (!historyListEl) return; const h = loadOrders(); historyListEl.innerHTML = ''; if (h.length === 0) { historyListEl.innerHTML = '<li class="card"><p>No past orders found.</p></li>'; return; }
    h.forEach(o => { const li = document.createElement('li'); li.dataset.orderId = o.id; li.setAttribute('role', 'button'); li.setAttribute('tabindex', '0'); li.onclick = () => showHistoryDetails(o.id); li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') showHistoryDetails(o.id); }; const d = new Date(o.timestamp); const dS = d.toLocaleDateString('en-CA'); const tS = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'}); const sC = o.acknowledged ? 'acknowledged' : 'pending'; const sT = o.acknowledged ? 'Acknowledged' : 'Pending'; let tI = 0; let iL = 'items'; if (o.items?.length) { tI = o.items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0); if (o.type === 'Reels') iL = tI === 1 ? 'reel' : 'reels'; else iL = tI === 1 ? 'unit' : 'units'; } li.innerHTML = `<div class="history-item-header"><span class="date">${dS} ${tS}</span><span class="status ${sC}">${sT}</span></div><div class="history-item-details">Type: <strong>${o.type}</strong> | Mill: <span class="mill">${o.mill || 'N/A'}</span> | Total: ${tI} ${iL}</div>`; historyListEl.appendChild(li); });
}

function showPage(pageId) {
    const headerElement = document.querySelector('header');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage && headerElement) {
        targetPage.classList.add('active');
        headerElement.style.display = (pageId === 'landing-page') ? '' : 'none';
        const updateSection = document.querySelector('.update-section');
        if (updateSection) updateSection.style.display = (pageId === 'landing-page') ? '' : 'none';
        if (pageId === 'reels-page') initializeReelsPage(); else if (pageId === 'history-page') displayOrderHistory();
        window.scrollTo(0, 0);
    } else {
        console.error(`Page ${pageId} or header not found.`);
        const landingPage = document.getElementById('landing-page'); if (landingPage) landingPage.classList.add('active');
        if (headerElement) headerElement.style.display = '';
        const updateSection = document.querySelector('.update-section'); if (updateSection) updateSection.style.display = '';
    }
}

function formatOrderSummary(orderData) { // For initial share
    const d = new Date(orderData.timestamp); const dS = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); const tS = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'}); let s = `--- ${orderData.type.toUpperCase()} ORDER --- (${dS} ${tS})\n`; s += `Mill: ${orderData.mill || 'N/A'}\n`; s += `==============================\n\n`;
    if (orderData.type === 'Reels' && orderData.items?.length) { const g = orderData.items.reduce((a, i) => { const k = `BF:${i.bf || 'N/A'} | GSM:${i.gsm || 'N/A'} | Shade:${i.shade || 'N/A'}`; if (!a[k]) a[k] = []; a[k].push({ m: i.measurementTextWithUnit, q: i.quantity }); return a; }, {}); for (const k in g) { s += `--- ${k} ---\n`; g[k].forEach(i => { s += `${i.m}: ${i.q} ${i.q === 1 ? 'reel' : 'reels'}\n`; }); s += `\n`; } }
    else if (orderData.items) { orderData.items.forEach(i => { s += `${i.name || 'Item'}: ${i.quantity || 0} ${i.quantity === 1 ? 'unit' : 'units'}\n`; }); }
    s += `==============================`; return s;
}

function generateOrder(orderType) {
    let orderItems = []; let hasItems = false; const millName = paperMillSelect?.value;
    if (orderType === 'Reels') {
        if (!millName) { alert('Please select a Paper Mill.'); return; } const sections = reelsVariationSectionsContainer.querySelectorAll('.variation-section'); if (!sections.length) { alert('Please add variation section(s).'); return; }
        sections.forEach(section => { const { bf, gsm, shade, variationId } = section.dataset; const items = section.querySelectorAll('.measurement-item'); items.forEach(item => { const qty = item.querySelector('.quantity-stepper')?.getValue() || 0; if (qty > 0) { hasItems = true; const { measurementId, unit: preferredUnit = 'in' } = item.dataset; const mData = measurements.find(m => m.id === measurementId); if (mData) { const txt = preferredUnit === 'cm' ? `${mData.cm} cm` : mData.inches; orderItems.push({ measurement: mData.inches, measurementCm: mData.cm, measurementTextWithUnit: txt, measurementId, bf, gsm, shade, quantity: qty, variationId, preferredUnit }); } else console.warn(`Data missing: ${measurementId}`); } }); });
    } else { alert(`${orderType} ordering not implemented.`); return; }
    if (!hasItems) { alert('Please add quantity > 0 for at least one item.'); return; }
    const orderData = { id: `order_${Date.now()}`, timestamp: Date.now(), type: orderType, mill: millName, items: orderItems, acknowledged: false, receivedDate: null };
    currentOrderSummary = formatOrderSummary(orderData); saveNewOrder(orderData);
    orderSummaryTextEl.textContent = currentOrderSummary; document.getElementById('modal-title').textContent = `${orderType} Order Summary`; orderModal.style.display = 'block';
    if (orderType === 'Reels') initializeReelsPage();
}

function shareOrderSummary() { if (!currentOrderSummary) return; const d = { title: `${document.getElementById('modal-title').textContent}`, text: currentOrderSummary }; if (navigator.share && navigator.canShare(d)) navigator.share(d).catch(e => { if (e.name !== 'AbortError') alert('Share failed.'); }); else alert('Web Share not supported.'); }

function showHistoryDetails(orderId) {
    const order = loadOrders().find(o => o.id === orderId); if (!order) { console.error("Order not found:", orderId); return; }
    currentHistoryOrderData = order; historyOrderIdInput.value = order.id; const d = new Date(order.timestamp); historyModalDate.textContent = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit'}); historyModalMill.textContent = order.mill || 'N/A'; historyReceivedDateInput.value = order.receivedDate || ''; historyReceivedDateInput.max = getTodayDateString(); historyItemDetailsList.innerHTML = '';
    if (order.items?.length) { const t = document.createElement('table'); t.innerHTML = `<thead><tr><th>Item</th><th>Ordered</th><th>Received</th></tr></thead><tbody></tbody>`; const b = t.querySelector('tbody'); order.items.forEach((item, idx) => { const r = document.createElement('tr'); r.dataset.itemIndex = idx; const c1 = document.createElement('td'); c1.className = 'item-desc'; if (order.type === 'Reels') c1.innerHTML = `<strong>${item.measurementTextWithUnit || item.measurement}</strong><br><small>BF: ${item.bf || 'N/A'} | GSM: ${item.gsm || 'N/A'} | Shade: ${item.shade || 'N/A'}</small>`; else c1.textContent = item.name || `Item ${idx + 1}`; const c2 = document.createElement('td'); c2.textContent = item.quantity || 0; const c3 = document.createElement('td'); const inp = document.createElement('input'); inp.type = 'number'; inp.min = 0; inp.max = (order.type === 'Reels') ? MAX_REEL_QUANTITY + 50 : 999; inp.value = item.receivedQuantity === undefined ? (item.quantity || 0) : (item.receivedQuantity || 0); inp.dataset.itemIndex = idx; inp.setAttribute('aria-label', `Received qty for ${item.measurementTextWithUnit || item.name || 'item ' + (idx+1)}`); c3.appendChild(inp); r.appendChild(c1); r.appendChild(c2); r.appendChild(c3); b.appendChild(r); }); historyItemDetailsList.appendChild(t); }
    else { historyItemDetailsList.innerHTML = '<p>No items found.</p>'; }
    historyDetailsModal.style.display = 'block';
}

function formatHistoryReceiptSummary(orderData) {
    if (!orderData) return "Error: No order data."; const d = new Date(orderData.timestamp); const dS = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); const rDS = orderData.receivedDate ? new Date(orderData.receivedDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'; let s = `--- ORDER RECEIPT STATUS ---\nOrder Date: ${dS}\nMill: ${orderData.mill || 'N/A'}\nReceived: ${rDS}\n==============================\n\n`; let diff = false;
    if (orderData.items?.length) { orderData.items.forEach(i => { const oQ = i.quantity || 0; const rQ = i.receivedQuantity === undefined ? '?' : (i.receivedQuantity || 0); const iD = (orderData.type === 'Reels') ? `${i.measurementTextWithUnit || i.measurement} (BF:${i.bf || 'N/A'}, GSM:${i.gsm || 'N/A'})` : (i.name || 'Item'); s += `${iD}\n  Ordered: ${oQ} | Received: ${rQ}`; if (rQ !== '?' && oQ != rQ) { s += ` <-- MISMATCH`; diff = true; } s += `\n\n`; }); }
    else { s += "No items.\n"; }
    s += `==============================\nStatus: `; if (diff) s += `Received w/ discrepancies.`; else if (orderData.receivedDate) s += `Received, quantities match.`; else s += `Pending receipt.`; return s;
}

function shareHistoryReceiptSummary() { if (!currentHistoryOrderData) { alert("Order details not loaded."); return; } const txt = formatHistoryReceiptSummary(currentHistoryOrderData); const d = { title: `Receipt Status - Order ${currentHistoryOrderData.id.substring(6, 12)}`, text: txt }; if (navigator.share && navigator.canShare(d)) navigator.share(d).catch(e => { if (e.name !== 'AbortError') alert('Share failed.'); }); else alert('Web Share not supported.'); }

function acknowledgeOrder() {
    const orderId = historyOrderIdInput.value; const receivedDate = historyReceivedDateInput.value; if (!receivedDate) { alert('Please select date received.'); historyReceivedDateInput.focus(); return; } const h = loadOrders(); const idx = h.findIndex(o => o.id === orderId); if (idx === -1) { alert('Error: Order not found.'); return; } const oTU = h[idx]; oTU.acknowledged = true; oTU.receivedDate = receivedDate; const inputs = historyItemDetailsList.querySelectorAll('input[type="number"]'); inputs.forEach(inp => { const iIdx = parseInt(inp.dataset.itemIndex); const rQty = parseInt(inp.value) || 0; if (oTU.items?.[iIdx]) oTU.items[iIdx].receivedQuantity = rQty; });
    if (updateOrderInStorage(oTU)) { closeModal('history-details-modal'); displayOrderHistory(); alert('Order acknowledged & saved!'); } else alert('Failed to save acknowledgment.');
}

function closeModal(modalId) { const m = document.getElementById(modalId); if (m) m.style.display = 'none'; }

// --- EVENT LISTENERS ---
document.getElementById('landing-page')?.addEventListener('click', function(event) {
    const item = event.target.closest('.landing-item'); const pageId = item?.dataset?.page;
    if (event.target.closest('#check-update-btn')) { return; } // Prevent nav on update btn click
    if (pageId) { showPage(pageId); } else if (item) { alert('Feature coming soon!'); }
});
document.addEventListener('click', function(event) { if (event.target.classList.contains('close')) event.target.closest('.modal')?.closeModal(event.target.closest('.modal').id); });
window.addEventListener('click', function(event) { if (event.target.classList.contains('modal')) closeModal(event.target.id); });

if (updateButton) { updateButton.addEventListener('click', () => { if (!navigator.serviceWorker?.controller) { updateStatusMsg.textContent = "Cannot check updates now."; updateStatusMsg.className = 'update-status error'; return; } updateButton.disabled = true; updateStatusMsg.textContent = "Checking..."; updateStatusMsg.className = 'update-status'; updateButton.querySelector('i')?.classList.add('fa-spin'); navigator.serviceWorker.controller.postMessage({ action: 'checkForUpdate' }); }); } else console.warn("Update button not found.");
if ('serviceWorker' in navigator) { navigator.serviceWorker.addEventListener('message', event => { if (event.data?.status === 'updateCheckComplete') { if(updateButton) { updateButton.disabled = false; updateButton.querySelector('i')?.classList.remove('fa-spin'); } if (event.data.success) { updateStatusMsg.textContent = "Update check complete. RELOAD page."; updateStatusMsg.className = 'update-status success'; } else { updateStatusMsg.textContent = `Update check failed: ${event.data.error || 'Unknown'}`; updateStatusMsg.className = 'update-status error'; } } }); }

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    showPage('landing-page');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').then(reg => console.log('SW registered:', reg.scope)).catch(err => { console.error('SW registration failed:', err); if(updateStatusMsg) { updateStatusMsg.textContent = "Cannot check updates (SW error)."; updateStatusMsg.className = 'update-status error'; } if(updateButton) updateButton.disabled = true; });
    } else { console.warn('Service Worker not supported.'); if(updateStatusMsg) { updateStatusMsg.textContent = "Cannot check updates (SW not supported)."; updateStatusMsg.className = 'update-status error'; } if(updateButton) updateButton.disabled = true; }
});