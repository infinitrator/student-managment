/** UI-контроллер страницы профиля студента. */

import { StudentService } from "./student-service.js";
import {
  buildStudentUrl,
  formatDate,
  getInitials,
  getRequiredElement,
} from "./utils.js";

/**
 * Загружает данные и отображает профиль.
 *
 * @returns {void}
 */
function initializePage() {
  try {
    StudentService.initialize();
    renderProfile();
  } catch {
    showNotFound();
  }
}

/**
 * Заполняет страницу данными студента из разрешённого query-параметра.
 *
 * @returns {void}
 */
function renderProfile() {
  const id = new URLSearchParams(location.search).get("id");
  const student = StudentService.getById(id);

  if (!student) {
    showNotFound();
    return;
  }

  document.title = `${student.fullName} — профиль`;
  getRequiredElement("avatar").textContent = getInitials(student.fullName);
  getRequiredElement("student-name").textContent = student.fullName;
  getRequiredElement("student-group").textContent = student.group;
  getRequiredElement("student-isu").textContent = String(student.isuId);
  getRequiredElement("student-status").textContent = student.isForeign
    ? "Иностранный студент"
    : "Студент РФ";
  getRequiredElement("student-dorm").textContent =
    `Общежитие № ${student.dormitory}`;
  getRequiredElement("student-room").textContent = student.room;
  getRequiredElement("student-date").textContent = formatDate(
    student.settlementEnd,
  );
  getRequiredElement("student-notes").textContent =
    student.notes || "Нет заметок";
  getRequiredElement("edit-link").setAttribute(
    "href",
    buildStudentUrl("student-form.html", student.id),
  );

  showStatus(student.id);
}

/**
 * Показывает только известный статус сохранения и очищает URL.
 *
 * @param {string} studentId ID открытого студента.
 * @returns {void}
 */
function showStatus(studentId) {
  const status = new URLSearchParams(location.search).get("status");

  if (status !== "created" && status !== "updated") {
    return;
  }

  const notice = getRequiredElement("notice");
  notice.textContent =
    status === "created" ? "Студент успешно добавлен" : "Изменения сохранены";
  notice.hidden = false;
  history.replaceState(
    {},
    "",
    buildStudentUrl("student-profile.html", studentId),
  );
}

/**
 * Скрывает пустую карточку и показывает состояние «не найдено».
 *
 * @returns {void}
 */
function showNotFound() {
  getRequiredElement("profile-card").hidden = true;
  getRequiredElement("not-found").hidden = false;
}

document.addEventListener("DOMContentLoaded", initializePage, { once: true });
