import { h } from "./dom";
import { lessonById } from "./content";
import { startPage } from "./page";
import { stopSpeaking } from "./speech";
import { lessonListView } from "./views/lessonList";
import { lessonView } from "./views/lesson";
import { progressView } from "./views/progress";

function notFound(): HTMLElement {
  return h("div", { class: "page" }, h("h2", {}, "Page not found"), h("a", { href: "#/" }, "Go to the lessons"));
}

function resolve(hash: string): { title: string; view: HTMLElement } {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/" || path === "/lessons") return { title: "Lessons", view: lessonListView() };
  if (path === "/progress") return { title: "Progress", view: progressView() };
  const lessonMatch = path.match(/^\/lessons\/([^/]+)$/);
  const lesson = lessonMatch && lessonById(decodeURIComponent(lessonMatch[1]));
  if (lesson) return { title: `${lesson.id} ${lesson.title}`, view: lessonView(lesson) };
  return { title: "Not found", view: notFound() };
}

/**
 * Render the page for the current URL hash, and again whenever it changes.
 *
 * @param root element that holds the current page
 */
export function startRouter(root: HTMLElement): void {
  const render = () => {
    stopSpeaking();
    startPage();
    const { title, view } = resolve(location.hash);
    root.replaceChildren(view);
    document.title = `${title} · French for Canadian PR`;
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", render);
  render();
}
