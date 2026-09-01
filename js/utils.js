/** Общие безопасные функции интерфейса. */

const STUDENT_PAGES = new Set(["student-form.html", "student-profile.html"]);
const ALLOWED_STATUSES = new Set(["created", "updated"]);

/**
 * Получает обязательный DOM-элемент или сообщает об ошибке разметки.
 *
 * @param {string} id HTML ID.
 * @returns {HTMLElement} Найденный элемент.
 */
export function getRequiredElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`В разметке отсутствует элемент #${id}`);
  }

  return element;
}

/**
 * Ищет обязательный дочерний элемент.
 *
 * @param {ParentNode} parent Родительский узел.
 * @param {string} selector Безопасный статический CSS-селектор.
 * @returns {Element} Найденный элемент.
 */
export function queryRequired(parent, selector) {
  const element = parent.querySelector(selector);

  if (!element) {
    throw new Error(`В шаблоне отсутствует элемент ${selector}`);
  }

  return element;
}

/**
 * Строит ссылку только на разрешённую страницу студента.
 *
 * @param {string} page Имя HTML-файла из белого списка.
 * @param {string} id Внутренний ID студента.
 * @param {string} [status=""] Разрешённый статус операции.
 * @returns {string} Относительный URL с кодированными параметрами.
 */
export function buildStudentUrl(page, id, status = "") {
  if (!STUDENT_PAGES.has(page)) {
    throw new Error("Запрещённый адрес страницы");
  }

  const parameters = new URLSearchParams({ id });

  if (ALLOWED_STATUSES.has(status)) {
    parameters.set("status", status);
  }

  return `${page}?${parameters.toString()}`;
}

/**
 * Возвращает инициалы из первых двух слов ФИО.
 *
 * @param {string} fullName Полное имя.
 * @returns {string} Заглавные инициалы.
 */
export function getInitials(fullName) {
  return fullName
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("ru");
}

/**
 * Форматирует проверенную ISO-дату без сдвига часового пояса.
 *
 * @param {string} isoDate Дата `YYYY-MM-DD`.
 * @returns {string} Дата в русском формате.
 */
export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU");
}

/**
 * Безопасно преобразует неизвестное исключение в сообщение пользователю.
 *
 * @param {unknown} error Перехваченное значение.
 * @returns {string} Понятный текст без сериализации произвольного объекта.
 */
export function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Произошла неизвестная ошибка";
}
