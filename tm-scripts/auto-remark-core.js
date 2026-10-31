
(function() {
    'use strict';

    let lastProcessedUnit = "";
    let dateFilled = false;

    // Location list sorted alphabetically (A-Z) for remarks
    const rawLocations = [
        'WESTMALL',
        'JURONG POINT',
        'PARKWAY PARADE',
        'WESTGATE',
        'PUNGGOL COAST MALL',
        'NORTHPOINT',
        'BUGIS JUNCTION',
        'SUNGEI KADUT L3',
        'ONLINE BUSINESS',
        'MEGASTORE',
        'CAUSEWAY POINT',
        'SUNGEI KADUT L8',
        'FUNAN',
        'HEEREN',
        'HOUGANG MALL',
        'LOT 1',
        'JALAN BESUT',
        'ESR CHAI CHEE',
        'TAMPINES MALL',
        'TECHUB',
        'ORCHARD',
        'VIVOCITY',
        'SUNTEC CITY',
        'GREAT WORLD CITY',
        'NGEE ANN CITY',
        'MILLENIA WALK',
        'JUNCTION 8',
        'PLAZA SINGAPURA',
        'CORPORATE',
        'SIN MING WAREHOUSE',
        'ANG MO KIO SHOWROOM'
    ];

    const locations = rawLocations.sort((a, b) => a.localeCompare(b));

    // Receiving Unit quick options
    const receiveUnitOptions = [
        'CASH SALES 零售客 (DJI)',
        'Best Denki',
        'Challenger',
        '(Courts) Singapore',
        'Gain city',
        'Harvey Norman',
        'Sprint-cass'
    ];

    // Helper to generate current YYMM dynamically
    function getCurrentYYMM() {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        return yy + mm;
    }

    // Helper to safely update input value and trigger Angular bindings
    function setNativeValue(element, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, value);
        } else {
            element.value = value;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Helper to simulate a carrier return (Enter key press)
    function simulateEnter(element) {
        if (!element) return;
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }

    function focusRemarkField(remarkInput) {
        if (!remarkInput) return;
        remarkInput.focus();
        const length = remarkInput.value.length;
        if (remarkInput.setSelectionRange) {
            remarkInput.setSelectionRange(length, length);
        }
    }

    // --- AUTO DATE-TIME PICKER LOGIC ---
    function autoSelectActualDeliveryDate() {
        if (dateFilled) return;

        const datePickerContainer = document.querySelector('nz-date-picker[name="ActualDeliveryDate"]') || document.querySelector('.ant-calendar-picker');
        if (!datePickerContainer) return;

        const dateInput = datePickerContainer.querySelector('input');
        if (!dateInput) return;

        if (dateInput.value && dateInput.value.trim() !== '') {
            dateFilled = true;
            return;
        }

        dateInput.click();

        setTimeout(() => {
            const buttons = Array.from(document.querySelectorAll('.ant-calendar-footer a, .ant-calendar-footer button, .ant-picker-footer a, .ant-picker-footer button'));

            const nowBtn = buttons.find(b => {
                const text = b.textContent.trim().toLowerCase();
                return text.includes('此刻') || text.includes('now') || text.includes('today');
            });

            if (nowBtn) {
                nowBtn.click();
            }

            setTimeout(() => {
                const confirmButtons = Array.from(document.querySelectorAll('.ant-calendar-footer a, .ant-calendar-footer button, .ant-picker-footer a, .ant-picker-footer button'));
                const confirmBtn = confirmButtons.find(b => {
                    const text = b.textContent.trim().toLowerCase();
                    return text.includes('确') || text.includes('认') || text.includes('定') || text === 'ok';
                });

                if (confirmBtn) {
                    confirmBtn.click();
                    dateFilled = true;
                }
            }, 120);
        }, 180);
    }

    function handleUnitChange(shouldFocus = false) {
        const receiveUnitWrapper = document.querySelector('app-inputtable-auto[name="rceiveUnit"]');
        const receiveUnitInput = receiveUnitWrapper ? receiveUnitWrapper.querySelector('input') : document.querySelector('input[name="rceiveUnit"]');
        const remarkInput = document.querySelector('input[name="remark"]');

        if (!receiveUnitInput || !remarkInput) return;

        const currentValue = (receiveUnitInput.value || "").trim();

        if (currentValue === "") {
            dateFilled = false;
            lastProcessedUnit = "";
            return;
        }

        const isExcluded = /SHOPEE|LAZADA|TIKTOK|AMAZON/i.test(currentValue);

        if (isExcluded) {
            const prefix = currentValue.includes('专卖店') ? 'XF' : 'INV';
            const yymm = getCurrentYYMM();
            if ((remarkInput.value || "").startsWith(`${prefix}-${yymm}-0`)) {
                setNativeValue(remarkInput, "");
            }
            lastProcessedUnit = currentValue;

            setTimeout(autoSelectActualDeliveryDate, 300);
            return;
        }

        if (currentValue === lastProcessedUnit && dateFilled) return;

        const prefix = currentValue.includes('专卖店') ? 'XF' : 'INV';
        const yymm = getCurrentYYMM();

        let existingRemark = remarkInput.value || "";
        let appendedPart = "";

        locations.forEach(loc => {
            if (existingRemark.includes(` ${loc}`)) {
                appendedPart = ` ${loc}`;
            }
        });

        const targetRemark = `${prefix}-${yymm}-0${appendedPart}`;

        setNativeValue(remarkInput, targetRemark);
        lastProcessedUnit = currentValue;

        if (shouldFocus) {
            focusRemarkField(remarkInput);
        }

        setTimeout(autoSelectActualDeliveryDate, 400);
    }

    // Inject dropdown with LEFT-aligned arrow into 收货单位 (receiveUnit)
    function injectReceiveUnitDropdown() {
        const receiveUnitWrapper = document.querySelector('app-inputtable-auto[name="rceiveUnit"]');
        const receiveUnitInput = receiveUnitWrapper ? receiveUnitWrapper.querySelector('input') : document.querySelector('input[name="rceiveUnit"]');

        if (!receiveUnitInput || document.getElementById('dji-receive-unit-wrapper')) return;

        const parent = receiveUnitInput.parentNode;

        const wrapper = document.createElement('div');
        wrapper.id = 'dji-receive-unit-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'block';
        wrapper.className = receiveUnitInput.className;


        receiveUnitInput.style.width = '100%';
        receiveUnitInput.style.setProperty('padding-left', '26px', 'important');
        receiveUnitInput.style.setProperty('box-sizing', 'border-box', 'important');

        parent.replaceChild(wrapper, receiveUnitInput);
        wrapper.appendChild(receiveUnitInput);

        // Dropdown arrow icon on the LEFT
        const iconBtn = document.createElement('span');
        iconBtn.innerHTML = '▼';
        iconBtn.style.position = 'absolute';
        iconBtn.style.left = '8px';
        iconBtn.style.top = '50%';
        iconBtn.style.transform = 'translateY(-50%)';
        iconBtn.style.cursor = 'pointer';
        iconBtn.style.fontSize = '9px';
        iconBtn.style.color = '#888';
        iconBtn.style.zIndex = '5';
        wrapper.appendChild(iconBtn);

        // Dropdown menu container
        const menu = document.createElement('div');
        menu.id = 'dji-receive-unit-menu';
        menu.style.display = 'none';
        menu.style.position = 'absolute';
        menu.style.top = '100%';
        menu.style.left = '0';
        menu.style.width = '100%';
        menu.style.backgroundColor = '#fff';
        menu.style.border = '1px solid #d5dce5';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        menu.style.zIndex = '9999';
        menu.style.marginTop = '2px';
        menu.style.maxHeight = '300px';
        menu.style.overflowY = 'auto';

        receiveUnitOptions.forEach(opt => {
            const item = document.createElement('div');
            item.textContent = opt;
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.style.fontSize = '12px';
            item.style.borderBottom = '1px solid #f0f0f0';

            item.onmouseover = () => { item.style.backgroundColor = '#f5f5f5'; };
            item.onmouseout = () => { item.style.backgroundColor = '#fff'; };

            item.onclick = (e) => {
                e.stopPropagation();
                setNativeValue(receiveUnitInput, opt);
                menu.style.display = 'none';
                handleUnitChange(true);
                simulateEnter(receiveUnitInput);
            };
            menu.appendChild(item);
        });

        wrapper.appendChild(menu);

        iconBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpening = menu.style.display !== 'block';
            menu.style.display = isOpening ? 'block' : 'none';
        };

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }

    // Inject dropdown inside remark container (Right-aligned arrow)
    function injectInFieldDropdown() {
        const remarkInput = document.querySelector('input[name="remark"]');
        if (!remarkInput || document.getElementById('dji-remark-wrapper')) return;

        const parent = remarkInput.parentNode;

        const wrapper = document.createElement('div');
        wrapper.id = 'dji-remark-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'block';
        wrapper.className = remarkInput.className;

        remarkInput.style.width = '100%';
        remarkInput.style.setProperty('padding-left', '26px', 'important');
        remarkInput.style.setProperty('box-sizing', 'border-box', 'important');

        parent.replaceChild(wrapper, remarkInput);
        wrapper.appendChild(remarkInput);

        const iconBtn = document.createElement('span');
        iconBtn.innerHTML = '▼';
        iconBtn.style.position = 'absolute';
        iconBtn.style.left = '8px';
        iconBtn.style.top = '50%';
        iconBtn.style.transform = 'translateY(-50%)';
        iconBtn.style.cursor = 'pointer';
        iconBtn.style.fontSize = '9px';
        iconBtn.style.color = '#888';
        wrapper.appendChild(iconBtn);

        const menu = document.createElement('div');
        menu.id = 'dji-remark-menu';
        menu.style.display = 'none';
        menu.style.position = 'absolute';
        menu.style.top = '100%';
        menu.style.left = '0';
        menu.style.width = '100%';
        menu.style.backgroundColor = '#fff';
        menu.style.border = '1px solid #d5dce5';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        menu.style.zIndex = '9999';
        menu.style.marginTop = '2px';
        menu.style.maxHeight = '240px';
        menu.style.overflowY = 'auto';

        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = '🔍 Search location...';
        searchBox.style.width = '100%';
        searchBox.style.padding = '6px 10px';
        searchBox.style.border = 'none';
        searchBox.style.borderBottom = '1px solid #d5dce5';
        searchBox.style.outline = 'none';
        searchBox.style.fontSize = '12px';
        searchBox.style.boxSizing = 'border-box';
        searchBox.style.position = 'sticky';
        searchBox.style.top = '0';
        searchBox.style.backgroundColor = '#fff';
        searchBox.style.zIndex = '10';

        menu.appendChild(searchBox);

        const listContainer = document.createElement('div');
        menu.appendChild(listContainer);

        function renderItems(filterText = '') {
            listContainer.innerHTML = '';
            const filtered = locations.filter(loc => loc.toLowerCase().includes(filterText.toLowerCase()));

            if (filtered.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = 'No matching location';
                empty.style.padding = '8px 12px';
                empty.style.fontSize = '12px';
                empty.style.color = '#999';
                listContainer.appendChild(empty);
                return;
            }

            filtered.forEach(loc => {
                const item = document.createElement('div');
                item.textContent = loc;
                item.style.padding = '8px 12px';
                item.style.cursor = 'pointer';
                item.style.fontSize = '12px';
                item.style.borderBottom = '1px solid #f0f0f0';

                item.onmouseover = () => { item.style.backgroundColor = '#f5f5f5'; };
                item.onmouseout = () => { item.style.backgroundColor = '#fff'; };

                item.onclick = (e) => {
                    e.stopPropagation();
                    let currentVal = remarkInput.value || '';

                    locations.forEach(l => {
                        const escapedLoc = l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        currentVal = currentVal.replace(new RegExp(`\\s*-\\s*${escapedLoc}`, 'g'), '');
                        currentVal = currentVal.replace(new RegExp(`\\s+${escapedLoc}`, 'g'), '');
                    });

                    const newVal = `${currentVal.trim()} ${loc}`;
                    setNativeValue(remarkInput, newVal);
                    menu.style.display = 'none';
                    focusRemarkField(remarkInput);

                    setTimeout(() => {
                        autoSelectActualDeliveryDate();
                        simulateEnter(remarkInput);
                    }, 300);
                };
                listContainer.appendChild(item);
            });
        }

        renderItems();

        searchBox.addEventListener('input', (e) => {
            renderItems(e.target.value);
        });

        searchBox.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        wrapper.appendChild(menu);

        const toggleMenu = (e) => {
            e.stopPropagation();
            const isOpening = menu.style.display !== 'block';
            menu.style.display = isOpening ? 'block' : 'none';

            if (isOpening) {
                searchBox.value = '';
                renderItems('');
                setTimeout(() => searchBox.focus(), 50);
            }
        };

        iconBtn.onclick = toggleMenu;

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }

    // Intercept Save Button Clicks to Validate Remark Length
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button, nz-button, a');
        if (!target) return;

        const text = target.textContent.trim().toLowerCase();
        const isSaveButton = text.includes('保存') || text.includes('save') || text.includes('提交') || text.includes('submit');

        if (isSaveButton) {
            const receiveUnitWrapper = document.querySelector('app-inputtable-auto[name="rceiveUnit"]');
            const receiveUnitInput = receiveUnitWrapper ? receiveUnitWrapper.querySelector('input') : document.querySelector('input[name="rceiveUnit"]');
            const currentValue = receiveUnitInput ? (receiveUnitInput.value || "").trim() : "";

            const isExcluded = /SHOPEE|LAZADA|TIKTOK|AMAZON/i.test(currentValue);

            if (!isExcluded && currentValue !== "") {
                const remarkInput = document.querySelector('input[name="remark"]');
                if (remarkInput) {
                    const remarkValue = (remarkInput.value || "").trim();
                    if (remarkValue.length < 10) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        alert('🔴 Check invoice number \n🔴 检查单号是否真确');
                        focusRemarkField(remarkInput);
                    }
                }
            }
        }
    }, true);

    // Reset check loop
    setInterval(() => {
        const receiveUnitWrapper = document.querySelector('app-inputtable-auto[name="rceiveUnit"]');
        const receiveUnitInput = receiveUnitWrapper ? receiveUnitWrapper.querySelector('input') : document.querySelector('input[name="rceiveUnit"]');
        const datePickerInput = document.querySelector('nz-date-picker[name="ActualDeliveryDate"] input');

        if ((receiveUnitInput && receiveUnitInput.value.trim() === "") || (datePickerInput && datePickerInput.value.trim() === "")) {
            dateFilled = false;
            if (receiveUnitInput && receiveUnitInput.value.trim() === "") {
                lastProcessedUnit = "";
            }
        }
    }, 500);

    // Event listeners
    document.addEventListener('change', (e) => {
        if (e.target && (e.target.closest('app-inputtable-auto[name="rceiveUnit"]') || e.target.name === 'rceiveUnit')) {
            setTimeout(() => handleUnitChange(true), 250);
        }
    });

    document.addEventListener('click', (e) => {
        const isReceiveUnitInput = e.target && (e.target.closest('app-inputtable-auto[name="rceiveUnit"]') || e.target.name === 'rceiveUnit');

        setTimeout(() => {
            handleUnitChange(!isReceiveUnitInput);
            injectReceiveUnitDropdown();
            injectInFieldDropdown();
        }, 250);
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            setTimeout(() => handleUnitChange(false), 300);
        }
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            injectReceiveUnitDropdown();
            injectInFieldDropdown();
        }, 1000);
    });

})();
