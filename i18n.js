/**
 * Локализация. Чтобы добавить новый язык — добавьте объект в LOCALES.
 */

const LOCALES = {
  ru: {
    langName: 'Русский',
    flagCode: 'ru',
    langLabel: 'Язык:',
    selectLangLabel: 'Выбор языка',
    setupTitle: 'Загрузите изображение',
    historyTitle: 'Выбрать из ранее собранных',
    uploadHint: 'Нажмите для выбора файла или перетащите сюда',
    selectImage: 'Выберите изображение',
    piecesCountLabel: 'Количество деталей:',
    generateBtn: 'Сгенерировать пазл',
    gameTitle: 'Соберите пазл',
    gameAreaLabel: 'Игровая область пазла',
    progress: 'Собрано: {{count}}/{{total}}',
    resetBtn: 'Начать заново',
    selectImageN: 'Выбрать изображение {{n}}',
    savedN: 'Сохранённое {{n}}',
    pieceLabel: 'Элемент пазла {{n}}',
    victory: 'ТЫ МОЛОДЕЦ! 🎉',
    pageTitle: 'Генератор пазлов',
    pageDescription: 'Генератор пазлов — загрузите изображение и соберите пазл',
  },
  en: {
    langName: 'English',
    flagCode: 'gb',
    langLabel: 'Language:',
    selectLangLabel: 'Select language',
    setupTitle: 'Upload image',
    historyTitle: 'Choose from previously assembled',
    uploadHint: 'Click to select file or drag here',
    selectImage: 'Select image',
    piecesCountLabel: 'Number of pieces:',
    generateBtn: 'Generate puzzle',
    gameTitle: 'Assemble the puzzle',
    gameAreaLabel: 'Puzzle game area',
    progress: 'Assembled: {{count}}/{{total}}',
    resetBtn: 'Start over',
    selectImageN: 'Select image {{n}}',
    savedN: 'Saved {{n}}',
    pieceLabel: 'Puzzle piece {{n}}',
    victory: 'WELL DONE! 🎉',
    pageTitle: 'Puzzle Generator',
    pageDescription: 'Puzzle generator — upload an image and assemble the puzzle',
  },
};

const LANG_STORAGE_KEY = 'puzzle-lang';
const DEFAULT_LANG = 'ru';

function getLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return stored && LOCALES[stored] ? stored : DEFAULT_LANG;
}

function setLang(code) {
  if (LOCALES[code]) {
    localStorage.setItem(LANG_STORAGE_KEY, code);
    return true;
  }
  return false;
}

function t(key, params = {}) {
  const lang = getLang();
  let str = LOCALES[lang]?.[key] ?? LOCALES[DEFAULT_LANG]?.[key] ?? key;
  Object.entries(params).forEach(([k, v]) => {
    str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
  });
  return str;
}
