(() => {
  const root = document.documentElement;
  const spacer = document.getElementById('scroll-spacer');
  const hero = document.querySelector('.hero-scene');
  const panel = document.getElementById('archive-panel');
  const flow = document.getElementById('archive-flow');
  const closing = document.getElementById('outro');
  const menuButton = document.querySelector('.menu-toggle');
  const menuPanel = document.getElementById('site-menu');
  const yearFilter = document.getElementById('year-filter');
  const designerFilter = document.getElementById('designer-filter');
  const cards = [...document.querySelectorAll('.look-card')];
  const grid = document.getElementById('look-grid');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  const smallViewport = matchMedia('(max-width: 1023px)');
  const designerNames = {
    'rick-owens': 'Rick Owens',
    balenciaga: 'Balenciaga',
    vetements: 'Vetements',
  };
  const files = cards.map((card) => {
    const image = card.querySelector('img');
    const number = Number(card.dataset.look);
    return {
      card,
      number,
      year: card.dataset.year,
      designer: card.dataset.designer,
      image: image.getAttribute('src'),
      alt: `Concept outfit study, look ${String(number).padStart(2, '0')}`,
    };
  });
  let selectedNumber = 1;
  let viewportHeight = window.innerHeight;
  let maxFlowScroll = 0;
  let sequenceEnabled = false;
  let scrollFrame = 0;
  let measureFrame = 0;
  let activeVideo = document.getElementById('hero-video-right');
  let pointerX = window.innerWidth / 2;
  let pointerFrame = 0;
  let touchVideoIndex = 0;
  let revealCleanup;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getFile = (number) => files.find((entry) => entry.number === number);

  function closeMenu(restoreFocus = false) {
    if (!menuButton || menuPanel.hidden) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    if (restoreFocus) menuButton.focus();
    const finish = () => { menuPanel.hidden = true; };
    if (reducedMotion.matches || !menuPanel.animate) {
      finish();
      return;
    }
    const animation = menuPanel.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }],
      { duration: 160, easing: 'cubic-bezier(.4, 0, 1, 1)' },
    );
    animation.onfinish = finish;
  }

  function openMenu() {
    if (!menuButton || !menuPanel.hidden) return;
    menuPanel.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close menu');
    if (!reducedMotion.matches && menuPanel.animate) {
      menuPanel.animate(
        [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 190, easing: 'cubic-bezier(.22, 1, .36, 1)' },
      );
    }
  }

  function flowOffsetFor(element) {
    const sectionRect = element.getBoundingClientRect();
    const flowRect = flow.getBoundingClientRect();
    return sectionRect.top - flowRect.top;
  }

  function scrollToFlowTarget(id) {
    const target = document.getElementById(id);
    if (!target) return;
    closeMenu();
    if (!sequenceEnabled) {
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const top = viewportHeight + flowOffsetFor(target);
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  menuButton?.addEventListener('click', () => {
    if (menuButton.getAttribute('aria-expanded') === 'true') closeMenu();
    else openMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const flowLink = target.closest('[data-flow-target]');
    if (flowLink) {
      event.preventDefault();
      scrollToFlowTarget(flowLink.dataset.flowTarget);
      return;
    }
    if (menuButton?.getAttribute('aria-expanded') === 'true' && !target.closest('.site-nav')) closeMenu();
  });

  function visibleCards() {
    const year = yearFilter.value;
    const designer = designerFilter.value;
    const matching = [];
    for (const entry of files) {
      const isVisible = (year === 'all' || entry.year === year) && (designer === 'all' || entry.designer === designer);
      entry.card.hidden = !isVisible;
      if (isVisible) matching.push(entry.card);
    }
    return matching;
  }

  function applyStaggeredLayout(visible) {
    const columns = window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4;
    grid.style.setProperty('--columns', String(columns));
    for (const card of cards) {
      card.style.gridColumn = '';
      card.style.gridRow = '';
    }
    let index = 0;
    let row = 0;
    while (index < visible.length) {
      const primary = (row * 2 + (row % 2)) % columns;
      const slots = [primary];
      if (row % 3 === 0 && index + 1 < visible.length) {
        let second = (primary + 2) % columns;
        if (second === primary) second = (primary + 1) % columns;
        slots.push(second);
      }
      slots.sort((a, b) => a - b);
      for (const column of slots) {
        if (index >= visible.length) break;
        const card = visible[index++];
        card.style.gridColumn = String(column + 1);
        card.style.gridRow = String(row + 1);
        card.dataset.revealDelay = String(Math.min((index - 1) % columns * 60, 180));
      }
      row += 1;
    }
  }

  function applyFilters() {
    const matching = visibleCards();
    applyStaggeredLayout(matching);
    document.getElementById('result-count').textContent = `${matching.length} concept ${matching.length === 1 ? 'study' : 'studies'}`;
    scheduleMeasure();
  }

  function updateSelected(number) {
    const entry = getFile(number);
    if (!entry) return;
    selectedNumber = number;
    for (const card of cards) card.setAttribute('aria-pressed', String(Number(card.dataset.look) === number));

    const formatted = String(number).padStart(2, '0');
    document.getElementById('selected-number').textContent = `${formatted} / 10`;
    document.getElementById('selected-title').innerHTML = `Look ${formatted}.<br>Concept study.`;
    document.getElementById('selected-year').textContent = entry.year;
    document.getElementById('selected-designer').textContent = designerNames[entry.designer];

    const selectedImage = document.getElementById('selected-image');
    selectedImage.src = entry.image;
    selectedImage.alt = `${entry.alt}, ${entry.year} concept tag, ${designerNames[entry.designer]} reference`;

    const thumbnails = document.getElementById('selected-thumbnails');
    const related = [];
    for (let step = 1; step < files.length && related.length < 4; step += 1) {
      related.push(files[(number - 1 + step) % files.length]);
    }
    thumbnails.replaceChildren(...related.map((look) => {
      const button = document.createElement('button');
      button.className = 'selected-thumb';
      button.type = 'button';
      button.dataset.selectLook = String(look.number);
      button.setAttribute('aria-label', `Select look ${String(look.number).padStart(2, '0')}`);
      const image = document.createElement('img');
      image.src = look.image;
      image.alt = '';
      image.loading = 'lazy';
      const label = document.createElement('span');
      label.textContent = String(look.number).padStart(2, '0');
      button.append(image, label);
      return button;
    }));
  }

  yearFilter.addEventListener('change', applyFilters);
  designerFilter.addEventListener('change', applyFilters);
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.look-card');
    if (card && !card.hidden) updateSelected(Number(card.dataset.look));
  });
  document.getElementById('selected-thumbnails').addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-look]');
    if (button) updateSelected(Number(button.dataset.selectLook));
  });

  function setActiveVideo(video) {
    if (!video || activeVideo === video) return;
    activeVideo.classList.remove('is-active');
    video.classList.add('is-active');
    activeVideo = video;
  }

  function setVideoTime(video, time) {
    if (!video || video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !Number.isFinite(video.duration)) return;
    const safeTime = clamp(time, 0, Math.max(0, video.duration - .04));
    if (Math.abs(video.currentTime - safeTime) > .04) {
      try { video.currentTime = safeTime; } catch { /* A source can become unavailable during a seek. */ }
    }
  }

  function playTouchVideo(index) {
    const videos = [document.getElementById('hero-video-left'), document.getElementById('hero-video-right')];
    touchVideoIndex = index % videos.length;
    const current = videos[touchVideoIndex];
    setActiveVideo(current);
    for (const video of videos) {
      if (video !== current) video.pause();
    }
    if (!reducedMotion.matches) current.play().catch(() => {});
  }

  const leftVideo = document.getElementById('hero-video-left');
  const rightVideo = document.getElementById('hero-video-right');
  for (const video of [leftVideo, rightVideo]) {
    video.addEventListener('loadeddata', () => {
      if ([leftVideo, rightVideo].every((item) => item.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)) hero.classList.add('is-loaded');
    }, { once: true });
    video.addEventListener('ended', () => {
      if (smallViewport.matches && !reducedMotion.matches && window.scrollY < viewportHeight) playTouchVideo(touchVideoIndex + 1);
    });
    video.addEventListener('error', () => video.classList.add('media-error'));
  }

  function updatePointerScrub() {
    pointerFrame = 0;
    if (!finePointer.matches || reducedMotion.matches || window.scrollY >= viewportHeight) return;
    const width = window.innerWidth;
    const center = width / 2;
    const deadZone = Math.max(50, width * .05);
    if (pointerX < center - deadZone) {
      setActiveVideo(rightVideo);
      const progress = clamp((center - deadZone - pointerX) / (center - deadZone), 0, 1);
      setVideoTime(rightVideo, progress * rightVideo.duration);
    } else if (pointerX > center + deadZone) {
      setActiveVideo(leftVideo);
      const progress = clamp((pointerX - (center + deadZone)) / (width - center - deadZone), 0, 1);
      setVideoTime(leftVideo, progress * leftVideo.duration);
    } else {
      setVideoTime(leftVideo, 0);
      setVideoTime(rightVideo, 0);
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    pointerX = event.clientX;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(updatePointerScrub);
  }, { passive: true });

  function stopVideoMotion() {
    for (const video of [leftVideo, rightVideo]) {
      video.pause();
      setVideoTime(video, 0);
    }
    setActiveVideo(rightVideo);
  }

  function updateSequence() {
    scrollFrame = 0;
    if (!sequenceEnabled) return;
    const y = window.scrollY;
    const panelProgress = clamp(y / viewportHeight, 0, 1);
    const flowOffset = clamp(y - viewportHeight, 0, maxFlowScroll);
    panel.style.transform = `translate3d(0, ${((1 - panelProgress) * viewportHeight).toFixed(2)}px, 0)`;
    flow.style.transform = `translate3d(0, ${(-flowOffset).toFixed(2)}px, 0)`;
    hero.style.setProperty('--hero-content-opacity', String(clamp(1 - panelProgress * 1.35, 0, 1)));
    hero.style.setProperty('--video-opacity', String(clamp(1 - panelProgress * 1.25, 0, 1)));

    const outroStart = viewportHeight + maxFlowScroll;
    const outroProgress = clamp((y - outroStart) / Math.max(1, viewportHeight - 100), 0, 1);
    closing.style.opacity = String(outroProgress);
    closing.style.visibility = outroProgress > 0 ? 'visible' : 'hidden';
    closing.style.pointerEvents = outroProgress >= .72 ? 'auto' : 'none';
    closing.inert = outroProgress < .35;
    root.dataset.closing = String(outroProgress > .48);
  }

  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateSequence);
  }

  function measureSequence() {
    measureFrame = 0;
    if (!sequenceEnabled) return;
    viewportHeight = window.innerHeight;
    const height = Math.max(flow.scrollHeight, viewportHeight);
    maxFlowScroll = Math.max(0, height - viewportHeight);
    root.style.setProperty('--sequence-height', `${Math.ceil(viewportHeight * 3 + maxFlowScroll)}px`);
    scheduleScroll();
  }

  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measureSequence);
  }

  function enableSequence() {
    if (reducedMotion.matches || sequenceEnabled) return;
    sequenceEnabled = true;
    root.classList.add('scroll-sequence');
    applyFilters();
    viewportHeight = window.innerHeight;
    measureSequence();
  }

  function disableSequence() {
    sequenceEnabled = false;
    root.classList.remove('scroll-sequence');
    root.style.removeProperty('--sequence-height');
    root.removeAttribute('data-closing');
    hero.style.removeProperty('--hero-content-opacity');
    hero.style.removeProperty('--video-opacity');
    panel.style.removeProperty('transform');
    flow.style.removeProperty('transform');
    closing.style.removeProperty('opacity');
    closing.style.removeProperty('visibility');
    closing.style.removeProperty('pointer-events');
    closing.inert = false;
    stopVideoMotion();
  }

  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', () => {
    applyStaggeredLayout(visibleCards());
    scheduleMeasure();
    scheduleScroll();
    if (smallViewport.matches && !reducedMotion.matches && window.scrollY < viewportHeight) playTouchVideo(0);
    else stopVideoMotion();
  }, { passive: true });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      revealCleanup?.();
      revealCleanup = undefined;
      disableSequence();
    } else {
      enableSequence();
      if (smallViewport.matches && window.scrollY < viewportHeight) playTouchVideo(0);
      revealCleanup = installReferenceReveals(document);
    }
  });

  document.getElementById('view-selected').addEventListener('click', () => scrollToFlowTarget('selected-look'));

  /**
   * Reveal only content that is still below the viewport. CSS keeps every item
   * visible by default, and visited items are never reset or replayed.
   */
  function installReferenceReveals(scope = document) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map();
    const elements = [...scope.querySelectorAll('[data-reveal]')];
    let observer;
    const finish = (element) => {
      element.dataset.revealPlayed = 'true';
      animations.get(element)?.cancel();
      animations.delete(element);
    };
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target;
          observer.unobserve(element);
          element.dataset.revealPlayed = 'true';
          if (reduced.matches || document.visibilityState === 'hidden' || entry.boundingClientRect.bottom <= 0) {
            finish(element);
          } else {
            animations.get(element)?.play();
          }
        }
      }, { threshold: 0, rootMargin: '0px 0px 96px 0px' });
    }
    const stop = () => {
      observer?.disconnect();
      elements.forEach(finish);
    };
    const onPreference = () => { if (reduced.matches) stop(); };
    reduced.addEventListener('change', onPreference);

    for (const element of elements) {
      if (element.dataset.revealPlayed === 'true') continue;
      const rect = element.getBoundingClientRect();
      if (reduced.matches || !observer || !element.animate || rect.top < innerHeight || document.visibilityState === 'hidden') {
        finish(element);
        continue;
      }
      const startTransform = element.dataset.reveal === 'media'
        ? 'scale(1.025)'
        : element.dataset.reveal === 'slide'
          ? 'translateX(-12px)'
          : 'translateY(12px)';
      const animation = element.animate(
        [{ opacity: 0, transform: startTransform }, { opacity: 1, transform: 'none' }],
        {
          duration: Number(element.dataset.revealDuration) || 560,
          delay: Math.min(Number(element.dataset.revealDelay) || 0, 240),
          easing: 'cubic-bezier(.22, 1, .36, 1)',
          fill: 'backwards',
        },
      );
      animation.pause();
      animation.onfinish = () => finish(element);
      animations.set(element, animation);
      observer.observe(element);
    }
    return () => {
      stop();
      reduced.removeEventListener('change', onPreference);
    };
  }

  applyFilters();
  updateSelected(selectedNumber);
  enableSequence();
  revealCleanup = installReferenceReveals(document);

  if (smallViewport.matches && !reducedMotion.matches) {
    leftVideo.addEventListener('loadeddata', () => playTouchVideo(0), { once: true });
    if (leftVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) playTouchVideo(0);
  }

  document.fonts?.ready.then(() => {
    const matchingFace = [...document.fonts].find((face) => face.family.replaceAll('"', '') === 'Inter Tight' && face.style === 'normal' && face.weight.includes('500'));
    const result = {
      ready: document.fonts.status === 'loaded',
      matchingFontFace: matchingFace?.status || 'missing',
      check500: document.fonts.check('500 16px "Inter Tight"'),
    };
    console.info('prmpt typography check', result);
    window.__prmptTypographyCheck = result;
  });

  window.__prmptState = {
    get sequenceEnabled() { return sequenceEnabled; },
    get reducedMotion() { return reducedMotion.matches; },
    get selectedLook() { return selectedNumber; },
    get panelProgress() { return sequenceEnabled ? clamp(window.scrollY / viewportHeight, 0, 1) : 0; },
    get closingProgress() {
      return sequenceEnabled ? clamp((window.scrollY - (viewportHeight + maxFlowScroll)) / Math.max(1, viewportHeight - 100), 0, 1) : 1;
    },
  };
})();
