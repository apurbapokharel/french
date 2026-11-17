import { h } from "./dom";
import { lessonById } from "./content";
import { startPage } from "./page";
import { stopSpeaking } from "./speech";
import { lessonListView } from "./views/lessonList";
import { lessonView } from "./views/lesson";
import { progressView } from "./views/progress";
import { flashcardsView } from "./views/flashcards";
import { homeView } from "./views/home";
import { whyView } from "./views/why";
import { roadmapView } from "./views/roadmap";
import { examsView } from "./views/exams";
import { refreshDueBadge } from "./srs";

function notFound(): HTMLElement {
  return h("div", { class: "page" }, h("h2", {}, "Page not found"), h("a", { href: "#/" }, "Go to the home page"));
}

function resolve(hash: string): { title: string; view: HTMLElement } {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/") return { title: "Home", view: homeView() };
  if (path === "/lessons") return { title: "Lessons", view: lessonListView() };
  if (path === "/why") return { title: "Why French helps with PR", view: whyView() };
  if (path === "/roadmap") return { title: "Roadmap", view: roadmapView() };
  if (path === "/exams") return { title: "Exam guide", view: examsView() };
  if (path === "/progress") return { title: "Progress", view: progressView() };
  if (path === "/flashcards") return { title: "Flashcards", view: flashcardsView() };
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
    refreshDueBadge();
    document.title = `${title} · French for Canadian PR`;
    window.scrollTo(0, 0);
  };
  window.addEventListener("hashchange", render);
  render();
}
