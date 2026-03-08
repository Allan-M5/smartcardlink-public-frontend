(function () {
  'use strict';

  const API_ROOT = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080'
    : 'https://smartcardlink-api.onrender.com';

  const params = new URLSearchParams(window.location.search);
  const requestedSlug = (params.get('slug') || '').trim();

  const el = function (id) { return document.getElementById(id); };
  const q = function (selector) { return document.querySelector(selector); };

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
  const hoursTableBody = q('#hoursTable tbody');

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

  let currentPanel = 'photo';
  let longPressTimer = null;

  function safe(value) {
    return value == null ? '' : String(value);
  }

  function setHidden(node, hidden) {
    if (!node) return;
    if (hidden) {
      node.setAttribute('hidden', 'hidden');
      node.setAttribute('aria-hidden', 'true');
    } else {
      node.removeAttribute('hidden');
      node.setAttribute('aria-hidden', 'false');
    }
  }

  function showMessage(message, isError) {
    if (!vcardContainer) return;
    let messageArea = el('messageArea');
    if (!messageArea) {
      messageArea = document.createElement('div');
      messageArea.id = 'messageArea';
      messageArea.style.textAlign = 'center';
      messageArea.style.padding = '24px';
      vcardContainer.prepend(messageArea);
    }
    messageArea.innerHTML = '<h3>' + message + '</h3>';
    messageArea.style.color = isError ? '#ef4444' : '#ffffff';
    setHidden(messageArea, false);
    setHidden(popup1, true);
    setHidden(popup2, true);
  }

  function hideMessage() {
    const messageArea = el('messageArea');
    if (messageArea) {
      setHidden(messageArea, true);
    }
  }

  function ensureColor(color) {
    const value = safe(color).trim();
    return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : '#FFD700';
  }

  function applyTheme(color) {
    const theme = ensureColor(color);
    document.documentElement.style.setProperty('--theme-color', theme);
  }

  function currentTime() {
    try {
      return new Intl.DateTimeFormat('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Africa/Nairobi'
      }).format(new Date());
    } catch (error) {
      return new Date().toLocaleTimeString();
    }
  }

  function startClock() {
    if (!liveTime) return;
    liveTime.textContent = currentTime();
    window.setInterval(function () {
      liveTime.textContent = currentTime();
    }, 1000);
  }

  function sanitizePhone(phone) {
    return safe(phone).replace(/[^\d+]/g, '');
  }

  function digitsOnly(phone) {
    return safe(phone).replace(/\D/g, '');
  }

  function buildAppointmentUrl(client) {
    const direct = safe(client && client.appointmentUrl).trim();
    if (direct) return direct;
    const email = safe(client && client.email1).trim();
    if (!email) return '';
    const subject = encodeURIComponent('Appointment Booking Request');
    const body = encodeURIComponent('Hello, I would like to book an appointment regarding your SmartCardLink profile.');
    return 'mailto:' + email + '?subject=' + subject + '&body=' + body;
  }

  function bindButton(button, enabled, handler, unavailableMessage) {
    if (!button) return;
    button.disabled = false;
    button.classList.toggle('disabled', !enabled);
    button.onclick = function (event) {
      event.preventDefault();
      if (!enabled) {
        window.alert(unavailableMessage || 'Not provided');
        return;
      }
      handler();
    };
  }

  function renderList(target, values, typeLabel) {
    if (!target) return;
    const cleanValues = values.filter(function (value) { return value; });
    if (!cleanValues.length) {
      target.innerHTML = '<div class="list-item disabled"><em>No Additional ' + typeLabel + '</em></div>';
      return;
    }
    target.innerHTML = cleanValues.map(function (value) {
      return '<div class="list-item">' + value + '</div>';
    }).join('');
  }

  function toggleDropdown(listNode) {
    if (!listNode) return;
    const hidden = listNode.hasAttribute('hidden');
    if (hidden) {
      listNode.removeAttribute('hidden');
    } else {
      listNode.setAttribute('hidden', 'hidden');
    }
  }

  function renderHours(workingHours) {
    if (!hoursTableBody) return;
    const hours = workingHours || {};
    const rows = [
      ['Mon-Fri', safe(hours.monFriStart) || 'Closed', safe(hours.monFriEnd) || 'Closed'],
      ['Saturday', safe(hours.satStart) || 'Closed', safe(hours.satEnd) || 'Closed'],
      ['Sunday', safe(hours.sunStart) || 'Closed', safe(hours.sunEnd) || 'Closed']
    ];
    hoursTableBody.innerHTML = rows.map(function (row) {
      return '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td><td>' + row[2] + '</td></tr>';
    }).join('');
  }

  function openFullscreenImage(src, alt) {
    if (!src) return;
    const existing = document.querySelector('.photo-fullscreen');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'photo-fullscreen';

    const image = document.createElement('img');
    image.src = src;
    image.alt = alt || 'Preview';

    overlay.appendChild(image);
    overlay.addEventListener('click', function () {
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function switchPanel(panel) {
    const track = q('.photo-swipe-track');
    const hint = q('.swipe-hint');
    if (!track) return;
    currentPanel = panel === 'qr' ? 'qr' : 'photo';
    track.style.transform = currentPanel === 'qr' ? 'translateX(-50%)' : 'translateX(0)';
    if (hint) {
      hint.textContent = currentPanel === 'qr' ? 'Tap or swipe back to photo' : 'Swipe or tap photo to reveal QR';
    }
  }

  function setupPhotoArea(client) {
    if (!photoArea) return;

    const photoUrl = safe(client.photoUrl).trim();
    const qrCodeUrl = safe(client.qrCodeUrl).trim();
    const fallbackImage = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" fill="#999" font-size="20" text-anchor="middle" dominant-baseline="middle">Photo Not Provided</text></svg>');

    photoArea.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'photo-swipe-container';

    const track = document.createElement('div');
    track.className = 'photo-swipe-track';

    const photoPanel = document.createElement('div');
    photoPanel.className = 'photo-panel';
    const photoImg = document.createElement('img');
    photoImg.src = photoUrl || fallbackImage;
    photoImg.alt = safe(client.fullName) || 'Profile';
    photoPanel.appendChild(photoImg);

    const qrPanel = document.createElement('div');
    qrPanel.className = 'qr-panel';
    const qrImg = document.createElement('img');
    qrImg.src = qrCodeUrl || fallbackImage;
    qrImg.alt = 'QR Code';
    qrPanel.appendChild(qrImg);

    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.textContent = 'Swipe or tap photo to reveal QR';

    track.appendChild(photoPanel);
    track.appendChild(qrPanel);
    container.appendChild(track);
    container.appendChild(hint);
    photoArea.appendChild(container);

    function onPressStart() {
      window.clearTimeout(longPressTimer);
      const src = currentPanel === 'qr' ? qrImg.src : photoImg.src;
      const alt = currentPanel === 'qr' ? 'QR Code' : (safe(client.fullName) || 'Profile');
      longPressTimer = window.setTimeout(function () {
        openFullscreenImage(src, alt);
      }, 500);
    }

    function onPressEnd() {
      window.clearTimeout(longPressTimer);
    }

    let startX = 0;
    let moved = false;

    container.addEventListener('touchstart', function (event) {
      startX = event.touches[0].clientX;
      moved = false;
      onPressStart();
    }, { passive: true });

    container.addEventListener('touchmove', function (event) {
      if (Math.abs(event.touches[0].clientX - startX) > 18) {
        moved = true;
        onPressEnd();
      }
    }, { passive: true });

    container.addEventListener('touchend', function (event) {
      const endX = event.changedTouches[0].clientX;
      const delta = endX - startX;
      onPressEnd();
      if (Math.abs(delta) > 45) {
        switchPanel(delta < 0 ? 'qr' : 'photo');
        return;
      }
      if (!moved) {
        switchPanel(currentPanel === 'photo' ? 'qr' : 'photo');
      }
    }, { passive: true });

    container.addEventListener('mousedown', onPressStart);
    container.addEventListener('mouseup', onPressEnd);
    container.addEventListener('mouseleave', onPressEnd);
    container.addEventListener('click', function (event) {
      if (document.querySelector('.photo-fullscreen')) return;
      switchPanel(currentPanel === 'photo' ? 'qr' : 'photo');
      event.preventDefault();
    });

    switchPanel('photo');
  }

  function setupPrimaryActions(client) {
    const mainPhone = safe(client.phone1).trim();
    const mainEmail = safe(client.email1).trim();

    bindButton(actions.call, !!mainPhone, function () {
      window.location.href = 'tel:' + sanitizePhone(mainPhone);
    }, 'Primary phone not provided');

    bindButton(actions.sms, !!mainPhone, function () {
      window.location.href = 'sms:' + sanitizePhone(mainPhone);
    }, 'Primary phone not provided');

    bindButton(actions.wa, !!mainPhone, function () {
      window.open('https://wa.me/' + digitsOnly(mainPhone), '_blank', 'noopener');
    }, 'Primary phone not provided');

    bindButton(actions.mail, !!mainEmail, function () {
      window.location.href = 'mailto:' + mainEmail;
    }, 'Primary email not provided');

    bindButton(actions.print, true, function () {
      window.print();
    }, 'Print unavailable');

    bindButton(actions.save, !!safe(client.vcardAssetUrl).trim(), function () {
      window.open(client.vcardAssetUrl, '_blank', 'noopener');
    }, 'Contact file not available yet');
  }

  function setupSecondaryButtons(client) {
    bindButton(buttons.business, !!safe(client.businessWebsite).trim(), function () {
      window.open(client.businessWebsite, '_blank', 'noopener');
    }, 'Business URL not provided');

    bindButton(buttons.portfolio, !!safe(client.portfolioWebsite).trim(), function () {
      window.open(client.portfolioWebsite, '_blank', 'noopener');
    }, 'Portfolio URL not provided');

    bindButton(buttons.location, !!safe(client.locationMap).trim(), function () {
      window.open(client.locationMap, '_blank', 'noopener');
    }, 'Location map not provided');

    bindButton(buttons.physical, !!safe(client.address).trim(), function () {
      const query = encodeURIComponent(client.address);
      window.open('https://www.google.com/maps/search/?api=1&query=' + query, '_blank', 'noopener');
    }, 'Physical address not provided');

    const socials = client.socialLinks || {};
    bindButton(buttons.facebook, !!safe(socials.facebook).trim(), function () { window.open(socials.facebook, '_blank', 'noopener'); }, 'Facebook not provided');
    bindButton(buttons.instagram, !!safe(socials.instagram).trim(), function () { window.open(socials.instagram, '_blank', 'noopener'); }, 'Instagram not provided');
    bindButton(buttons.x, !!safe(socials.twitter).trim(), function () { window.open(socials.twitter, '_blank', 'noopener'); }, 'X not provided');
    bindButton(buttons.linkedin, !!safe(socials.linkedin).trim(), function () { window.open(socials.linkedin, '_blank', 'noopener'); }, 'LinkedIn not provided');
    bindButton(buttons.tiktok, !!safe(socials.tiktok).trim(), function () { window.open(socials.tiktok, '_blank', 'noopener'); }, 'TikTok not provided');
    bindButton(buttons.youtube, !!safe(socials.youtube).trim(), function () { window.open(socials.youtube, '_blank', 'noopener'); }, 'YouTube not provided');

    const bookingUrl = buildAppointmentUrl(client);
    window.__SCL_BOOKING_URL__ = bookingUrl;
    window.__SCL_CLIENT_EMAIL__ = safe(client.email1).trim();
    if (buttons.book) {
      buttons.book.dataset.bound = '1';
    }
    bindButton(buttons.book, !!bookingUrl, function () {
      if (/^mailto:/i.test(bookingUrl)) {
        window.location.href = bookingUrl;
      } else {
        window.open(bookingUrl, '_blank', 'noopener');
      }
    }, 'Booking link not available');
  }

  function renderClient(client) {
    applyTheme(client.themeColor || '#FFD700');

    if (fullName) fullName.textContent = safe(client.fullName);
    if (jobName) jobName.textContent = safe(client.company);
    if (titlePosition) titlePosition.textContent = safe(client.title);
    if (phoneMain) phoneMain.textContent = safe(client.phone1) || 'Not Provided';
    if (emailMain) emailMain.textContent = safe(client.email1) || 'Not Provided';
    if (bioText) bioText.textContent = safe(client.bio) || 'Professional profile not provided.';

    renderHours(client.workingHours || {});
    renderList(phoneList, [safe(client.phone2).trim(), safe(client.phone3).trim()], 'Contact');
    renderList(emailList, [safe(client.email2).trim(), safe(client.email3).trim()], 'Contact');
    setupPhotoArea(client);
    setupPrimaryActions(client);
    setupSecondaryButtons(client);

    if (phoneDropdownBtn) {
      phoneDropdownBtn.onclick = function (event) {
        event.preventDefault();
        toggleDropdown(phoneList);
      };
    }
    if (emailDropdownBtn) {
      emailDropdownBtn.onclick = function (event) {
        event.preventDefault();
        toggleDropdown(emailList);
      };
    }

    if (buttons.moreInfo) {
      buttons.moreInfo.onclick = function () {
        setHidden(popup1, true);
        setHidden(popup2, false);
      };
    }
    if (buttons.back) {
      buttons.back.onclick = function () {
        setHidden(popup2, true);
        setHidden(popup1, false);
      };
    }

    hideMessage();
    setHidden(popup1, false);
    setHidden(popup2, true);
  }

  async function fetchProfileData(slug) {
    if (!slug) {
      showMessage('VCard Identifier not found.', true);
      return null;
    }
    try {
      showMessage('Loading Professional vCard...', false);
      const response = await fetch(API_ROOT + '/api/vcard/' + encodeURIComponent(slug), { cache: 'no-store' });
      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error(response.ok ? 'Invalid profile response.' : text || 'Card not found.');
      }
      if (!response.ok || !json || json.status !== 'success' || !json.data) {
        throw new Error((json && json.message) || 'Card not found.');
      }
      return json.data;
    } catch (error) {
      showMessage(error.message || 'Failed to load card.', true);
      return null;
    }
  }

  async function init() {
    startClock();
    const slug = requestedSlug || safe(window.location.pathname.split('/').pop()).trim();
    const client = await fetchProfileData(slug === 'index.html' ? '' : slug);
    if (!client) return;
    renderClient(client);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
