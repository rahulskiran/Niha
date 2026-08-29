/**
 * Editorial collection card behaviour: size selection inside the hover quick-add
 * panel, and the save-for-later heart.
 *
 * Deliberately dependency free so it can be loaded with a plain deferred script
 * from the collection section, outside the theme's module graph.
 */
(() => {
  const WISHLIST_KEY = 'niha:wishlist';

  /**
   * Reads the saved product ids. Storage can throw in private mode, so a failure
   * degrades to an empty wishlist rather than breaking the grid.
   * @returns {Set<string>}
   */
  const readWishlist = () => {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  /** @param {Set<string>} ids */
  const writeWishlist = (ids) => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify([...ids]));
    } catch {
      // Nothing to do: the heart still reflects the current page.
    }
  };

  if (!customElements.get('niha-quick-add')) {
    customElements.define(
      'niha-quick-add',
      class NihaQuickAdd extends HTMLElement {
        connectedCallback() {
          this.addEventListener('click', this.#handleClick);
        }

        disconnectedCallback() {
          this.removeEventListener('click', this.#handleClick);
        }

        /** @param {MouseEvent} event */
        #handleClick = (event) => {
          const target = /** @type {HTMLElement} */ (event.target);
          const size = target.closest?.('.niha-qa__size');
          if (!(size instanceof HTMLButtonElement) || size.disabled) return;

          // The panel sits above the card's full-bleed link; keep the click local.
          event.preventDefault();
          event.stopPropagation();

          this.#select(size);
        };

        /** @param {HTMLButtonElement} size */
        #select(size) {
          for (const button of this.querySelectorAll('.niha-qa__size')) {
            button.setAttribute('aria-pressed', String(button === size));
          }

          const variantId = size.dataset.variantId;
          const input = /** @type {HTMLInputElement | null} */ (this.querySelector('input[name="id"]'));
          if (input && variantId) {
            input.value = variantId;
            input.disabled = false;
          }

          const submit = /** @type {HTMLButtonElement | null} */ (this.querySelector('button.niha-qa__submit'));
          if (submit) {
            submit.disabled = false;
            const label = submit.querySelector('.niha-qa__submit-label');
            if (label) label.textContent = 'Add to bag';
          }
        }
      }
    );
  }

  /** @param {ParentNode} root */
  const hydrateWishlist = (root) => {
    const buttons = root.querySelectorAll?.('.niha-wish');
    if (!buttons || buttons.length === 0) return;

    const saved = readWishlist();
    for (const button of buttons) {
      const id = /** @type {HTMLElement} */ (button).dataset.productId;
      if (id) button.setAttribute('aria-pressed', String(saved.has(id)));
    }
  };

  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const button = target.closest?.('.niha-wish');
    if (!(button instanceof HTMLButtonElement)) return;

    event.preventDefault();
    event.stopPropagation();

    const id = button.dataset.productId;
    if (!id) return;

    const saved = readWishlist();
    const isSaved = saved.has(id);
    if (isSaved) saved.delete(id);
    else saved.add(id);

    writeWishlist(saved);

    // Every card for this product on the page follows the same state.
    for (const other of document.querySelectorAll(`.niha-wish[data-product-id="${CSS.escape(id)}"]`)) {
      other.setAttribute('aria-pressed', String(!isSaved));
    }
  });

  hydrateWishlist(document);

  // Infinite scroll and filtering swap cards in, so newly rendered hearts need
  // their saved state applied too.
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) hydrateWishlist(/** @type {Element} */ (node));
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
