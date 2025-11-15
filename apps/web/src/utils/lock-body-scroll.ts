/**
 * Locks body scroll when a modal is open
 * Prevents background content from scrolling on mobile
 */

let scrollLockCount = 0;

export function lockBodyScroll() {
  if (typeof window === 'undefined') return;

  scrollLockCount++;

  // Store current scroll position
  const scrollY = window.scrollY;

  // Scroll down a bit on mobile to hide browser UI
  if (window.innerWidth <= 768) {
    window.scrollTo(0, scrollY + 1);
  }

  // Apply styles to body
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = '0px'; // Prevent layout shift
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined') return;

  scrollLockCount--;

  // Only unlock if no other locks are active
  if (scrollLockCount <= 0) {
    scrollLockCount = 0;

    // Restore scroll position
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Restore scroll position
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
    }
  }
}
