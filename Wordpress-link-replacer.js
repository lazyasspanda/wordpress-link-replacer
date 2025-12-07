// ==UserScript==
// @name         WordPress Link Tagger - FINAL v3.0
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Complete GA4 link tagger with redirect + manual order
// @author       You
// @match        https://dealer*.dealeron.com/*
// @match        https://*.dealeron.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let buttonInjected = false;

    function injectButton() {
        const settingsDiv = document.querySelector('.editor-header__settings');
        if (!settingsDiv || buttonInjected) return;

        const button = document.createElement('a');
        button.className = 'components-button is-compact has-icon wp-link-tagger-btn';
        button.href = '#';
        button.style.cssText = 'margin-right: 8px; display: flex; align-items: center; gap: 6px;';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
            </svg>
            <span style="font-size: 13px;">Update Links</span>
        `;
        button.onclick = (e) => {
            e.preventDefault();
            handleIframeLinks();
        };

        settingsDiv.insertBefore(button, settingsDiv.firstChild);
        console.log('✅ Update Links button injected!');
        buttonInjected = true;
    }

    async function handleIframeLinks() {
        console.log('🔗 Scanning IFRAME editor...');

        const iframe = document.querySelector('iframe[name="editor-canvas"]');
        if (!iframe || !iframe.contentDocument) {
            console.log('❌ No iframe');
            return;
        }

        const iframeDoc = iframe.contentDocument;
        const editables = iframeDoc.querySelectorAll('.block-editor-rich-text__editable');

        const links = [];
        editables.forEach(editable => {
            const foundLinks = editable.querySelectorAll('a[href]');
            foundLinks.forEach(link => {
                const text = link.textContent.trim();
                const href = link.getAttribute('href');
                const isTagged = link.hasAttribute('data-dotagging-event');
                if (text.length > 0 && href && !isTagged) {
                    console.log(`  ✅ Link: "${text}" -> ${href}`);
                    links.push({
                        element: link,
                        text: text,
                        href: href,
                        index: links.length,
                        editable: editable,
                        iframeDoc: iframeDoc,
                        block: editable.closest('.block-editor-block-list__block'),
                        originalHTML: link.outerHTML
                    });
                }
            });
        });

        if (links.length === 0) {
            alert('No untagged links found!');
            return;
        }

        showModal(links, iframeDoc);
    }

    function showModal(links, iframeDoc) {
        const modal = document.createElement('div');
        modal.id = 'wp-link-tagger-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 999999; display: flex;
            align-items: center; justify-content: center; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 8px; max-width: 900px; max-height: 90vh; overflow-y: auto; min-width: 700px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 20px; color: #1e1e1e;">🔗 Update ${links.length} Links</h3>
                    <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0 8px;">×</button>
                </div>
                <div id="links-container" style="max-height: 60vh; overflow-y: auto;"></div>
                <div style="margin-top: 25px; text-align: right; border-top: 1px solid #eee; padding-top: 20px;">
                    <button id="cancel-btn" class="components-button is-secondary" style="margin-right: 10px;">Cancel</button>
                    <button id="save-btn" class="components-button is-primary" style="padding: 10px 24px;">Save All Links</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const container = modal.querySelector('#links-container');
        links.forEach((link, idx) => {
            const linkDiv = document.createElement('div');
            linkDiv.style.cssText = 'border: 1px solid #eee; border-radius: 6px; padding: 20px; margin-bottom: 20px; background: #fafafa;';
            linkDiv.innerHTML = `
                <div style="font-weight: 600; color: #1e1e1e; margin-bottom: 15px; font-size: 16px;">
                    Link #${idx}
                    <span style="font-weight: 400; color: #666; font-size: 14px;">
                        (${link.text.substring(0, 50)}${link.text.length > 50 ? '...' : ''})
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 15px; align-items: end;">
                    <div>
                        <label style="display: block; font-size: 14px; color: #666; margin-bottom: 5px;">GA4 Type</label>
                        <select class="ga4-type" data-link-idx="${idx}" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="open">ga4-hyperlink-open</option>
                            <option value="search">ga4-hyperlink-search</option>
                            <option value="redirect">ga4-hyperlink-redirect</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 14px; color: #666; margin-bottom: 5px;">Order</label>
                        <input type="number" class="order-num" data-link-idx="${idx}" value="${idx}" min="0"
                               style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 14px; color: #666; margin-bottom: 5px;">New URL</label>
                        <input type="url" class="new-url" data-link-idx="${idx}" value="${link.href}"
                               style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    </div>
                </div>
            `;
            container.appendChild(linkDiv);
        });

        modal.querySelector('#close-modal').onclick = () => modal.remove();
        modal.querySelector('#cancel-btn').onclick = () => modal.remove();
        modal.querySelector('#save-btn').onclick = async () => await processLinks(links, modal, iframeDoc);
    }

    async function processLinks(links, modal, iframeDoc) {
        console.log('🚀 Starting...');
        modal.querySelector('#save-btn').textContent = 'Processing...';
        modal.querySelector('#save-btn').disabled = true;

        const configs = {};
        document.querySelectorAll('.ga4-type, .order-num, .new-url').forEach(el => {
            const idx = parseInt(el.dataset.linkIdx);
            if (!configs[idx]) configs[idx] = {};
            configs[idx][el.className] = el.value;
        });

        // Close modal FIRST
        modal.remove();

        for (const linkData of links) {
            const config = configs[linkData.index];
            if (!config) continue;

            console.log(`\n📝 === LINK ${linkData.index}: "${linkData.text}" ===`);

            // STEP 1: Click paragraph
            console.log('1️⃣ Clicking paragraph...');
            linkData.editable.click();
            linkData.editable.focus();
            await sleep(700);

            // STEP 2: Find Options button
            console.log('2️⃣ Finding Options button...');
            let optionsButton = document.querySelector('.block-editor-block-settings-menu .components-dropdown-menu__toggle[aria-label="Options"]');
            console.log('Options:', optionsButton);

            if (optionsButton) {
                // STEP 3: Click Options
                console.log('3️⃣ Clicking Options...');
                optionsButton.click();
                await sleep(500);

                // STEP 4: Find Edit as HTML
                console.log('4️⃣ Finding Edit as HTML...');
                let editHtmlButton = Array.from(document.querySelectorAll('[role="menuitem"]'))
                    .find(item => item.textContent.includes('Edit as HTML'));
                console.log('Edit as HTML:', editHtmlButton);

                if (editHtmlButton) {
                    // STEP 5: Click Edit as HTML
                    console.log('5️⃣ Clicking Edit as HTML...');
                    editHtmlButton.click();
                    await sleep(1000);

                    // STEP 6: Find textarea
                    console.log('6️⃣ Finding textarea...');
                    let htmlTextarea = iframeDoc.querySelector('textarea.block-editor-block-list__block-html-textarea') ||
                                      iframeDoc.querySelector('.block-editor-block-list__block.is-selected textarea') ||
                                      iframeDoc.querySelector('textarea[class*="html"]') ||
                                      iframeDoc.querySelector('.is-selected textarea');

                    console.log('Textarea:', htmlTextarea);

                    if (htmlTextarea) {
                        // STEP 7: Replace with PROPER React input simulation
                        console.log('7️⃣ Replacing link...');
                        const currentHTML = htmlTextarea.value;
                        console.log('BEFORE:', currentHTML.substring(0, 150));

                        let newLinkHTML;
                        if (config['ga4-type'] === 'redirect') {
                            newLinkHTML = `<a href="${config['new-url']}" data-dotagging-link-url="${config['new-url']}" data-dotagging-event="cta_interaction" data-dotagging-product-name="Website|Custom Content" data-dotagging-event-action-result="redirect" data-dotagging-element-type="body" data-dotagging-element-order="${config['order-num']}" data-dotagging-element-subtype="hyperlink" target="_blank" rel="noopener noreferrer">${linkData.text}</a>`;
                        } else {
                            newLinkHTML = `<a href="${config['new-url']}" data-dotagging-link-url="${config['new-url']}" data-dotagging-event="cta_interaction" data-dotagging-product-name="Website|Custom Content" data-dotagging-event-action-result="${config['ga4-type']}" data-dotagging-element-type="body" data-dotagging-element-order="${config['order-num']}" data-dotagging-element-subtype="hyperlink">${linkData.text}</a>`;
                        }

                        const newHTML = currentHTML.replace(linkData.originalHTML, newLinkHTML);

                        // PROPER REACT STATE UPDATE
                        setNativeValue(htmlTextarea, newHTML);

                        console.log('AFTER:', newHTML.substring(0, 150));

                        // STEP 8: COMMIT - blur and click elsewhere
                        console.log('8️⃣ Committing changes...');
                        htmlTextarea.blur();
                        await sleep(300);

                        // Click body to deselect and commit
                        iframeDoc.body.click();
                        await sleep(500);

                        console.log('✅ DONE - Changes committed!');
                    } else {
                        console.log('❌ Textarea not found');
                    }
                } else {
                    console.log('❌ Edit as HTML not found');
                }
            } else {
                console.log('❌ Options not found');
            }

            await sleep(500);
        }

        console.log('\n🎉 ALL LINKS PROCESSED!');
        alert('✅ Links updated! Changes are committed.\n\nClick "Save" to save the post.');
    }

    // CRITICAL: Properly set value for React-controlled inputs
    function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }

        // Trigger ALL necessary events
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
        element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const init = setInterval(injectButton, 500);
    setTimeout(() => clearInterval(init), 30000);
})();
