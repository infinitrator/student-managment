import assert from "node:assert/strict";
import test from "node:test";

/**
 * Создаёт минимальную модель document.cookie для интеграционного теста.
 *
 * @returns {object} Mock-документ, карта cookies и журнал присваиваний.
 */
function createCookieDocument() {
  const cookies = new Map();
  const assignments = [];
  const documentMock = {};

  Object.defineProperty(documentMock, "cookie", {
    get() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set(line) {
      assignments.push(line);
      const [pair, ...attributes] = line.split(";").map((part) => part.trim());
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const maxAge = attributes.find((attribute) =>
        attribute.toLowerCase().startsWith("max-age="),
      );

      if (maxAge && Number(maxAge.split("=")[1]) === 0) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    },
  });

  return { documentMock, cookies, assignments };
}

test("валидация, CRUD, кириллица и cookies работают безопасно", async () => {
  const { documentMock, cookies, assignments } = createCookieDocument();
  globalThis.document = documentMock;
  globalThis.location = {
    pathname: "/student-managment/index.html",
    protocol: "https:",
  };

  const { StudentStorage } = await import("../js/storage.js");
  const { StudentValidation } = await import("../js/validation.js");
  const { StudentService } = await import("../js/student-service.js");

  const invalidDate = StudentValidation.validate({
    fullName: "Иванов Иван",
    group: "P3212",
    isuId: "1",
    dormitory: "1",
    room: "1",
    settlementEnd: "2026-02-31",
    isForeign: false,
    notes: "",
  });
  assert.equal(invalidDate.isValid, false);
  assert.ok(invalidDate.errors.settlementEnd);

  const injection = StudentValidation.validate({
    fullName: "<img src=x onerror=alert(1)>",
    group: "P3212",
    isuId: "2",
    dormitory: "1",
    room: "1",
    settlementEnd: "2027-01-01",
    isForeign: false,
    notes: "безопасный текст",
  });
  assert.equal(injection.isValid, false);
  assert.ok(injection.errors.fullName);

  const checked = StudentValidation.validate({
    fullName: "  Ёлкин   Семён Фёдорович  ",
    group: "фиит-21",
    isuId: "777001",
    dormitory: "8",
    room: "12ё",
    settlementEnd: "2028-06-30",
    isForeign: true,
    notes: "Проверка кириллицы: всё работает.",
  });
  assert.equal(checked.isValid, true);

  StudentService.initialize();
  const created = StudentService.create(checked.normalized);
  assert.equal(StudentService.search("ЁЛКИН").length, 1);
  assert.equal(StudentService.getById(created.id).room, "12Ё");

  const externalCopy = StudentService.getById(created.id);
  externalCopy.fullName = "Попытка изменить сервис снаружи";
  assert.equal(
    StudentService.getById(created.id).fullName,
    "Ёлкин Семён Фёдорович",
  );

  StudentService.update(created.id, {
    ...checked.normalized,
    notes: "Обновлено",
  });
  StudentService.initialize();
  assert.equal(StudentService.getById(created.id).notes, "Обновлено");
  StudentService.remove(created.id);
  assert.equal(StudentService.getById(created.id), null);

  StudentStorage.write([
    {
      id: "bad-record",
      fullName: "<script>alert(1)</script>",
      group: "P3212",
      isuId: 5,
      dormitory: 1,
      room: "1",
      settlementEnd: "2027-01-01",
      isForeign: false,
      notes: "",
    },
  ]);
  StudentService.initialize();
  assert.deepEqual(StudentService.getAll(), []);

  cookies.set("student_management_students_meta_v1", "999999");
  const originalWarning = console.warn;
  let warningWasReported = false;
  console.warn = () => {
    warningWasReported = true;
  };
  assert.doesNotThrow(() => StudentService.initialize());
  console.warn = originalWarning;
  assert.equal(warningWasReported, true);
  assert.equal(StudentService.getAll().length, 3);
  assert.ok(assignments.some((line) => line.includes("SameSite=Lax")));
  assert.ok(assignments.some((line) => line.includes("Secure")));
});
