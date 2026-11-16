import { readFileSync, readdirSync } from "node:fs";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";

const contentDir = new URL("../src/content/", import.meta.url);
const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(path, contentDir), "utf8"));

const ajv = new Ajv({ allErrors: true, discriminator: true });
addFormats.default(ajv);
const validateLesson = ajv.compile(readJson("lesson.schema.json") as object);
const validateUnits = ajv.compile(readJson("unit.schema.json") as object);

const targets: [string, typeof validateLesson][] = [
  ["units.json", validateUnits],
  ...readdirSync(new URL("lessons/", contentDir))
    .filter((name) => name.endsWith(".json"))
    .map((name): [string, typeof validateLesson] => [`lessons/${name}`, validateLesson]),
];

type Choice = { type: string; options?: string[]; answer?: unknown };
type LessonShape = { id: string; unit: number; order: number; exercises: Choice[]; canDoCheck: Choice[] };

function crossFieldErrors(lesson: LessonShape): string[] {
  const errors: string[] = [];
  if (lesson.id !== `${lesson.unit}.${lesson.order}`) errors.push(`/id: must be "${lesson.unit}.${lesson.order}"`);
  for (const field of ["exercises", "canDoCheck"] as const) {
    lesson[field].forEach((exercise, i) => {
      if (exercise.options && typeof exercise.answer === "number" && exercise.answer >= exercise.options.length) {
        errors.push(`/${field}/${i}/answer: must be an index into options`);
      }
    });
  }
  return errors;
}

let failed = false;
for (const [path, validate] of targets) {
  const data = readJson(path);
  const errors = validate(data)
    ? validate === validateLesson
      ? crossFieldErrors(data as LessonShape)
      : []
    : (validate.errors ?? []).map((error) => `${error.instancePath}: ${error.message}`);
  for (const error of errors) console.error(`${path}${error}`);
  if (errors.length > 0) failed = true;
}
process.exit(failed ? 1 : 0);
