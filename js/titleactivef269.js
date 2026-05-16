document.addEventListener("DOMContentLoaded", (event) => {
  function createScrollTrigger(triggerElement, timeline) {
    ScrollTrigger.create({
      trigger: triggerElement,
      start: "top bottom",
      onLeaveBack: () => {
        timeline.progress(0);
        timeline.pause();
      },
    });

    ScrollTrigger.create({
      trigger: triggerElement,
      start: "top 80%",
      markers: false,
      onEnter: () => timeline.play(),
    });
  }

  const splitTypeElements = document.querySelectorAll("[text-split]");
  splitTypeElements.forEach((splitTypeElement) => {
    const typeSplit = new SplitType(splitTypeElement, {
      types: "words, chars",
      tagName: "span",
    });
  });

  const wordsSlideUpElements = document.querySelectorAll("[words-slide-up]");
  wordsSlideUpElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const words = element.querySelectorAll(".word");
    tl.from(words, {
      opacity: 0,
      yPercent: 100,
      duration: 0.5,
      ease: "back.out(2)",
      stagger: { amount: 0.5 },
    });
    createScrollTrigger(element, tl);
  });

  const wordsRotateInElements = document.querySelectorAll("[words-rotate-in]");
  wordsRotateInElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const words = element.querySelectorAll(".word");
    tl.set(words, { transformPerspective: 1000 });
    tl.from(words, {
      rotationX: -90,
      duration: 0.6,
      ease: "power2.out",
      stagger: { amount: 0.6 },
    });
    createScrollTrigger(element, tl);
  });

  const wordsSlideFromRightElements = document.querySelectorAll("[words-slide-from-right]");
  wordsSlideFromRightElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const words = element.querySelectorAll(".word");
    tl.from(words, {
      opacity: 0,
      x: "1em",
      duration: 0.6,
      ease: "power2.out",
      stagger: { amount: 0.2 },
    });
    createScrollTrigger(element, tl);
  });

  const lettersSlideUpElements = document.querySelectorAll("[letters-slide-up]");
  lettersSlideUpElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const chars = element.querySelectorAll(".char");
    tl.from(chars, {
      yPercent: 100,
      duration: 0.35,
      ease: "power1.out",
      stagger: { amount: 0.6 },
    });
    createScrollTrigger(element, tl);
  });

  const lettersSlideDownElements = document.querySelectorAll("[letters-slide-down]");
  lettersSlideDownElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const chars = element.querySelectorAll(".char");
    tl.from(chars, {
      yPercent: -120,
      duration: 0.3,
      ease: "power1.out",
      stagger: { amount: 0.7 },
    });
    createScrollTrigger(element, tl);
  });

  const lettersFadeInElements = document.querySelectorAll("[letters-fade-in]");
  lettersFadeInElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const chars = element.querySelectorAll(".char");
    tl.from(chars, {
      opacity: 0,
      duration: 0.2,
      ease: "power1.out",
      stagger: { amount: 0.8 },
    });
    createScrollTrigger(element, tl);
  });

  const lettersFadeInRandomElements = document.querySelectorAll("[letters-fade-in-random]");
  lettersFadeInRandomElements.forEach((element) => {
    const tl = gsap.timeline({ paused: true });
    const chars = element.querySelectorAll(".char");
    tl.from(chars, {
      opacity: 0,
      duration: 0.05,
      ease: "power1.out",
      stagger: { amount: 0.4, from: "random" },
    });
    createScrollTrigger(element, tl);
  });

  const scrubEachWordElements = document.querySelectorAll("[scrub-each-word]");
  scrubEachWordElements.forEach((element) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: "bottom 70%",
        end: "bottom center",
        scrub: true,
      },
    });
    const words = element.querySelectorAll(".word");
    tl.from(words, {
      opacity: 0.2,
      duration: 0.2,
      ease: "power1.out",
      stagger: { each: 0.4 },
    });
  });

  const textSplitElements = document.querySelectorAll("[text-split]");
  textSplitElements.forEach((element) => {
    gsap.set(element, { opacity: 1 });
  });
}); 