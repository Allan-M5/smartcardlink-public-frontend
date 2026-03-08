
(function () {
    'use strict';

    const API_ROOT = (function () {
        const host = (window.location && window.location.hostname) || '';
        const protocol = (window.location && window.location.protocol) || '';
        if (protocol === 'file:' || host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:8080';
        }
        return 'https://smartcardlink-api.onrender.com';
    })();

    const DEFAULT_THEME = '#FFD700';

    const el = function (id) {
        return document.getElementById(id);
    };

    const state = {
        client: null,
        showQr: false,
        longPressTimer: null,
        overlay: null
    };

    const vcardContainer = el('vcard');
    const popup1 = el('popup1');
    const popup2 = el('popup2');
    const photoArea = el('photoArea');
    const fullName = el('fullName');
    const jobName = el('jobName');
    const titlePosition = el('titlePosition');
    const phoneMain = el('phoneMain');
    const emailMain = el('emailMain');
    const phoneList = el('phoneList');
    const emailList = el('emailList');
    const phoneDropdownBtn = el('phoneDropdownBtn');
    const emailDropdownBtn = el('emailDropdownBtn');
    const bioText = el('bioText');
    const liveTime = el('liveTime');
    const hoursTableBody = document.querySelector('#hoursTable tbody');

    const actions = {
        call: el('callBtn'),
        sms: el('smsBtn'),
        wa: el('waBtn'),
        mail: el('mailBtn'),
        print: el('printBtn'),
        save: el('saveBtn')
    };

    const buttons = {
        moreInfo: el('moreInfoBtn'),
        back: el('backBtn'),
        book: el('bookAppointmentBtn'),
        business: el('businessWebsite'),
        portfolio: el('portfolioWebsite'),
        location: el('locationMap'),
        physical: el('physicalAddress'),
        facebook: el('facebookBtn'),
        instagram: el('instagramBtn'),
        x: el('xBtn'),
        linkedin: el('linkedinBtn'),
        tiktok: el('tiktokBtn'),
        youtube: el('youtubeBtn')
    };

    function normalizeColor(value) {
        const color = String(value || '').trim();
        return /^#[0-9A-Fa-f]{6}$/.test(color) ? color.toUpperCase() : DEFAULT_THEME;
    }

    function setHidden(node, hidden) {
        if (!node) return;
        if (hidden) {
            node.setAttribute('hidden', '');
            node.setAttribute('aria-hidden', 'true');
        } else {
            node.removeAttribute('hidden');
            node.setAttribute('aria-hidden', 'false');
        }
    }

    function setText(node, value, fallback) {
        if (!node) return;
        node.textContent = String(value || fallback || '');
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showMessage(message, isError) {
        if (!vcardContainer) return;
        setHidden(popup1, true);
        setHidden(popup2, true);

        let box = el('messageArea');
        if (!box) {
            box = document.createElement('div');
            box.id = 'messageArea';
            box.style.padding = '28px 18px';
            box.style.textAlign = 'center';
            box.style.fontFamily = 'Inter, sans-serif';
            box.style.fontWeight = '700';
            box.style.letterSpacing = '0.2px';
            vcardContainer.prepend(box);
        }

        box.style.color = isError ? '#ef4444' : 'var(--theme-color, #FFD700)';
        box.innerHTML = '<h3 style="font-size:18px;">' + escapeHtml(message) + '</h3>';
        setHidden(box, false);
    }

    function hideMessage() {
        const box = el('messageArea');
        if (box) {
            setHidden(box, true);
        }
    }

    function applyTheme(color) {
        const theme = normalizeColor(color);
        document.documentElement.style.setProperty('--theme-color', theme);

        let styleTag = el('smartcard-theme-override');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'smartcard-theme-override';
            document.head.appendChild(styleTag);
        }

        styleTag.textContent =
            '.full-name, .job-name, .title-position, .contact-primary, .about-title, .bio-label, .contact-label, .dropdown-btn i {' +
                'color: ' + theme + ' !important;' +
            '}' +
            '.vcard::before {' +
                'box-shadow: 0 0 15px 2px ' + theme + ', 0 0 30px 5px ' + theme + ' !important;' +
            '}' +
            '.vcard::after {' +
                'border-color: ' + theme + ' !important; box-shadow: inset 0 0 15px ' + theme + ' !important;' +
            '}' +
            '.about-header, .about-bio-box {' +
                'background: ' + theme + ' !important; color: #ffffff !important;' +
            '}' +
            '.about-header .about-title, .about-header .bio-label, .about-header .bio-text {' +
                'color: #ffffff !important;' +
            '}' +
            '#hoursTable thead tr, #hoursTable thead th {' +
                'background: ' + theme + ' !important; color: #ffffff !important;' +
            '}' +
            '.action-btn, .more-info-btn, .back-btn, .book-btn, .link-btn, .social-btn {' +
                'border-color: ' + theme + ' !important;' +
            '}' +
            '.photo-area {' +
                'border-bottom-color: ' + theme + ' !important;' +
            '}' +
            '.swipe-hint, .qr-panel-label {' +
                'background: rgba(0,0,0,0.62); color: ' + theme + ' !important; border: 1px solid ' + theme + ' !important;' +
            '}';
    }

    function getSlug() {
        const params = new URLSearchParams(window.location.search);
        const querySlug = params.get('slug');
        if (querySlug) return querySlug;

        const path = String(window.location.pathname || '').split('/').filter(Boolean);
        const last = path[path.length - 1] || '';
        if (last && !/\.html?$/i.test(last)) {
            return last;
        }
        return '';
    }

    async function fetchProfileData() {
        const slug = getSlug();
        if (!slug) {
            showMessage('VCard Identifier not found.', true);
            return null;
        }

        try {
            showMessage('Loading professional vCard...', false);

            const response = await fetch(API_ROOT + '/api/vcard/' + encodeURIComponent(slug), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const json = await response.json().catch(function () {
                return {};
            });

            if (!response.ok || !json || json.status !== 'success' || !json.data) {
                throw new Error((json && json.message) || 'Card not found.');
            }

            hideMessage();
            return json.data;
        } catch (error) {
            showMessage(error.message || 'Failed to load card.', true);
            return null;
        }
    }

    function buildList(container, items, formatter) {
        if (!container) return;
        container.innerHTML = '';
        const usable = (items || []).filter(Boolean);
        if (!usable.length) {
            container.hidden = true;
            return;
        }

        usable.forEach(function (item) {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'dropdown-item';
            row.textContent = formatter.label(item);
            row.addEventListener('click', formatter.action(item));
            container.appendChild(row);
        });
    }

    function setupDropdown(button, container) {
        if (!button || !container) return;
        button.addEventListener('click', function () {
            const willOpen = container.hidden;
            container.hidden = !willOpen;
            button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });
    }

    function wireLinkButton(button, url, emptyMessage) {
        if (!button) return;
        const clean = String(url || '').trim();

        if (!clean) {
            button.disabled = true;
            button.classList.add('disabled');
            button.onclick = function () {
                alert(emptyMessage || 'Not provided');
            };
            return;
        }

        button.disabled = false;
        button.classList.remove('disabled');
        button.onclick = function () {
            window.open(clean, '_blank', 'noopener,noreferrer');
        };
    }

    function alert(message) {
        if (typeof window.Swal !== 'undefined') {
            window.Swal.fire({
                title: message,
                icon: 'info',
                confirmButtonColor: normalizeColor(state.client && state.client.themeColor)
            });
            return;
        }
        window.alert(message);
    }

    function sanitizePhone(phone) {
        return String(phone || '').replace(/[^\d+]/g, '');
    }

    function setupActions(client) {
        const phone = client.phone1 || '';
        const email = client.email1 || '';
        const whatsappPhone = sanitizePhone(phone).replace(/^\+/, '');

        if (actions.call) {
            actions.call.onclick = phone ? function () {
                window.location.href = 'tel:' + phone;
            } : function () {
                alert('Phone number not provided');
            };
            actions.call.classList.toggle('disabled', !phone);
        }

        if (actions.sms) {
            actions.sms.onclick = phone ? function () {
                window.location.href = 'sms:' + phone;
            } : function () {
                alert('Phone number not provided');
            };
            actions.sms.classList.toggle('disabled', !phone);
        }

        if (actions.wa) {
            actions.wa.onclick = phone ? function () {
                window.open('https://wa.me/' + whatsappPhone, '_blank', 'noopener,noreferrer');
            } : function () {
                alert('WhatsApp number not provided');
            };
            actions.wa.classList.toggle('disabled', !phone);
        }

        if (actions.mail) {
            actions.mail.onclick = email ? function () {
                window.location.href = 'mailto:' + email;
            } : function () {
                alert('Email not provided');
            };
            actions.mail.classList.toggle('disabled', !email);
        }

        if (actions.print) {
            actions.print.onclick = function () {
                window.print();
            };
        }

        if (actions.save) {
            actions.save.onclick = function () {
                const assetUrl = client.vcardAssetUrl || client.vcardFileUrl || client.vcfUrl || '';
                if (!assetUrl) {
                    alert('Contact file is not available yet.');
                    return;
                }

                const anchor = document.createElement('a');
                anchor.href = assetUrl;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.download = (client.slug || client.fullName || 'smartcardlink-contact') + '.vcf';
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
            };
        }
    }

    function renderHours(hours) {
        if (!hoursTableBody) return;
        hoursTableBody.innerHTML = '';

        const rows = [
            { day: 'Mon-Fri', start: hours && hours.monFriStart, end: hours && hours.monFriEnd },
            { day: 'Saturday', start: hours && hours.satStart, end: hours && hours.satEnd },
            { day: 'Sunday', start: hours && hours.sunStart, end: hours && hours.sunEnd }
        ];

        rows.forEach(function (rowData) {
            const row = document.createElement('tr');

            const day = document.createElement('td');
            day.textContent = rowData.day;

            const start = document.createElement('td');
            start.textContent = rowData.start || '--';

            const end = document.createElement('td');
            end.textContent = rowData.end || '--';

            row.appendChild(day);
            row.appendChild(start);
            row.appendChild(end);
            hoursTableBody.appendChild(row);
        });
    }

    function updateLiveTime() {
        if (!liveTime) return;
        const now = new Date();
        liveTime.textContent = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function createFullscreenOverlay(src) {
        if (!src) return;

        if (!state.overlay) {
            const overlay = document.createElement('div');
            overlay.id = 'photoFullscreenOverlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0, 0, 0, 0.92)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.padding = '18px';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'zoom-out';
            overlay.hidden = true;

            const img = document.createElement('img');
            img.id = 'photoFullscreenImage';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '12px';
            img.style.boxShadow = '0 0 25px rgba(255,255,255,0.12)';
            overlay.appendChild(img);

            overlay.addEventListener('click', function () {
                overlay.hidden = true;
            });

            document.body.appendChild(overlay);
            state.overlay = overlay;
        }

        const image = state.overlay.querySelector('#photoFullscreenImage');
        image.src = src;
        state.overlay.hidden = false;
    }

    function renderPhotoAndQr(client) {
        if (!photoArea) return;

        photoArea.innerHTML = '';

        const shell = document.createElement('div');
        shell.className = 'photo-swipe-shell';
        shell.style.width = '100%';
        shell.style.height = '100%';
        shell.style.position = 'relative';
        shell.style.overflow = 'hidden';

        const track = document.createElement('div');
        track.className = 'photo-swipe-track';
        track.style.width = '200%';
        track.style.height = '100%';
        track.style.display = 'flex';
        track.style.transition = 'transform 0.35s ease';
        track.style.transform = state.showQr ? 'translateX(-50%)' : 'translateX(0)';

        const photoPane = document.createElement('div');
        photoPane.className = 'photo-panel';
        photoPane.style.width = '50%';
        photoPane.style.height = '100%';
        photoPane.style.position = 'relative';
        photoPane.style.background = '#000';
        photoPane.style.display = 'flex';
        photoPane.style.alignItems = 'center';
        photoPane.style.justifyContent = 'center';

        const qrPane = document.createElement('div');
        qrPane.className = 'qr-panel';
        qrPane.style.width = '50%';
        qrPane.style.height = '100%';
        qrPane.style.position = 'relative';
        qrPane.style.background = '#050505';
        qrPane.style.display = 'flex';
        qrPane.style.alignItems = 'center';
        qrPane.style.justifyContent = 'center';

        const hint = document.createElement('div');
        hint.className = 'swipe-hint';
        hint.textContent = 'Swipe or tap photo to reveal QR';
        hint.style.position = 'absolute';
        hint.style.left = '12px';
        hint.style.bottom = '12px';
        hint.style.padding = '6px 10px';
        hint.style.borderRadius = '999px';
        hint.style.fontSize = '12px';
        hint.style.fontWeight = '700';
        photoPane.appendChild(hint);

        if (client.photoUrl) {
            const img = document.createElement('img');
            img.src = client.photoUrl;
            img.alt = client.fullName || 'Profile Photo';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.draggable = false;

            let pointerStart = 0;
            let moved = false;

            const startPress = function (pageX) {
                pointerStart = pageX || 0;
                moved = false;
                clearTimeout(state.longPressTimer);
                state.longPressTimer = window.setTimeout(function () {
                    createFullscreenOverlay(client.photoUrl);
                }, 450);
            };

            const movePress = function (pageX) {
                if (Math.abs((pageX || 0) - pointerStart) > 10) {
                    moved = true;
                    clearTimeout(state.longPressTimer);
                }
            };

            const endPress = function (pageX) {
                clearTimeout(state.longPressTimer);
                const delta = (pageX || 0) - pointerStart;
                if (Math.abs(delta) > 50) {
                    state.showQr = delta < 0;
                    track.style.transform = state.showQr ? 'translateX(-50%)' : 'translateX(0)';
                    return;
                }
                if (!moved) {
                    state.showQr = !state.showQr;
                    track.style.transform = state.showQr ? 'translateX(-50%)' : 'translateX(0)';
                }
            };

            img.addEventListener('mousedown', function (event) {
                startPress(event.pageX);
            });
            img.addEventListener('mousemove', function (event) {
                movePress(event.pageX);
            });
            img.addEventListener('mouseup', function (event) {
                endPress(event.pageX);
            });
            img.addEventListener('mouseleave', function () {
                clearTimeout(state.longPressTimer);
            });
            img.addEventListener('touchstart', function (event) {
                startPress(event.touches[0].clientX);
            }, { passive: true });
            img.addEventListener('touchmove', function (event) {
                movePress(event.touches[0].clientX);
            }, { passive: true });
            img.addEventListener('touchend', function (event) {
                const changed = event.changedTouches[0];
                endPress(changed ? changed.clientX : 0);
            });

            photoPane.appendChild(img);
        } else {
            const empty = document.createElement('div');
            empty.className = 'not-provided';
            empty.textContent = 'Photo not provided';
            photoPane.appendChild(empty);
        }

        const qrLabel = document.createElement('div');
        qrLabel.className = 'qr-panel-label';
        qrLabel.textContent = 'Tap or swipe back to photo';
        qrLabel.style.position = 'absolute';
        qrLabel.style.left = '12px';
        qrLabel.style.bottom = '12px';
        qrLabel.style.padding = '6px 10px';
        qrLabel.style.borderRadius = '999px';
        qrLabel.style.fontSize = '12px';
        qrLabel.style.fontWeight = '700';
        qrPane.appendChild(qrLabel);

        if (client.qrCodeUrl) {
            const qr = document.createElement('img');
            qr.src = client.qrCodeUrl;
            qr.alt = 'QR Code';
            qr.style.width = '78%';
            qr.style.maxWidth = '220px';
            qr.style.height = 'auto';
            qr.style.objectFit = 'contain';
            qr.draggable = false;
            qrPane.appendChild(qr);
        } else {
            const qrEmpty = document.createElement('div');
            qrEmpty.className = 'not-provided';
            qrEmpty.textContent = 'QR will appear after activation';
            qrPane.appendChild(qrEmpty);
        }

        qrPane.addEventListener('click', function () {
            state.showQr = false;
            track.style.transform = 'translateX(0)';
        });

        track.appendChild(photoPane);
        track.appendChild(qrPane);
        shell.appendChild(track);
        photoArea.appendChild(shell);
    }

    function setupInfoButtons(client) {
        wireLinkButton(buttons.business, client.businessWebsite, 'Business website not provided');
        wireLinkButton(buttons.portfolio, client.portfolioWebsite, 'Portfolio website not provided');
        wireLinkButton(buttons.location, client.locationMap, 'Location map not provided');

        if (buttons.physical) {
            const address = String(client.address || '').trim();
            buttons.physical.disabled = !address;
            buttons.physical.classList.toggle('disabled', !address);
            buttons.physical.onclick = address ? function () {
                alert(address);
            } : function () {
                alert('Physical address not provided');
            };
        }

        wireLinkButton(buttons.facebook, client.socialLinks && client.socialLinks.facebook, 'Facebook not provided');
        wireLinkButton(buttons.instagram, client.socialLinks && client.socialLinks.instagram, 'Instagram not provided');
        wireLinkButton(buttons.x, client.socialLinks && client.socialLinks.twitter, 'X not provided');
        wireLinkButton(buttons.linkedin, client.socialLinks && client.socialLinks.linkedin, 'LinkedIn not provided');
        wireLinkButton(buttons.tiktok, client.socialLinks && client.socialLinks.tiktok, 'TikTok not provided');
        wireLinkButton(buttons.youtube, client.socialLinks && client.socialLinks.youtube, 'YouTube not provided');

        if (buttons.book) {
            const bookingLink = client.bookingLink || client.appointmentUrl || '';
            buttons.book.disabled = !bookingLink;
            buttons.book.classList.toggle('disabled', !bookingLink);
            buttons.book.onclick = bookingLink ? function () {
                window.open(bookingLink, '_blank', 'noopener,noreferrer');
            } : function () {
                alert('Booking link not available');
            };
        }
    }

    function renderClient(client) {
        state.client = client;

        applyTheme(client.themeColor);
        renderPhotoAndQr(client);

        setText(fullName, client.fullName, '');
        setText(jobName, client.company, '');
        setText(titlePosition, client.title, '');
        setText(phoneMain, client.phone1, 'Not Provided');
        setText(emailMain, client.email1, 'Not Provided');
        setText(bioText, client.bio, 'Professional profile coming soon.');

        const phones = [client.phone1, client.phone2, client.phone3].filter(Boolean);
        const emails = [client.email1, client.email2, client.email3].filter(Boolean);

        buildList(phoneList, phones.slice(1), {
            label: function (value) {
                return value;
            },
            action: function (value) {
                return function () {
                    window.location.href = 'tel:' + value;
                };
            }
        });

        buildList(emailList, emails.slice(1), {
            label: function (value) {
                return value;
            },
            action: function (value) {
                return function () {
                    window.location.href = 'mailto:' + value;
                };
            }
        });

        if (phoneDropdownBtn) {
            phoneDropdownBtn.style.display = phones.length > 1 ? 'inline-flex' : 'none';
        }
        if (emailDropdownBtn) {
            emailDropdownBtn.style.display = emails.length > 1 ? 'inline-flex' : 'none';
        }

        renderHours(client.workingHours || {});
        setupActions(client);
        setupInfoButtons(client);
        updateLiveTime();
        window.setInterval(updateLiveTime, 30000);

        setHidden(popup1, false);
        setHidden(popup2, true);
        hideMessage();
    }

    function setupNavigation() {
        if (buttons.moreInfo) {
            buttons.moreInfo.addEventListener('click', function () {
                setHidden(popup1, true);
                setHidden(popup2, false);
            });
        }

        if (buttons.back) {
            buttons.back.addEventListener('click', function () {
                setHidden(popup2, true);
                setHidden(popup1, false);
            });
        }

        setupDropdown(phoneDropdownBtn, phoneList);
        setupDropdown(emailDropdownBtn, emailList);
    }

    async function init() {
        setupNavigation();
        const client = await fetchProfileData();
        if (!client) return;
        renderClient(client);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
